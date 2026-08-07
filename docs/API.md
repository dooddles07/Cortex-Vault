# API Reference

Base URL: `https://cortexvault-api.onrender.com`

> Hosted on Render's free tier, which sleeps after 15 minutes of inactivity. The first request after a gap can take ~50 seconds — set generous client timeouts.
All routes are prefixed `/api/v1` except `/health` and `/docs`.

Interactive schema: `/docs` (Swagger UI) · machine-readable: `/openapi.json`

## Conventions

| Aspect | Behavior |
|---|---|
| Auth | `Authorization: Bearer <jwt>` on everything except `/health` and `/auth/*` |
| Content type | `application/json` except `POST /uploads` (multipart) |
| IDs | UUID v4 strings |
| Timestamps | ISO 8601, UTC |
| Missing / not-yours | `404` — cross-user access is not distinguished from nonexistent |
| Validation errors | `422` with Pydantic's error array |
| Rate limited | `429` with `Retry-After` (seconds until the window resets) |

## Rate limits

Per minute, fixed window. Auth is keyed on IP; the rest on user id.

| Route | Limit |
|---|---|
| `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password` | 10 |
| `/auth/resend-verification` (keyed on user, not IP) | 10 |
| `/chat` | 20 |
| `/uploads` | 20 |
| `/search` | 60 |

All are configurable via `RATE_LIMIT_*` environment variables. See [SECURITY.md](SECURITY.md) for the fixed-window and fail-open tradeoffs.

## System

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | `{"status":"ok","env":"production"}`. No auth. |
| `GET` | `/docs` | Swagger UI |

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/sign-up` | `email`, `password` (8–128), `name?` | `201` + `access_token`. Also sends a verification email (Resend) |
| `POST` | `/auth/sign-in` | `email`, `password` | `200`. `{access_token, mfa_required: false}` normally, or `{access_token: null, mfa_required: true, mfa_token}` if the account has MFA enabled — see below. `401` after `ACCOUNT_LOCKOUT_THRESHOLD` (5) failed attempts, for `ACCOUNT_LOCKOUT_MINUTES` (15) |
| `POST` | `/auth/mfa/challenge` | `mfa_token`, `code` (TOTP or a backup code) | `200` + `access_token` — this is what actually completes sign-in for an MFA account |
| `POST` | `/auth/sign-out` | — (bearer token identifies the session) | `204`; revokes the current session only |
| `POST` | `/auth/verify-email` | `token` | `204` |
| `POST` | `/auth/resend-verification` | — (bearer) | `200` + message. No-op with a distinct message if already verified |
| `POST` | `/auth/forgot-password` | `email` | `200` + generic message, always, regardless of whether the email is registered |
| `POST` | `/auth/reset-password` | `token`, `new_password` (8–128) | `204`; revokes every session for that user |
| `POST` | `/auth/mfa/enable` | — (bearer) | `200` + `secret`, `otpauth_uri`, `backup_codes` (shown once). Does not yet turn MFA on |
| `POST` | `/auth/mfa/verify` | `code` | `204`; confirms enrollment and sets `mfa_enabled = true`. `400` on an incorrect code |
| `POST` | `/auth/mfa/disable` | — (bearer) | `204`; clears the secret and all backup codes |

Tokens are HS256 JWTs with `sub` (user id), `jti` (session id), and `exp`, valid 7 days by default. Duplicate email returns `409`; bad credentials return `401`. `jti` ties each token to a `sessions` row, so `/auth/sign-out` and password reset can revoke tokens without waiting for expiry — see [SECURITY.md](SECURITY.md).

`mfa_token` (from `/auth/sign-in`) is a different, short-lived (5 min) JWT shape with no `jti` — it cannot be used as a bearer token anywhere else, and expires whether or not it's used.

```bash
curl -X POST $BASE/api/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

## Me

| Method | Path | Notes |
|---|---|---|
| `GET` | `/me` | Current user, including `email_verified` and `mfa_enabled` |
| `PATCH` | `/me` | `name`, `theme_preference` (`system\|light\|dark`) |
| `GET` | `/me/export` | Every row the user owns — documents, folders, tags, collections, conversations+messages+citations — as JSON. GDPR Article 20 portability. Excludes auth/security bookkeeping (password hash, MFA secret, sessions, verification tokens, audit logs) |

## Dashboard

| Method | Path | Returns |
|---|---|---|
| `GET` | `/dashboard/summary` | `documents`, `chunks`, `conversations` counts + 5 most recent documents |

## Documents

| Method | Path | Notes |
|---|---|---|
| `GET` | `/documents` | Paginated. Query: `limit` (≤100), `offset`, `folder_id`, `type`, `trashed` |
| `POST` | `/documents` | Creates and, if `content` is present, enqueues ingestion |
| `GET` | `/documents/{id}` | Single document |
| `PATCH` | `/documents/{id}` | Changing `content` triggers re-ingestion |
| `POST` | `/documents/{id}/trash` | Soft delete (sets `deleted_at`) |
| `POST` | `/documents/{id}/restore` | Clears `deleted_at` |
| `POST` | `/documents/{id}/star` | Sets `starred = true` |
| `DELETE` | `/documents/{id}/star` | Sets `starred = false` |
| `DELETE` | `/documents/{id}` | Hard delete; cascades to chunks; deletes the R2 original if one was stored |

`type` is one of `note`, `pdf`, `bookmark`, `clip`, `youtube`, `snippet`, `meeting`, `voice`, `email`.

List responses are `{items, total, limit, offset}`.

## Uploads

