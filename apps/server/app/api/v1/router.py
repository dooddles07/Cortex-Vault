from fastapi import APIRouter

from app.api.v1 import auth, chat, dashboard, documents, folders, me, search, tags, uploads

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(dashboard.router)
api_router.include_router(documents.router)
api_router.include_router(uploads.router)
api_router.include_router(folders.router)
api_router.include_router(tags.router)
api_router.include_router(search.router)
api_router.include_router(chat.router)
