import json
import logging
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.db.session import SessionLocal
from app.models import Conversation, Message, MessageCitation
from app.rag.prompts import build_messages, build_rewrite_messages, build_summarize_messages
from app.rag.providers import get_chat_provider
from app.rag.rerank import rerank
from app.rag.retrieval import hybrid_search

logger = logging.getLogger(__name__)

# Raw turns always sent verbatim. Once a conversation has more messages than
# this, the overflow is folded into conversations.summary instead of simply
# falling off the end — see _update_summary.
_HISTORY_TURNS = 6


async def _consume(messages: list[dict[str, str]]) -> str:
    """Runs the chat provider to completion for an internal call (query
    rewrite, summarization) that has no reason to stream to a client."""
    text = ""
    async for token in get_chat_provider().stream(messages):
        text += token
    return text.strip()


async def list_conversations(db: AsyncSession, user_id: uuid.UUID) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list((await db.scalars(stmt)).all())


async def get_conversation(
    db: AsyncSession, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> Conversation:
    convo = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == user_id
        )
    )
    if not convo:
        raise NotFoundError("Conversation")
    return convo


async def get_messages(db: AsyncSession, conversation_id: uuid.UUID) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return list((await db.scalars(stmt)).all())


async def delete_conversation(
    db: AsyncSession, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> None:
    convo = await get_conversation(db, user_id, conversation_id)
    await db.delete(convo)
    await db.commit()


async def stream_answer(
    user_id: uuid.UUID, question: str, conversation_id: uuid.UUID | None
) -> AsyncIterator[str]:
    """Yields SSE events: citations, then token deltas, then done (or error).

    Owns its own session: the request-scoped dependency is torn down when the
    handler returns, which is before this generator finishes producing the body.
    """
    async with SessionLocal() as db:
        try:
            convo = (
                await get_conversation(db, user_id, conversation_id)
                if conversation_id
                else await _create_conversation(db, user_id, question)
            )

            user_message = Message(conversation_id=convo.id, role="user", content=question)
            db.add(user_message)
            await db.commit()

            history = await _recent_history(db, convo.id, exclude_id=user_message.id)
            search_query = await _rewrite_query(question, history)

            candidates = await hybrid_search(db, user_id, search_query)
            hits = await rerank(search_query, candidates, settings.RERANK_TOP_N)
            yield _sse(
                "citations",
                [
                    {
                        "index": i + 1,
                        "chunk_id": str(h.chunk_id),
                        "document_id": str(h.document_id),
                        "document_title": h.document_title,
                    }
                    for i, h in enumerate(hits)
                ],
            )

            messages = build_messages(question, [h.content for h in hits], history, convo.summary)

            answer = ""
            async for token in get_chat_provider().stream(messages):
                answer += token
                yield _sse("token", {"delta": token})

            assistant = Message(conversation_id=convo.id, role="assistant", content=answer)
            db.add(assistant)
            await db.flush()
            db.add_all(
                MessageCitation(message_id=assistant.id, chunk_id=h.chunk_id, rank=i)
                for i, h in enumerate(hits)
            )
            _touch(convo)
            await db.commit()

            await _update_summary(db, convo, exclude_id=user_message.id)

            yield _sse(
                "done", {"conversation_id": str(convo.id), "message_id": str(assistant.id)}
            )
        except Exception:
            # The stream already returned 200, so failures can only be reported
            # in-band. Do not re-raise: the response is already sent and this
            # generator is what StreamingResponse iterates directly, so a raise
            # here would additionally surface as an unhandled ASGI exception —
            # double-reporting the same failure to Sentry (once via this log
            # call, once via the ASGI integration) against its free 5k/month cap.
            logger.exception("chat stream failed for user %s", user_id)
            await db.rollback()
            yield _sse("error", {"message": "The assistant failed to complete this answer."})


async def _create_conversation(
    db: AsyncSession, user_id: uuid.UUID, question: str
) -> Conversation:
    convo = Conversation(user_id=user_id, title=question[:120])
    db.add(convo)
    await db.commit()
    await db.refresh(convo)
    return convo


def _touch(convo: Conversation) -> None:
    """Adding a message does not dirty the conversation row, so onupdate never
    fires and list ordering would fall back to creation time."""
    convo.updated_at = datetime.now(UTC)


async def _recent_history(
    db: AsyncSession, conversation_id: uuid.UUID, exclude_id: uuid.UUID
) -> list[dict[str, str]]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.id != exclude_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(_HISTORY_TURNS)
    )
    messages = list((await db.scalars(stmt)).all())[::-1]
    return [{"role": m.role, "content": m.content} for m in messages]


async def _rewrite_query(question: str, history: list[dict[str, str]]) -> str:
    """Resolves pronouns/references against history before embedding, so a
    follow-up like "what about the second one?" retrieves on its own merits
    rather than on "second one". A first message has no history to resolve
    against, so it's returned unchanged without spending an extra LLM call.
    A rewrite failure must not break the chat — retrieval just falls back to
    the raw question, exactly today's behavior."""
    if not history:
        return question
    try:
        rewritten = await _consume(build_rewrite_messages(question, history))
    except Exception:
        logger.warning("query rewrite failed; using the raw question", exc_info=True)
        return question
    return rewritten or question


async def _update_summary(db: AsyncSession, convo: Conversation, exclude_id: uuid.UUID) -> None:
    """Folds messages older than the _HISTORY_TURNS window into
    conversations.summary, so context beyond the raw window is compacted
    rather than simply dropped. Runs after the visible answer has already
    streamed, so a slow or failing summarization never delays or breaks the
    user-facing response."""
    total = await db.scalar(
        select(func.count()).select_from(Message).where(Message.conversation_id == convo.id)
    )
    if total <= _HISTORY_TURNS:
        return

    older_stmt = (
        select(Message)
        .where(Message.conversation_id == convo.id, Message.id != exclude_id)
        .order_by(Message.created_at, Message.id)
        .limit(total - _HISTORY_TURNS)
    )
    older = list((await db.scalars(older_stmt)).all())
    if not older:
        return

    older_dicts = [{"role": m.role, "content": m.content} for m in older]
    try:
        summary = await _consume(build_summarize_messages(older_dicts, convo.summary))
    except Exception:
        logger.warning("conversation summarization failed for %s", convo.id, exc_info=True)
        return
    if summary:
        convo.summary = summary
        await db.commit()


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
