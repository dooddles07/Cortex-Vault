# Changelog

Notable changes to CortexVault, newest first. Grouped by day rather than semantic version — there is no version scheme yet (`package.json` stays at `0.1.0`); this is a pre-release solo project deployed straight to production. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-07-27 (later still, part 2)

### Added
- **Error tracking** — Sentry (`sentry-sdk[fastapi]`), gated on `SENTRY_DSN`. Unset, behavior is unchanged (Render-log-only). `_init_sentry()` extracted as its own function in `main.py`, same reason `_purge_trash_on_startup` is — so the guard is unit-testable without reimporting the whole app.

This closes the last zero-cost item from the original audit. Remaining (re-ranking) needs a provider decision, not just an account.

## 2026-07-27 (later still)

### Added
- **MFA** — TOTP (`pyotp`) + 10 single-use backup codes, hashed at rest. `POST /auth/mfa/enable` → `/verify` → sign-in now returns `{mfa_required: true, mfa_token}` for an MFA account instead of a session, and `POST /auth/mfa/challenge` (TOTP or backup code) completes it. The MFA challenge token is a deliberately different JWT shape (no `jti`, a `purpose` claim, 5-minute expiry) so it can never be mistaken for a real session token by `get_current_user`, and vice versa.
- **`email_verified` enforcement** — `POST /chat`, `/uploads`, `/bookmarks` now return `403` for an unverified account (`require_verified_email`). `POST /documents` deliberately stays open — scoped exactly to what was approved, not every route that happens to trigger embedding.
- Frontend: sign-in page handles the MFA challenge step; Settings gets a two-factor authentication panel (enroll, confirm, disable) and the "Session" card's copy is corrected (it previously — and wrongly, after today's earlier session-revocation work — said tokens were stateless with no revocation).

### Fixed
- Dead code: `create_mfa_challenge_token`'s sibling `new_jti()` in `core/security.py` was defined but never called (the actual code always used `uuid.uuid4()` directly) — removed while in the area.
- Test fixtures: the shared `auth` fixture now pre-verifies its user's email via a direct DB write, since every existing chat/upload/bookmark test would otherwise start failing `403` the moment enforcement shipped. A new `unverified_auth` fixture covers the gated (pre-verification) state explicitly.

## 2026-07-27

