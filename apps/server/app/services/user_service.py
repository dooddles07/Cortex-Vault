from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Collection,
    CollectionItem,
    Conversation,
    Document,
    DocumentTag,
    Folder,
    Message,
    MessageCitation,
    Tag,
    User,
)
from app.schemas.user import UserUpdate


async def update_me(db: AsyncSession, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def export_data(db: AsyncSession, user: User) -> dict[str, object]:
    """Every row this user owns, for GDPR Article 20 portability requests.

    Excludes auth/security bookkeeping — password hash, MFA secret, sessions,
    verification tokens, audit logs — since that's this system's own
    access-control state, not data the user put in. Chunk embeddings are
    excluded too: chunk text duplicates document content, and the vectors
    themselves aren't human-readable or portable to anything else."""
    documents = (
        await db.scalars(select(Document).where(Document.user_id == user.id))
    ).all()
    folders = (await db.scalars(select(Folder).where(Folder.user_id == user.id))).all()
    tags = (await db.scalars(select(Tag).where(Tag.user_id == user.id))).all()
    collections = (
        await db.scalars(select(Collection).where(Collection.user_id == user.id))
    ).all()
    conversations = (
        await db.scalars(select(Conversation).where(Conversation.user_id == user.id))
    ).all()

    document_ids = [d.id for d in documents]
    tags_by_document: defaultdict[object, list[str]] = defaultdict(list)
    if document_ids:
        links = await db.scalars(
            select(DocumentTag).where(DocumentTag.document_id.in_(document_ids))
        )
        for link in links:
            tags_by_document[link.document_id].append(str(link.tag_id))

    collection_ids = [c.id for c in collections]
    documents_by_collection: defaultdict[object, list[str]] = defaultdict(list)
    if collection_ids:
        items = await db.scalars(
            select(CollectionItem).where(CollectionItem.collection_id.in_(collection_ids))
        )
        for item in items:
            documents_by_collection[item.collection_id].append(str(item.document_id))

    conversation_ids = [c.id for c in conversations]
    messages_by_conversation: defaultdict[object, list[Message]] = defaultdict(list)
    citations_by_message: defaultdict[object, list[str]] = defaultdict(list)
    if conversation_ids:
        messages = (
            await db.scalars(
                select(Message).where(Message.conversation_id.in_(conversation_ids))
            )
        ).all()
        for message in messages:
            messages_by_conversation[message.conversation_id].append(message)

        message_ids = [m.id for m in messages]
        if message_ids:
            citations = await db.scalars(
                select(MessageCitation).where(MessageCitation.message_id.in_(message_ids))
            )
            for citation in citations:
                citations_by_message[citation.message_id].append(str(citation.chunk_id))

    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "email_verified": user.email_verified,
            "theme_preference": user.theme_preference,
            "mfa_enabled": user.mfa_enabled,
            "created_at": user.created_at.isoformat(),
        },
        "folders": [
            {
                "id": str(f.id),
                "parent_id": str(f.parent_id) if f.parent_id else None,
                "name": f.name,
            }
            for f in folders
        ],
        "tags": [{"id": str(t.id), "name": t.name} for t in tags],
        "documents": [
            {
                "id": str(d.id),
                "type": d.type,
                "title": d.title,
                "content": d.content,
                "summary": d.summary,
                "source_url": d.source_url,
                "folder_id": str(d.folder_id) if d.folder_id else None,
                "starred": d.starred,
                "ingest_status": d.ingest_status,
                "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
                "created_at": d.created_at.isoformat(),
                "tag_ids": tags_by_document.get(d.id, []),
            }
            for d in documents
        ],
        "collections": [
            {
                "id": str(c.id),
                "name": c.name,
                "document_ids": documents_by_collection.get(c.id, []),
            }
            for c in collections
        ],
        "conversations": [
            {
                "id": str(c.id),
                "title": c.title,
                "summary": c.summary,
                "created_at": c.created_at.isoformat(),
                "messages": [
                    {
                        "id": str(m.id),
                        "role": m.role,
                        "content": m.content,
                        "created_at": m.created_at.isoformat(),
                        "cited_chunk_ids": citations_by_message.get(m.id, []),
                    }
                    for m in messages_by_conversation.get(c.id, [])
                ],
            }
            for c in conversations
        ],
    }
