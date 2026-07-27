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

OCR needs two system binaries the Dockerfile installs but a bare `pip install` does not: `tesseract-ocr` and `poppler-utils` (the latter backs `pdf2image`'s PDF-to-image rasterization). Without them, `extract_text` doesn't fail — it logs a warning and falls back to `needs_ocr`, so a local run without these installed will silently look like OCR isn't implemented rather than erroring.

## Running tests

```bash
pytest                          # all; integration auto-skips without Postgres
pytest -m "not slow"            # unit + smoke only
pytest tests/test_security.py   # one file
pytest -k chunk                 # by name
```

Integration tests **skip automatically** when Postgres is unreachable, so `pytest` is safe without Docker running — check the skip count to know whether they actually ran.

`tests/conftest.py` sets required environment defaults **before** importing app modules, because `Settings` is instantiated at import time and raises on missing fields.

## Test layers

| Layer | Location | Needs services | Purpose |
|---|---|---|---|
| Unit | `test_chunking.py`, `test_security.py`, `test_uploads.py`, `test_chat_stream.py` | No | Pure logic — chunking, hashing, tokens, SSE framing, upload caps |
| Smoke | `test_smoke.py` | No | App imports, `/health`, auth rejection, OpenAPI builds |
| Integration | `test_integration_*.py` | Postgres | Ingestion, retrieval, chat streaming, ownership isolation |
| E2E | `tests/` at repo root (Playwright) | Full stack | Browser flows |

The smoke layer is the highest value per line: `test_app_imports_without_optional_provider_keys` would have caught both production incidents above.

## Integration test design

- **`TestClient` is entered as a context manager, and that is load-bearing.** Outside a `with` block it starts a **new blocking portal — and therefore a new event loop — on every single request**. The async engine's pool then hands a connection created on request 1's loop to request 2 on a different loop, and `pool_pre_ping` fails with `Future attached to a different loop`. Every integration test failed this way the first time CI actually ran. Entering the context manager pins one loop for the session (and runs the app's lifespan, which is closer to production anyway).
- **The test engine uses `NullPool`, swapped in before `app.main` is imported.** Requests run on the TestClient's portal loop; async tests and fixtures run on pytest-asyncio's loop. Any *pooled* connection reused across that boundary hits the same cross-loop error, and then poisons the pool for whichever unrelated test draws it next. NullPool opens a connection per checkout and closes it on release, so a connection can never outlive its loop. The swap has to happen before the app is imported because `chat_service`, `workers.tasks.ingest` and `db.session` each bind `SessionLocal` at module import time — patching afterwards only reaches one of them.
- **A separate database.** Everything runs against `cortexvault_test` (override with `TEST_DB_NAME`), created automatically on first run. Your dev vault is never truncated.
- **Real migrations.** The suite runs `alembic upgrade head`, so the schema under test is the one that ships — including `CREATE EXTENSION vector` and the HNSW index.
- **No AI calls.** `fake_providers` is autouse and patches both factories. Embeddings are derived deterministically from a SHA-256 of the text, so identical input always retrieves identically, offline and free. A test that hits Gemini is a bug.
- **No worker required.** The `inline_worker` fixture patches `dispatch_ingest` to run the arq task synchronously, so the full ingest path is exercised without Redis or a running worker.
- **No Sentry, Resend, or R2 calls, even with real credentials sitting in a local `.env`.** Unlike the AI providers, these three are called directly with no swappable factory — `conftest.py` forces `SENTRY_DSN`, `RESEND_API_KEY`, and all four `R2_*` vars blank before any app module imports, overriding whatever `.env` contains (`os.environ.setdefault` wins because pydantic-settings gives real OS env vars precedence over `.env` file values). This is not hypothetical: a real `SENTRY_DSN` in a local `.env` once caused a `pytest` run to send real test exceptions to production Sentry — 4 real events, confirmed via the `200` responses in the log — before this guard existed.
- **Clean slate per test.** All tables are truncated between tests.

Each integration module is anchored to a regression that reached production — the docstrings name which one.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`, in two parallel jobs:

| Job | Steps |
|---|---|
| **Server** | `ruff check` → `pytest` against a real `pgvector/pgvector:pg17` service container |
| **Web** | `pnpm typecheck` → `pnpm build` |

The Postgres service is the point: **CI is where the integration suite actually runs.** Locally it skips unless Docker is up, so a green local run proves less than it looks like. Check the skip count.

No provider keys are set in CI. The autouse `fake_providers` fixture means that is correct — a test that reaches for a real API fails loudly instead of quietly spending quota.

Ruff's rule set is pinned explicitly in `pyproject.toml` (`E`, `F`, `I`, `B`, `SIM`, `UP`, ignoring `B008` because `Depends()`/`File()` in argument defaults is the FastAPI idiom). Without pinning, a ruff upgrade can change the default rule set and turn CI red on untouched code.

## Gaps

- **Redis itself is never exercised** — `inline_worker` bypasses the queue, so enqueue/consume behavior is untested.
- **The bookmark saver's SSRF guard is tested against IP literals only** — no test makes a real network request, so DNS-based edge cases (rebinding, a hostname resolving to multiple addresses where only some are private) aren't exercised.
- **OCR has no round-trip test** — `test_invalid_image_falls_back_to_needs_ocr` only proves the fallback path; nothing in the suite runs a real Tesseract pass, since CI installs the binary but no test currently feeds it a real scanned image.
- **No coverage measurement.**
- **Playwright suite targets the web app only** and does not cover the API.
- **Render is gated on CI; Vercel is not.** `cortexvault-api`'s Auto-Deploy is set to "After CI Checks Pass" (Settings → Deploy), so a red `Server (lint + tests)` run blocks the API deploy. Vercel has no equivalent native toggle — its own build step still blocks its own deploy on a failed `pnpm build`, which covers the case that matters most for a frontend.

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

Highest-value next step is wiring the suite into CI so `main` cannot deploy on a red build.
