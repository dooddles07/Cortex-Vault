# API Reference

Base URL: `https://api-production-84b56.up.railway.app`
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

## System

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | `{"status":"ok","env":"production"}`. No auth. |
| `GET` | `/docs` | Swagger UI |

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/sign-up` | `email`, `password` (8–128), `name?` | `201` + `access_token` |
| `POST` | `/auth/sign-in` | `email`, `password` | `200` + `access_token` |

Tokens are HS256 JWTs with `sub` (user id) and `exp`, valid 7 days by default. Duplicate email returns `409`; bad credentials return `401`. There is no sign-out — tokens are stateless and cannot be revoked.

```bash
curl -X POST $BASE/api/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

## Me

| Method | Path | Notes |
|---|---|---|
| `GET` | `/me` | Current user |
| `PATCH` | `/me` | `name`, `theme_preference` (`system\|light\|dark`) |

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
| `DELETE` | `/documents/{id}` | Hard delete; cascades to chunks |

`type` is one of `note`, `pdf`, `bookmark`, `clip`, `youtube`, `snippet`, `meeting`, `voice`, `email`.

List responses are `{items, total, limit, offset}`.

## Uploads

| Method | Path | Notes |
|---|---|---|
| `POST` | `/uploads` | multipart `file`. Returns `202` + `document_id`, `job_id` |
| `GET` | `/uploads/{document_id}/status` | `ingest_status`, `job_status`, `error` |

**Limitation:** only `text/plain`, `text/markdown`, and `text/csv` are decoded. Other types are stored with null content and are never chunked or searchable by content.

`ingest_status` values: `pending` → `processing` → `indexed`, or `skipped_empty` / `failed`.

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
| `GET` | `/search` | `q` (required), `mode` (`hybrid\|semantic\|keyword`), `limit` (≤50) |

Returns `{query, mode, hits[]}` where each hit has `chunk_id`, `document_id`, `document_title`, `content`, `score`. Score is a reciprocal-rank-fusion value, not a similarity — it is only meaningful for ordering within one response.

Trashed documents are excluded.

## Chat

| Method | Path | Notes |
|---|---|---|
| `POST` | `/chat` | `message`, `conversation_id?`. Returns `text/event-stream` |
| `GET` | `/conversations` | List, newest first |
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

## Not implemented

Present in [FEATURES.md](FEATURES.md) but absent from the API: collections, favorites/pinning, version history, document summaries, saved searches, sharing, workspaces, notifications, admin, and audit logs.