| Method | Path | Notes |
|---|---|---|
| `POST` | `/uploads` | multipart `file`. Returns `202` + `document_id`, `job_id` (null when nothing is indexable) |
| `GET` | `/uploads/{document_id}/status` | `ingest_status`, `job_status`, `error` |

Text is extracted at upload time. Supported: **PDF** (via `pypdf`, OCR fallback for scans), **`.docx`/`.pptx`/`.xlsx`** (`python-docx`/`python-pptx`/`openpyxl`), **images** (`.png`/`.jpg`/`.jpeg`/`.webp`/`.tiff`/`.bmp`, via OCR), plain text, Markdown, CSV, JSON, XML, HTML. Detection uses the MIME type, falling back to the file extension.

OCR runs self-hosted Tesseract, inline in the request (no worker deployed — see [ARCHITECTURE.md](ARCHITECTURE.md) for the latency tradeoff this buys). If the runtime has no tesseract binary, OCR falls back to `needs_ocr` rather than failing.

If `R2_*` is configured (see [DEPLOYMENT.md](DEPLOYMENT.md)), the original file is also stored in Cloudflare R2; otherwise it's discarded after extraction.

Anything else (archives, unrecognized binaries) is stored but never indexed. Uploads over `MAX_UPLOAD_BYTES` (25MB default) return `413`, rejected mid-read rather than after buffering.

`ingest_status` values:

| Status | Meaning |
|---|---|
| `pending` → `processing` → `indexed` | Normal path |
| `needs_ocr` | A PDF's text layer is under 32 characters (almost certainly a scan) or an image, and OCR either found nothing or the tesseract binary isn't available in this runtime |
| `unsupported` | File type has no text extractor (archives, anything unrecognized) |
| `skipped_empty` | Decoded to nothing |
| `failed` | Extraction or embedding raised; see `error` |

## Bookmarks

| Method | Path | Notes |
|---|---|---|
| `POST` | `/bookmarks` | `url`, `folder_id?`. Fetches the page, extracts readable text (`trafilatura`), returns `202` + `document_id`, `job_id` |

Guarded against SSRF: only `http`/`https`, rejects private/loopback/link-local/cloud-metadata addresses, re-validates every redirect hop. See [SECURITY.md](SECURITY.md).

## Folders

`GET` / `POST` `/folders`, `PATCH` / `DELETE` `/folders/{id}`. Self-referencing `parent_id` forms the tree. Deleting a folder cascades to child folders and nulls `documents.folder_id`.

## Tags

| Method | Path | Notes |
|---|---|---|
| `GET` `POST` | `/tags` | Create is idempotent — an existing name returns the existing tag |
| `POST` | `/documents/{doc_id}/tags/{tag_id}` | Attach, `204` |
| `DELETE` | `/documents/{doc_id}/tags/{tag_id}` | Detach, `204` |

## Search

| Method | Path | Query |
|---|---|---|
| `GET` | `/search` | `q` (required), `mode` (`hybrid\|semantic\|keyword`), `limit` (≤50), `type?`, `folder_id?`, `tag_id?`, `date_from?`, `date_to?` (dates `YYYY-MM-DD`) |

Filters narrow the candidate set before ranking — they can only shrink results, never widen past what owner+trash scoping already allows. `date_to` is inclusive of the whole day.

Returns `{query, mode, hits[]}` where each hit has `chunk_id`, `document_id`, `document_title`, `content`, `score`. Score is a reciprocal-rank-fusion value, not a similarity — it is only meaningful for ordering within one response.

Trashed documents are excluded.

## Collections

| Method | Path | Notes |
|---|---|---|
| `GET` `POST` | `/collections` | Flat, cross-folder groupings |
| `DELETE` | `/collections/{id}` | Also removes membership rows (cascade); documents themselves are untouched |
| `GET` | `/collections/{id}/documents` | Documents in the collection, newest first, trashed excluded |
| `POST` `DELETE` | `/collections/{id}/documents/{document_id}` | Add/remove — add is idempotent |

## Chat

| Method | Path | Notes |
|---|---|---|
| `POST` | `/chat` | `message`, `conversation_id?`. Returns `text/event-stream` |
| `GET` | `/conversations` | List, newest first, capped at 50 |
| `GET` | `/conversations/{id}` | Conversation + full message history |
| `DELETE` | `/conversations/{id}` | `204`; cascades to messages and citations |

### SSE event sequence

```
event: citations
data: [{"index":1,"chunk_id":"...","document_id":"...","document_title":"..."}]

event: token
data: {"delta":"Retrieval is hybrid"}

event: done
data: {"conversation_id":"...","message_id":"..."}
```

`citations` always arrives before the first `token`, so sources can render while the answer streams. The `index` maps to the `[n]` markers in the answer text.

Omitting `conversation_id` starts a new conversation titled from the first 120 characters of the question.

```bash
curl -N -X POST $BASE/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"How does retrieval work?"}'
```

## Internal

| Method | Path | Notes |
|---|---|---|
| `POST` | `/internal/purge` | Runs `purge_expired_trash` + `purge_old_sessions` on demand. Not part of the public API — gated on a shared-secret `X-Internal-Token` header (`INTERNAL_PURGE_TOKEN`), 404s when that's unset. Called by the optional Cloudflare Worker cron trigger in `infra/purge-cron`; see [DEPLOYMENT.md](DEPLOYMENT.md) |

## Not implemented

Present in [FEATURES.md](FEATURES.md) but absent from the API: version history, document summaries, saved searches, sharing, workspaces, notifications, admin, and audit logs.