### Added (RAG quality + ops, later same day)
- **Token-based chunking** (`tiktoken`, `cl100k_base`) replaces character counting — `CHUNK_SIZE`/`CHUNK_OVERLAP` are now tokens (defaults changed to 200/30, roughly equivalent to the old 800/120 characters for English prose). Docker image pre-warms the tokenizer's vocab file at build time so chunking has no runtime network dependency.
- **Embedding cache** — `content_hash` (previously write-only) now short-circuits re-ingestion when content is byte-identical to what's already indexed, skipping a wasted re-embed against the free daily quota
- **Query rewriting** — before retrieval, the chat LLM resolves pronouns/references in follow-up questions against conversation history; skipped (no extra call) on a conversation's first message; falls back to the raw question if the rewrite call fails
- **Conversation summarization** — `conversations.summary` (previously write-only) now gets folded in once a conversation outgrows the 6-message raw history window, replacing a hard cutoff that silently dropped older context
- Connection pool size made explicit and configurable (`DB_POOL_SIZE`/`DB_POOL_MAX_OVERFLOW`, defaults unchanged from SQLAlchemy's own 5/10)

### Fixed (docs)
- RAG.md, DATABASE.md: several stale claims caught in this pass — `content_hash`/`conversations.summary` no longer described as unused, `file_path` no longer described as unwritten (R2 wiring shipped earlier the same day), search-filter support noted, connection-pool section updated

### Deferred
- **Re-ranking model** — needs a provider decision (hosted rerank API vs. a local cross-encoder too heavy for the free-tier shared vCPU), same class of decision as R2/email, not a unilateral pick
- **Error tracking** (Sentry) — needs an account, same pattern

### Changed
- Render's `cortexvault-api` Auto-Deploy set to "After CI Checks Pass" (dashboard setting, not code) — a red `Server (lint + tests)` run now blocks the API deploy instead of shipping regardless

### Added
- Collections — `collections`/`collection_items` tables (migration `0002`), CRUD plus document membership, scoped to owner on both sides
- Favorites — `POST`/`DELETE /documents/:id/star`
- Search filters — `type`, `folder_id`, `tag_id`, `date_from`, `date_to` on `GET /search`, layered under existing owner+trash scoping
- Trash retention purge (30-day window) — runs opportunistically on API startup, since the free tier has no cron trigger
- **Token revocation** — JWTs now carry a `jti` tied to a `sessions` row; `POST /auth/sign-out` revokes it, a password reset revokes every session for that user. Rotating `JWT_SECRET` is now the *global* fallback rather than the only option.
- **Account lockout** — 5 failed sign-ins locks the account for 15 minutes (`users.failed_login_attempts`/`locked_until`)
- **Email verification + password reset** (Resend) — `POST /auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`; single-use tokens hashed at rest (`verification_tokens`), forgot-password always returns the same response whether or not the email is registered. `email_verified` is set by this flow but not yet enforced anywhere (deliberate, see ROADMAP engineering debt). Without `RESEND_API_KEY`, sandbox mode applies (Resend free tier: delivers only to the account owner's own address without a verified domain).
- **Audit logging** (`audit_logs`) — sign-up, sign-in (success/failure/lockout-blocked), password reset. Append-only; no read endpoint yet (no admin role exists to gate one behind).
- **Security headers** on every response — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS, and CSP (`default-src 'none'`, looser scoped policy only on `/docs`/`/openapi.json` for Swagger UI's own assets)
- Session-row purge (`purge_old_sessions`, 30-day grace past expiry) added to the same opportunistic startup pass as trash purge
- Frontend: `/forgot-password`, `/reset-password`, `/verify-email` pages; sign-out now calls the API to actually revoke the session instead of only clearing local storage

### Deferred
- **MFA** (TOTP + backup codes) — out of scope for this pass; a substantial feature on its own (secret generation, backup codes, a login-challenge flow), flagged rather than rushed alongside everything above

### Fixed
- `delete_document` now also deletes the R2 original — a hard-deleted document was leaving its file in the bucket forever, silently counting against the free storage tier
- **CI was silently broken since the inline-ingestion refactor.** The `inline_worker` test fixture patched `enqueue_ingest`, an attribute that no longer exists — `documents.py`/`uploads.py`/`bookmarks.py` call `dispatch_ingest` now. This went undetected because CI's GitHub Actions budget was $0 at the time, so no job had ever actually run; once real runs started, every integration test using that fixture failed at setup. Fixed the fixture to patch the current name.
- **Every integration test failed with `Future attached to a different loop`** once CI started running them, in two compounding ways. `TestClient` was constructed without entering it as a context manager, which makes it start a fresh event loop *per request* — so the connection pool served a connection created on one loop to a request on another. Fixed by entering the context manager (one loop per session; the app's lifespan now runs too). Separately, async tests that call service functions directly run on pytest-asyncio's loop rather than the portal's, so the test engine now uses `NullPool` — a connection is never reused across loops at all. That swap happens before `app.main` is imported, because `chat_service`, `workers.tasks.ingest` and `db.session` all bind `SessionLocal` at import time.
- `test_provider_failure_emits_an_error_event` asserted only `pytest.raises(RuntimeError)`, which silently swallowed the unrelated event-loop `RuntimeError` above and surfaced it as a confusing empty-frames assertion. Now matches on the message.
- API.md's Uploads section still described OCR and office formats as unsupported after they shipped the day before — missed in that pass, caught in this one

### Docs
- ROADMAP.md's CI entry corrected — it runs now, it just isn't wired to gate Render/Vercel deploys yet
- API.md, DATABASE.md updated for collections/favorites/search-filters endpoints and schema

## 2026-07-26

### Added
- Office format extraction: `.docx`, `.pptx`, `.xlsx` are chunked and searchable instead of stored as `unsupported` (`python-docx`, `python-pptx`, `openpyxl`)
- Bookmark saver — `POST /bookmarks` fetches a URL and extracts readable text (`trafilatura`); guarded against SSRF (rejects private/loopback/link-local/cloud-metadata addresses, re-validates every redirect hop, `http`/`https` only)
- OCR for scanned PDFs and images — self-hosted Tesseract, no third-party API, no data leaves the server; falls back to `needs_ocr` if the runtime has no tesseract binary rather than crashing
- Object storage for original uploads — Cloudflare R2, fully optional; unset `R2_*` and the app behaves exactly as before (text extracted, file discarded)
- Groq chat provider, paired with Gemini embeddings — both free, Groq inference is substantially faster than Gemini Flash; now the deployed default
- Redis-backed rate limiting on auth, chat, uploads, and search (fixed-window, fails open if Redis is down)
- `INGEST_MODE=inline` — ingestion runs as a FastAPI background task with no Redis and no worker, since no free host offers an always-on background worker
- CI workflow: lint + full test suite against a real `pgvector` Postgres service, plus the web typecheck/build (written, but gated on a $0 GitHub Actions budget — see [ROADMAP.md](ROADMAP.md))

### Changed
- Deployment moved from Railway (five services, $5/mo Hobby plan) to Vercel + Render + Neon — three free tiers, no credit card, at the cost of Render's cold starts and no dedicated worker process

### Fixed
- Web rollouts gated on a healthcheck instead of deploying blind
- Several stale doc claims that had drifted from the shipped code: README/ROADMAP claiming the frontend wasn't wired to the API (it was, since `0ec9e77`), AI.md's active-configuration table naming Gemini as the chat model when Groq is what's actually deployed, UI-UX.md listing components as uncoded that already shipped, and SECURITY.md/ARCHITECTURE.md claiming there was no upload size limit when `_read_capped` already enforced one

### Docs
- ARCHITECTURE.md Known Gaps, SECURITY.md, DEPLOYMENT.md, and TESTING.md updated to match the above — new SSRF section in SECURITY.md, R2 env vars in DEPLOYMENT.md, tesseract/poppler local-dev note in TESTING.md, honest coverage gaps named for OCR and the SSRF guard

## 2026-07-25

### Added
- FastAPI backend: RAG pipeline (chunking, embeddings, hybrid retrieval), JWT auth, Postgres + pgvector, arq workers
- PDF text extraction with scan detection (`pypdf`) — a text layer under 32 characters is treated as a scan and parked at `needs_ocr`
- Gemini provider (chat + embeddings), with chat and embedding providers configurable independently
- Web app: design system, P0 screens (dashboard, vault, chat, search, settings, sign-in/up), Playwright-verified across desktop/tablet/mobile viewports, WCAG 2.2 AA gate
- Frontend wired to the API: auth, streaming chat (SSE), search, uploads, vault, dashboard
- Integration test suite (ingest, search, chat) and smoke/security test layers; local dev via Docker Compose (Postgres + pgvector, Redis)
- Brand asset set (logo, icon, favicon, lettermark, wordmark, banner) and Figma design system (26 screens, token system)

### Fixed
- `passlib` replaced with `bcrypt` directly — `passlib`'s bcrypt backend-detection probe fed a >72-byte string that `bcrypt>=4.1` rejects with `ValueError` instead of silently truncating, breaking every password hash
- OpenAI client construction made lazy — a module-level client with no API key raised at import and crashed the entire app even when OpenAI was unused
- Gemini embedding model and output dimensionality corrected and pinned to 768 (pgvector's HNSW index caps at 2000 dimensions; Gemini's native output is 3072)
- SSE session lifetime, ingest failure state, conversation ordering, Redis pool, search mode, and upload limits — a batch of fixes surfaced by the integration suite
- Node engine bumped to `>=22.13` for pnpm 11 compatibility

### Docs
- Initial project overview, features catalog, and architecture blueprint written, then rewritten to describe the system as actually built (the original blueprint specified an all-TypeScript backend; that was replaced by standalone Python/FastAPI before implementation — see [TECH-STACK.md](TECH-STACK.md))
