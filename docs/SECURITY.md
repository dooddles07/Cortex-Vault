# Security

What the current build actually enforces, and what it does not. Written to be honest about gaps rather than aspirational — treat the "Gaps" section as a pre-production checklist.

## Authentication

Passwords are hashed with `bcrypt` (`gensalt()` default cost, per-password salt). Input is truncated to 72 bytes before hashing — bcrypt's hard limit, which `bcrypt>=4.1` raises on rather than silently truncating. Truncation is explicit in `app/core/security.py`.

Tokens are HS256 JWTs carrying `sub` (user id) and `exp`, signed with `JWT_SECRET`, valid 7 days. Verification failures of any kind — bad signature, expiry, malformed — return `None` and surface as `401`.

Sign-in returns an identical `401` for unknown email and wrong password, so the endpoint does not confirm which addresses are registered.

## Authorization

Every protected route depends on `get_current_user`, which resolves the JWT to a `User` row. Ownership is enforced **inside the query**, not after it:

```python
select(Document).where(Document.id == document_id, Document.user_id == user_id)
```

A miss raises `NotFoundError` → `404`. Returning `404` rather than `403` for another user's resource avoids confirming that the ID exists.

Retrieval carries the same constraint — both arms of hybrid search filter `chunks.user_id`, so one user's content cannot surface in another's search results or RAG context.

## Secrets

Nothing is committed. `.env` is gitignored; `.env.example` holds only placeholders. In production, values live in Railway; `JWT_SECRET` reaches the worker via the cross-service reference `${{api.JWT_SECRET}}`, so it never leaves the platform. Database credentials are Railway references resolved at deploy time, and traffic to Postgres and Redis stays on the private network.

Set secrets via stdin (`--set-from-stdin`) so they do not enter shell history.

## Input handling

Pydantic validates every request body and query parameter; unknown fields are rejected and type errors return `422` before any handler runs. Passwords are constrained to 8–128 characters, emails validated by `email-validator`, and enum-like fields (`theme_preference`, document `type`, search `mode`) constrained by pattern.

SQLAlchemy parameterizes all queries — including the full-text arm, where the query string is bound via `plainto_tsquery` rather than interpolated.

CORS is an explicit allowlist from `CORS_ORIGINS`, restricted to the methods and headers the app actually uses, with `allow_credentials=True`. Do not widen it to `*`.

## Rate limiting

Redis-backed fixed-window counters, applied per route. Auth keys on IP (there is no user yet); everything else keys on user id, so one user cannot exhaust another's budget by sharing an egress IP.

| Route | Limit / minute | Keyed on | Why |
|---|---|---|---|
| `/auth/sign-in`, `/auth/sign-up` | `RATE_LIMIT_AUTH` (10) | IP | Brute force and account-enumeration |
| `/chat` | `RATE_LIMIT_CHAT` (20) | User | Embeds, retrieves, and calls an LLM — the costliest path |
| `/uploads` | `RATE_LIMIT_UPLOAD` (20) | User | Parsing plus embedding cost |
| `/search` | `RATE_LIMIT_SEARCH` (60) | User | Embeds the query |

Exceeding a limit returns `429` with `Retry-After`.

Two deliberate tradeoffs:

- **Fixed window, not sliding.** One `INCR` plus one `EXPIRE` per request instead of a per-request sorted set. The cost is burstiness at a window boundary — up to 2× the limit across two adjacent windows. Acceptable for abuse control, not for hard quota enforcement.
- **Fails open.** If Redis is unreachable the request is allowed and a warning is logged. Losing the API is worse than losing the limiter, but it does mean **a Redis outage removes rate limiting entirely**.

The IP is read from `X-Forwarded-For` because Railway terminates TLS upstream. That header is client-controlled and only trustworthy because the platform overwrites it — if the API is ever exposed without that proxy in front, per-IP limits become spoofable.

## Gaps

**Fix before real users:**

| Gap | Risk |
|---|---|
| **No token revocation** | A leaked token is valid for its full 7 days. No sign-out, no refresh, no session table |
| **No email verification** | `email_verified` exists on the model but nothing sets it — anyone can register any address |
| **No password reset** | Account lockout is permanent |
| **No upload size limit** | `await file.read()` loads the whole body into memory — a large upload is a trivial DoS |
| **No audit logging** | [FEATURES.md](FEATURES.md) specifies `audit_logs`; nothing writes it |

**Also missing:** MFA, account lockout after failed attempts, security headers (HSTS, CSP, `X-Content-Type-Options`), request-size limits, and dependency scanning in CI.

## Data handling

`documents.content` stores whatever the user ingests, in plaintext at rest (Railway volume encryption only). Chunks duplicate that content alongside their vectors.

**Chunk text is sent to the AI provider on every ingestion and every question.** On Gemini's free tier, Google may use that data for training. This is acceptable for development and unacceptable for other people's documents — move to a paid tier or a self-hosted model before onboarding real users. See [AI.md](AI.md).

Prompt injection is unmitigated: ingested documents become model context, so a document containing instructions can influence answers. The system prompt constrains the model to answer only from context, which limits but does not eliminate this.

Deletion is soft by default (`deleted_at`), and nothing purges trashed rows — the 30-day window in [FEATURES.md](FEATURES.md) is not enforced. There is no data export, so GDPR access and erasure requests cannot currently be served.

## Reporting

No formal process yet. For a personal deployment, keep `GEMINI_API_KEY` and `JWT_SECRET` rotatable — rotating `JWT_SECRET` invalidates every outstanding token, which is currently the only way to force global sign-out.
