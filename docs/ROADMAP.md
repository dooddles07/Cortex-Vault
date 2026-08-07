# Roadmap

Status as of 2026-07-28. Priorities follow [FEATURES.md](FEATURES.md): **P0** = MVP, **P1** = v1, **P2** = v2+.

## Shipped

Backend deployed and verified end-to-end in production.

| Area | Detail |
|---|---|
| Auth | Sign-up, sign-in, JWT bearer, bcrypt hashing, resend-verification (`POST /auth/resend-verification`) |
| Documents | CRUD, soft delete, restore, folder assignment |
| Organization | Folders (nested), tags (idempotent create, attach/detach) |
| Ingestion | Async via Redis + arq; paragraph-aware chunking; batched embeddings; idempotent re-ingest |
| Search | Hybrid vector + full-text with reciprocal rank fusion |
| Chat | SSE streaming, citations event before tokens, persisted citations |
| Dashboard | Counts + recent documents |
| Web app | Next.js wired to the API — auth, streaming chat, search, uploads, vault, dashboard, settings |
| Infra | Vercel + Render + Neon, all free tiers; migrations on boot; inline ingestion (no Redis, no worker) |
| Ingestion formats | PDF (`pypdf`), `.docx`/`.pptx`/`.xlsx`, OCR for scans and images (Tesseract, self-hosted), bookmark saver (fetch + `trafilatura` readability extraction) |
| Object storage | Cloudflare R2, optional — set `R2_*` or originals are discarded after text extraction, same as before |
| Upload size limit | Streamed read rejects at `MAX_UPLOAD_BYTES` before buffering the full body |
| Organization | Collections (`POST/GET/DELETE /collections`, document membership), favorites (`POST/DELETE /documents/:id/star`), search filters (type/folder/tag/date), trash retention purge (opportunistic on API startup — see engineering debt) |
| Security | Session-based token revocation (sign-out, password reset revokes all sessions), account lockout after 5 failed sign-ins, email verification + password reset + resend (Resend) — tracked but not enforced on chat/uploads/bookmarks, see item 12, audit logging (`audit_logs`, no read endpoint yet), security headers (HSTS/CSP/nosniff/frame-deny), MFA (TOTP + 10 backup codes, `pyotp`) |
| RAG quality | Token-based chunking (`tiktoken`, replaces character counting), embedding cache (skips re-embedding unchanged content via `content_hash`), query rewriting (resolves pronouns against history before retrieval), conversation summarization (`conversations.summary`, replaces the hard 6-message cutoff), LLM-based re-ranking (chat only — reuses `CHAT_PROVIDER`, no new dependency) |
| Ops | Connection pool size/overflow now explicit and configurable (`DB_POOL_SIZE`/`DB_POOL_MAX_OVERFLOW`), error tracking via Sentry (optional, `SENTRY_DSN`), bcrypt hashing/verification off the event loop (`run_in_threadpool`), `/conversations` capped at 50 |
| SEO / social | OpenGraph and Twitter card meta, `robots.txt`, `sitemap.xml`, cold-start toast on the frontend when a request runs past 4s |

## P0 — remaining MVP gaps

Nothing left unbuilt from the original P0 list in [FEATURES.md](FEATURES.md).

## P1

Version history · document summaries · auto tag/folder suggestions · YouTube transcript import · code snippet capture · meeting notes · browser extension clipper · sharing (link and user) · workspaces and roles · notifications · admin dashboard (including a read endpoint for `audit_logs`) · saved searches.

## P2

Voice notes with transcription · email ingestion · SSO/SAML · WebAuthn/passkeys (as an MFA alternative) · knowledge graph over extracted entities · multi-agent research assistant · third-party connector marketplace.

## Engineering debt

Ordered by risk, not effort.

