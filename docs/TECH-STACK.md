# Tech Stack

Every choice below is in the deployed build. Rationale is recorded so future changes are deliberate rather than accidental.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + React 19 | App Router, streaming, SSR shell |
| Styling | Tailwind CSS 4 | Token-driven design system already established in [DESIGN.md](DESIGN.md) |
| Backend | FastAPI (Python 3.12) | Async-native, native SSE, Pydantic validation, strongest ecosystem for AI work |
| ORM | SQLAlchemy 2.0 (async) | Typed `Mapped[]` models; `pgvector` ships a first-party SQLAlchemy type |
| Driver | asyncpg (runtime), psycopg2 (Alembic) | asyncpg is the fastest async driver; Alembic runs sync |
| Migrations | Alembic | Standard for SQLAlchemy; runs from the app image on boot |
| Database | Postgres 17 + pgvector | Relational data, vectors, and full-text search in one engine |
| Queue | Redis + arq | arq is asyncio-native, unlike Celery which is thread/process-oriented |
| Auth | bcrypt + python-jose | Direct bcrypt; HS256 JWTs |
| HTTP client | httpx | Async, already required by FastAPI's test client |
| AI | Google Gemini | Only provider with a genuinely free tier for both chat and embeddings |
| Deploy | Railway | Single platform for web, API, worker, Postgres, and Redis |

## Why Python instead of the original TypeScript plan

The blueprint originally specified Hono handlers inside Next.js route handlers plus Node workers. That was replaced before implementation:

- **Serverless timeouts.** Ingestion and long SSE streams fit poorly in short-lived function invocations. A long-running container sidesteps the problem.
- **One language for AI work.** Chunking, embedding, and retrieval logic all live in Python's strongest ecosystem.
- **Native SSE.** FastAPI's `StreamingResponse` over an async generator maps directly onto the chat contract.

Cost: two languages in one repo, and no type sharing between frontend and backend. The API's OpenAPI schema at `/openapi.json` is the mitigation — a typed client can be generated from it.

## Why arq instead of Celery

Celery predates asyncio and treats async as an adapter. arq is built on it, so the worker reuses the same async SQLAlchemy sessions and httpx clients as the API with no separate sync code path. Cost: a much smaller ecosystem and no mature scheduling/monitoring UI.

## Why bcrypt directly instead of passlib

`passlib` is the conventional choice and was used initially. Its last release was 2020, and its bcrypt backend-detection probe feeds a >72-byte test string to bcrypt — which `bcrypt>=4.1` rejects with `ValueError` instead of silently truncating. Every password hash raised on first call. Calling `bcrypt` directly removes the dead dependency; the 72-byte truncation is handled explicitly in `app/core/security.py`.

## Why pgvector instead of a dedicated vector DB

One database instead of two: no sync problem between rows and vectors, no extra service, no extra cost. Retrieval is confined to `app/rag/retrieval.py`, so swapping to Qdrant or Pinecone later means rewriting one module.

**Hard constraint:** pgvector's HNSW index supports at most 2000 dimensions. Gemini's embedding model defaults to 3072, which cannot be HNSW-indexed. Embeddings are pinned to 768 via `outputDimensionality`. Any provider change must respect this ceiling.

## Why Gemini

Verified against the live API rather than assumed:

| Model | Free tier |
|---|---|
| `gemini-3.5-flash` (chat) | Available |
| `gemini-embedding-001` (embeddings) | Available |
| `gemini-2.0-flash` | **0 quota** — no free allowance |
| `gemini-2.5-flash` / `-lite` | Closed to new users |

Google's AI Studio rate-limit console lists quota rows for the 2.5 models even though they reject new users, so it cannot be trusted as the source of truth. Check by calling the API.

OpenAI and Ollama adapters exist and are wired into the registry; neither is active. `CHAT_PROVIDER` and `EMBEDDING_PROVIDER` are independent, so Gemini embeddings can pair with a paid chat provider without code changes.

## Versions

Backend pins are in `apps/server/pyproject.toml`, frontend in `package.json` / `apps/web/package.json`. Node is pinned to `>=22.13` (pnpm 11 requirement); Python to `>=3.12` (for `type` generics and `datetime.UTC`).
