# Changelog

Notable changes to CortexVault, newest first. Grouped by day rather than semantic version — there is no version scheme yet (`package.json` stays at `0.1.0`); this is a pre-release solo project deployed straight to production. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