1. ~~CI is written but has never run~~ **Done.** The $0-budget/stop-usage block that previously stopped every job from starting is no longer in effect — the workflow now actually executes lint, the full suite against a real pgvector Postgres, and the web build on every push, and Render is gated on it passing (Auto-Deploy: "After CI Checks Pass"). See [TESTING.md](TESTING.md).
2. ~~No error tracking~~ **Done, optional.** Sentry (`sentry-sdk[fastapi]`), gated on `SENTRY_DSN` — unset, failures are still only visible in Render's log stream, same as before.
3. **Cold starts.** Render free sleeps after 15 minutes; the next request takes ~50s. The only real fix is a paid instance.
3. **No staging environment.**
4. ~~Token revocation~~ **Done.** Sessions table keyed by JWT `jti`; sign-out and password reset both revoke. See [SECURITY.md](SECURITY.md).
5. **Embedding dimension is load-bearing.** 768 is forced by pgvector's 2000-dim HNSW cap. Changing provider means a migration, index rebuild, and full re-embed — see [RAG.md](RAG.md).
6. ~~No re-ranking model~~ **Done, LLM-based.** `app/rag/rerank.py` asks `CHAT_PROVIDER` to re-score the fused candidates before truncating to `RERANK_TOP_N`, instead of just truncating the RRF order — zero new cost or dependency. A dedicated cross-encoder (hosted rerank API or local model) would likely do better; not built, since that still needs an external-service decision or a dependency too heavy for the free-tier shared vCPU. See [RAG.md](RAG.md).
7. ~~No embedding cache~~ **Done.** `content_hash` now short-circuits a re-ingest when content is unchanged. See [RAG.md](RAG.md).
8. ~~No connection-pool tuning~~ **Done, partially.** Pool size/overflow are now explicit config (`DB_POOL_SIZE`/`DB_POOL_MAX_OVERFLOW`, default 5/10 — unchanged from SQLAlchemy's own defaults, just no longer invisible). Still revisit before API replicas scale — the ceiling itself hasn't moved.
9. **Free-tier AI has privacy implications.** Google may train on free-tier data — blocking for real user documents. See [AI.md](AI.md).
10. **OCR runs inline, on Render's shared free vCPU.** No worker is deployed, so a scanned PDF's OCR pass competes with request handling in the same process and blocks that one upload request for its duration. Cloudflare R2 (object storage) and Groq (chat) are the only external services in the stack that could still function if this ran in a real worker — restoring `INGEST_MODE=queue` would move OCR off the request path.
11. ~~Trash and session-row purges are opportunistic, not scheduled~~ **Done, optional.** `POST /api/v1/internal/purge` (token-gated via `INTERNAL_PURGE_TOKEN`) plus a Cloudflare Worker Cron Trigger (`infra/purge-cron`, free tier) now runs both purges daily. Deploying the worker is optional — unset the token and the route 404s, leaving the startup-only purge exactly as before. See [DEPLOYMENT.md](DEPLOYMENT.md).
12. **`email_verified` isn't enforced anywhere.** Was briefly gated (`require_verified_email` on `POST /chat`, `/uploads`, `/bookmarks`), then deliberately removed — see item 13: without a verified sending domain, Resend's sandbox mode means real users other than the account owner never receive the verification email at all, so the gate just locked everyone out with no way through. Revisit once a domain is verified.
13. **Without `RESEND_API_KEY` set, Resend's free tier only delivers to the account owner's own verified address** (sandbox mode) — fine for solo use, blocking before other real users can actually receive verification/reset emails. See [SECURITY.md](SECURITY.md).
14. **MFA has no WebAuthn/passkey alternative**, and no UI to regenerate backup codes without a full disable/re-enroll. Low priority — TOTP + backup codes covers the realistic threat model for a solo/small deployment.
15. **A dedicated re-ranker (cross-encoder) would likely beat the LLM-based one**, but needs a provider decision (hosted API vs. local model) first. See [RAG.md](RAG.md).
16. **Tests didn't isolate Sentry/Resend/R2 from a real local `.env` until this was caught in practice** — a real `SENTRY_DSN` sent real test exceptions to production Sentry (4 confirmed events) before `conftest.py` forced these blank for test runs. Fixed, but worth naming as the kind of gap that's easy to reintroduce if a new external-service integration follows the same call-it-directly pattern instead of the swappable-factory pattern the AI providers use. See [TESTING.md](TESTING.md).

## Suggested order

Nothing outstanding needs a decision right now. The only unbuilt items (dedicated re-ranker, WebAuthn/passkeys) each need either a provider choice or a second paid-adjacent service, and none are urgent for a solo deployment.
