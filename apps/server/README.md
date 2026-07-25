# CortexVault API

FastAPI backend: API gateway, RAG pipeline, ingestion workers. Replaces the
Next.js API routes + Node workers described in docs/ARCHITECTURE.md — that
doc still shows the original TS-only design and needs a follow-up edit.

## Setup

    cp .env.example .env
    pip install -e ".[dev]"
    alembic upgrade head
    uvicorn app.main:app --reload

Requires Postgres with the `pgvector` extension and Redis (for the arq queue).

## Worker

    arq app.workers.worker_settings.WorkerSettings

## Structure

    app/
      core/       settings, security, logging
      db/         SQLAlchemy engine/session, base, mixins
      models/     SQLAlchemy ORM models
      schemas/    Pydantic request/response models
      api/v1/     route handlers (thin, delegate to services/)
      services/   business logic
      rag/        chunking, embeddings, retrieval, prompts, provider adapters
      workers/    arq task definitions + worker entrypoint

## Not yet scaffolded

Collections, Sharing/Workspace, Admin endpoints (P1/P2 in docs/FEATURES.md) —
follow the Document/Folder pattern when needed.
