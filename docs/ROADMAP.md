# Roadmap

Status as of 2026-07-25. Priorities follow [FEATURES.md](FEATURES.md): **P0** = MVP, **P1** = v1, **P2** = v2+.

## Shipped

Backend deployed and verified end-to-end in production.

| Area | Detail |
|---|---|
| Auth | Sign-up, sign-in, JWT bearer, bcrypt hashing |
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

## P0 — remaining MVP gaps

These are specified as P0 in [FEATURES.md](FEATURES.md) but not built.

| Gap | Why it matters | Notes |
|---|---|---|
| **Email verification & password reset** | `email_verified` exists; nothing sets it. Lockout is permanent | Needs an email provider |

## P1

Version history · document summaries · auto tag/folder suggestions · conversation memory beyond the 6-turn window · YouTube transcript import · code snippet capture · meeting notes · browser extension clipper · sharing (link and user) · workspaces and roles · notifications · admin dashboard · audit logs · saved searches.

## P2

Voice notes with transcription · email ingestion · SSO/SAML · MFA · knowledge graph over extracted entities · multi-agent research assistant · third-party connector marketplace.

## Engineering debt

Ordered by risk, not effort.

1. **CI is written but has never run**, and does not gate deploys. The workflow runs lint, the full suite against a real pgvector Postgres, and the web build — but the account's GitHub Actions budget is $0 with stop-usage enabled, so no job starts. Render and Vercel deploy on push regardless. See [TESTING.md](TESTING.md).
2. **No error tracking.** Failures are only visible in Render's log stream.
3. **Cold starts.** Render free sleeps after 15 minutes; the next request takes ~50s. The only real fix is a paid instance.
3. **No staging environment.**
4. **Token revocation.** Stateless JWTs valid 7 days; rotating `JWT_SECRET` is the only global sign-out.
5. **Embedding dimension is load-bearing.** 768 is forced by pgvector's 2000-dim HNSW cap. Changing provider means a migration, index rebuild, and full re-embed — see [RAG.md](RAG.md).
6. **No re-ranking model.** `RERANK_TOP_N` truncates; it does not re-score. The name overstates it.
7. **No embedding cache.** `content_hash` is stored and unused.
8. **No connection-pool tuning.** Will bite before CPU does when API replicas scale.
9. **Free-tier AI has privacy implications.** Google may train on free-tier data — blocking for real user documents. See [AI.md](AI.md).
10. **OCR runs inline, on Render's shared free vCPU.** No worker is deployed, so a scanned PDF's OCR pass competes with request handling in the same process and blocks that one upload request for its duration. Cloudflare R2 (object storage) and Groq (chat) are the only external services in the stack that could still function if this ran in a real worker — restoring `INGEST_MODE=queue` would move OCR off the request path.
11. **Trash retention purge is opportunistic, not scheduled.** No free host offers a cron trigger the API can use, so `purge_expired_trash` runs once on API startup (`app/main.py`) — which, on Render free, is every time the instance wakes from an idle sleep. A vault that stays busy enough to never cold-start could accumulate expired trash indefinitely between deploys. A real fix would be a Cloudflare Worker Cron Trigger (free tier includes them) calling an internal purge endpoint — not built, since it adds a second free service to operate for a low-stakes feature.

## Suggested order

1. Email verification + password reset — prerequisite for anyone but you
2. CI actually gating deploys — stop shipping runtime bugs (blocked on GitHub Actions budget, see engineering debt)
