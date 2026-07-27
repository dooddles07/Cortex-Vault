import uuid

from fastapi import APIRouter, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, DbSession
from app.api.limits import ChatLimit
from app.schemas.chat import ChatRequest, ConversationDetail, ConversationRead, MessageRead
from app.services import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", dependencies=[ChatLimit])
async def chat(payload: ChatRequest, user: CurrentUser) -> StreamingResponse:
    # No DbSession here: the generator outlives this handler and opens its own.
    stream = chat_service.stream_answer(user.id, payload.message, payload.conversation_id)
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(user: CurrentUser, db: DbSession) -> list[ConversationRead]:
    convos = await chat_service.list_conversations(db, user.id)
    return [ConversationRead.model_validate(c) for c in convos]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ConversationDetail:
    convo = await chat_service.get_conversation(db, user.id, conversation_id)
    messages = await chat_service.get_messages(db, convo.id)
    return ConversationDetail(
        id=convo.id,
        title=convo.title,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
        messages=[MessageRead.model_validate(m) for m in messages],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> None:
    await chat_service.delete_conversation(db, user.id, conversation_id)
