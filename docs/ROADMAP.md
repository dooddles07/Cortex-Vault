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
| Infra | 5 Railway services, migrations on boot, private-network DB access |

## P0 — remaining MVP gaps

These are specified as P0 in [FEATURES.md](FEATURES.md) but not built.

| Gap | Why it matters | Notes |
|---|---|---|
| ~~PDF text extraction~~ | **Done.** `pypdf` extraction at upload; PDFs with a text layer are chunked and searchable | Scans park at `needs_ocr` |
| **OCR** | Scanned PDFs and images yield nothing; detected and flagged, but never indexed | Tesseract or a cloud OCR call; slow, belongs in the worker |
| **Office formats** | `.docx`, `.pptx`, `.xlsx` store as `unsupported` | `python-docx` / `python-pptx` extractors |
| **Object storage** | `documents.file_path` exists but nothing writes files anywhere | Originals are discarded after text extraction |
| ~~Rate limiting~~ | **Done.** Redis fixed-window limits on auth, chat, uploads and search | Fails open if Redis is down — see [SECURITY.md](SECURITY.md) |
| **Upload size limit** | `file.read()` loads the whole body into memory | Trivial DoS |
| **Email verification & password reset** | `email_verified` exists; nothing sets it. Lockout is permanent | Needs an email provider |
| **Bookmark saver** | P0 capture path; no endpoint | Fetch + readability extraction |
| **Collections** | P0 organization primitive; no table or endpoints | |
| **Favorites / pinning** | `documents.starred` column exists; no endpoint toggles it | |
| **Trash retention** | 30-day window specified but nothing purges | Scheduled job |
| **Search filters** | Cannot scope by type, tag, folder, or date | Retrieval currently filters only by owner |
| **Web app wiring** | Frontend screens exist; not connected to the API | `NEXT_PUBLIC_API_URL` is set |

## P1

Version history · document summaries · auto tag/folder suggestions · conversation memory beyond the 6-turn window · YouTube transcript import · code snippet capture · meeting notes · browser extension clipper · sharing (link and user) · workspaces and roles · notifications · admin dashboard · audit logs · saved searches.

## P2

Voice notes with transcription · email ingestion · SSO/SAML · MFA · knowledge graph over extracted entities · multi-agent research assistant · third-party connector marketplace.

## Engineering debt

Ordered by risk, not effort.

1. **CI runs but does not gate deploys.** GitHub Actions runs lint, the full test suite against a real pgvector Postgres, and the web build — but Railway deploys on push regardless of the result. Enable "Wait for CI" on each service to close the gap. See [TESTING.md](TESTING.md).
2. **No error tracking.** Failures are only visible in ephemeral Railway logs.
3. **No staging environment.**
4. **Token revocation.** Stateless JWTs valid 7 days; rotating `JWT_SECRET` is the only global sign-out.
5. **Embedding dimension is load-bearing.** 768 is forced by pgvector's 2000-dim HNSW cap. Changing provider means a migration, index rebuild, and full re-embed — see [RAG.md](RAG.md).
6. **No re-ranking model.** `RERANK_TOP_N` truncates; it does not re-score. The name overstates it.
7. **No embedding cache.** `content_hash` is stored and unused.
8. **No connection-pool tuning.** Will bite before CPU does when API replicas scale.
9. **Free-tier AI has privacy implications.** Google may train on free-tier data — blocking for real user documents. See [AI.md](AI.md).

## Suggested order

1. PDF extraction + object storage — without these the product does not do what the README claims
2. Integration test + CI — stop shipping runtime bugs
3. Rate limiting + upload caps — cheapest real-abuse mitigations
4. Wire the web app to the API — first end-to-end user-visible product
5. Email verification + password reset — prerequisite for anyone but you
6. Search filters and collections — the organization layer users will expect
