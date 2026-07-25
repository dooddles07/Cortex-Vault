# Testing & Local Development

## Local setup

Postgres needs the `vector` extension, so use the `pgvector` image rather than stock Postgres. `docker-compose.yml` in `apps/server/` provides both dependencies:

```bash
cd apps/server
docker compose up -d              # Postgres 17 + pgvector, Redis 8
cp .env.example .env              # then set GEMINI_API_KEY
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Worker, in a second terminal:

```bash
arq app.workers.worker_settings.WorkerSettings
```

Frontend:

```bash
pnpm install && pnpm dev
```

**Install the dependencies locally even if you only intend to deploy.** Two production incidents in this project — an eagerly constructed OpenAI client and a `passlib`/`bcrypt` incompatibility — were plain import-time errors that any local run would have caught. Compiling is not importing; `python -m compileall` passes on both.

## Running tests

```bash
pytest                      # all
pytest tests/test_rag.py    # one file
pytest -k chunk             # by name
```

`tests/conftest.py` sets required environment defaults **before** importing app modules, because `Settings` is instantiated at import time and raises on missing fields.

## Test layers

| Layer | Location | Needs services | Purpose |
|---|---|---|---|
| Unit | `test_chunking.py`, `test_security.py` | No | Pure logic — chunking, hashing, tokens |
| Smoke | `test_smoke.py` | No | App imports, `/health`, auth rejection, OpenAPI builds |
| Integration | *(not written)* | Postgres + Redis | Ingestion, retrieval, full request paths |
| E2E | `tests/` at repo root (Playwright) | Full stack | Browser flows |

The smoke layer is deliberately the highest-value-per-line: `test_app_imports_without_optional_provider_keys` would have caught both production incidents above.

## Manual verification of a deployment

```bash
BASE=https://<api-domain>

curl -s $BASE/health
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e@example.com","password":"TestPassw0rd!123"}' \
  | python -c "import json,sys;print(json.load(sys.stdin)['access_token'])")
A="Authorization: Bearer $TOKEN"

DOC=$(curl -s -X POST $BASE/api/v1/documents -H "$A" -H "Content-Type: application/json" \
  -d '{"title":"T","type":"note","content":"Redis backs the arq queue."}' \
  | python -c "import json,sys;print(json.load(sys.stdin)['id'])")

sleep 4
curl -s -H "$A" $BASE/api/v1/uploads/$DOC/status      # expect indexed / completed
curl -s -H "$A" "$BASE/api/v1/search?q=queue"
curl -sN -X POST $BASE/api/v1/chat -H "$A" -H "Content-Type: application/json" \
  -d '{"message":"What backs the queue?"}'
```

An `indexed` / `completed` status is the single most informative check — it proves the Redis queue, the arq worker, the embedding provider, and the pgvector column and HNSW index all work together.

Use a plainly fake domain for test accounts, and note that `email-validator` rejects reserved TLDs such as `.invalid` and `.test`.

## Gaps

- **No integration tests.** Nothing exercises ingestion, retrieval, or the SSE contract against a real database.
- **No CI.** Tests are not run automatically; `main` deploys without gating.
- **No fixtures or factories** for seeding users and documents.
- **No coverage measurement.**
- **Playwright suite targets the web app only** and does not cover the API.

Highest-value next step is an integration test that ingests a document against the compose stack and asserts a search hit — it covers the most surface per line and would catch schema, embedding, and index regressions together.
