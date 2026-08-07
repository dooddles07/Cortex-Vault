# Security

What the current build actually enforces, and what it does not. Written to be honest about gaps rather than aspirational — treat the "Gaps" section as a pre-production checklist.

## Authentication

Passwords are hashed with `bcrypt` (`gensalt()` default cost, per-password salt). Input is truncated to 72 bytes before hashing — bcrypt's hard limit, which `bcrypt>=4.1` raises on rather than silently truncating. Truncation is explicit in `app/core/security.py`. `hash_password`/`verify_password` are synchronous and CPU-bound (deliberately slow), so every call site (`sign_up`, `sign_in`, `reset_password` in `app/services/auth_service.py`) runs them via `run_in_threadpool` rather than directly on the request coroutine — otherwise a single hash blocks the whole async worker for its duration.

Tokens are HS256 JWTs carrying `sub` (user id), `jti` (session id), and `exp`, signed with `JWT_SECRET`, valid 7 days. Verification failures of any kind — bad signature, expiry, malformed — return `None` and surface as `401`.

**The `jti` makes tokens revocable without rotating `JWT_SECRET`.** Each sign-in writes a `sessions` row keyed by `jti`; every authenticated request checks that row hasn't been revoked before trusting the token, in addition to the signature check. `POST /auth/sign-out` revokes the current session. A password reset revokes every session for that user. Rotating `JWT_SECRET` is still the only way to force a *global* sign-out across all users at once.

**The access token is stored in `localStorage`, not an httpOnly cookie** (`apps/web/lib/api.ts`). That is a deliberate tradeoff, not an oversight: the frontend (Vercel) and backend (Render) are different origins, so a cookie-based session would need `SameSite=None; Secure` plus credentialed CORS on every request, which is more moving parts for a free-tier, single-user deployment. The cost is that any XSS anywhere in the app — or a compromised dependency — can read the token directly; there is currently no injectable HTML surface in the frontend (no `dangerouslySetInnerHTML` on user content), which is the mitigation this choice relies on. Revisit before onboarding untrusted users or adding any feature that renders user-controlled HTML.

Sign-in returns an identical `401` for unknown email and wrong password, so the endpoint does not confirm which addresses are registered — except when the account is locked (see Account lockout below), which does confirm the address is registered. That tradeoff is deliberate: an attacker who has already triggered a lockout already knows the address is valid from the failed attempts themselves.

### Account lockout

`users.failed_login_attempts` increments on every wrong password; reaching `ACCOUNT_LOCKOUT_THRESHOLD` (5) sets `locked_until` to `ACCOUNT_LOCKOUT_MINUTES` (15) from now, and sign-in is rejected until it passes, even with the correct password. A successful sign-in resets the counter. Both are `int`/`datetime` columns, not Redis-backed — this is unrelated to the rate limiter below and survives a Redis outage.

### Email verification and password reset

`POST /auth/sign-up` mints a single-use token (via `app/core/email.py`, Resend) and sends a verification link; the token's SHA-256 hash is stored in `verification_tokens`, never the plaintext — same principle as a password. `POST /auth/forgot-password` returns an identical response whether or not the email is registered, and only sends a reset email when it is. Both flows use the same `verification_tokens` table, distinguished by a `purpose` column, and a token is marked `used_at` on first use so it can't be replayed.

`email_verified` is tracked on the user row and settable via `POST /auth/verify-email`, but nothing currently gates on it being true — `POST /chat`, `/uploads`, and `/bookmarks` are open to any authenticated account regardless of verification status. This was previously enforced (`require_verified_email`) and was deliberately removed; see [ROADMAP.md](ROADMAP.md).

### Multi-factor authentication

TOTP via `pyotp`, plus 10 single-use backup codes (hex, hashed at rest in `mfa_backup_codes` — same principle as a password or verification token). `POST /auth/mfa/enable` generates a secret and codes but does not yet turn MFA on; `POST /auth/mfa/verify` proves the user has working access to the authenticator app before flipping `users.mfa_enabled`. Once enabled, `POST /auth/sign-in` no longer returns a session directly for that account — it returns `{mfa_required: true, mfa_token}`, and `POST /auth/mfa/challenge` (TOTP code or a backup code) is what actually issues the access token and session.

The MFA challenge token is deliberately a different JWT shape from a real session token — no `jti` claim, a `purpose: "mfa_challenge"` claim, and a 5-minute expiry — so it cannot be mistaken for a session token by `get_current_user`, which requires `jti` and would reject it outright. `decode_mfa_challenge_token` additionally checks the `purpose` claim, so the reverse — presenting a real access token as an MFA challenge token — also fails.

**Not built:** WebAuthn/passkeys, SMS-based MFA, and a UI affordance for regenerating backup codes without a full disable/re-enroll cycle.

### Security headers

Set on every response (see `app/main.py`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` (2-year max-age, includes subdomains). `Content-Security-Policy` is `default-src 'none'` everywhere except `/docs` and `/openapi.json`, which need Swagger UI's own inline/CDN assets and get a looser policy scoped to just those two paths.

### Audit logging

`app/services/audit_service.py` appends to `audit_logs` on sign-up, sign-in (success, failure, and lockout-blocked), and password reset — `user_id` is nullable so a failed sign-in against an unregistered email still logs (with `user_id = NULL`), which is exactly the kind of event worth keeping. Nothing currently reads this table back: there's no admin role or endpoint yet ([FEATURES.md](FEATURES.md)'s `GET /admin/audit-logs` is `Org admin`-only and there is no such role in this single-tenant build), so today it's queryable only via direct database access.

## Authorization

Every protected route depends on `get_current_user`, which resolves the JWT to a `User` row. Ownership is enforced **inside the query**, not after it:

```python
select(Document).where(Document.id == document_id, Document.user_id == user_id)
```

A miss raises `NotFoundError` → `404`. Returning `404` rather than `403` for another user's resource avoids confirming that the ID exists.

Retrieval carries the same constraint — both arms of hybrid search filter `chunks.user_id`, so one user's content cannot surface in another's search results or RAG context.

## Secrets

Nothing is committed. `.env` is gitignored; `.env.example` holds only placeholders. In production, secrets live in Render's environment settings, marked `sync: false` in the blueprint so they are never written to the repo. `JWT_SECRET` is generated by Render and never leaves it.

Two consequences of the free stack worth naming: the database connection crosses the public internet (TLS enforced via `ssl=require` / `sslmode=require` — do not remove it), and provider API keys sit in Render's dashboard rather than a dedicated secret manager.

Set secrets via stdin (`--set-from-stdin`) so they do not enter shell history.

## Input handling

Pydantic validates every request body and query parameter; unknown fields are rejected and type errors return `422` before any handler runs. Passwords are constrained to 8–128 characters, emails validated by `email-validator`, and enum-like fields (`theme_preference`, document `type`, search `mode`) constrained by pattern.

SQLAlchemy parameterizes all queries — including the full-text arm, where the query string is bound via `plainto_tsquery` rather than interpolated.

CORS is an explicit allowlist from `CORS_ORIGINS`, restricted to the methods and headers the app actually uses, with `allow_credentials=True`. Do not widen it to `*`.

## Bookmark saver (SSRF)

`POST /bookmarks` has the server fetch a URL the user controls — a textbook SSRF surface. `app/rag/bookmarks.py` resolves the hostname and rejects any address that is not globally routable (`ipaddress.is_global`) before every request, which covers loopback, private ranges (RFC 1918), link-local, and cloud metadata endpoints (`169.254.169.254`). Redirects are followed manually, one hop at a time, so each hop is re-validated rather than trusting `httpx`'s `follow_redirects` to land somewhere already-checked. Only `http`/`https` schemes are accepted. The fetch is capped at 10MB, read in chunks, same pattern as upload size limiting.

Not covered: DNS rebinding between the validation check and the actual request (the window is small but non-zero), and the check happens in a worker thread synchronously — a slow-resolving or adversarial DNS server could hold that thread, though the overall request still respects `_TIMEOUT`.

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

The IP is read from `X-Forwarded-For` because Render terminates TLS upstream. That header is client-controlled and only trustworthy because the platform overwrites it — if the API is ever exposed without that proxy in front, per-IP limits become spoofable.

**Without `REDIS_URL` the counters are per-process.** That is correct on Render free (a single instance) and wrong the moment the service scales out, since each instance would enforce its own budget.

## Frontend

The Next.js app sets its own security headers (`apps/web/next.config.ts`, independent of the API's): `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, `Permissions-Policy`, a CSP scoped to `'self'` plus the API origin for `connect-src`, and `poweredByHeader: false`. `app/error.tsx` and `app/global-error.tsx` give crashes a branded page instead of leaking Next's default error UI.

## Gaps

Nothing left on the pre-production checklist that was in scope for this pass. Remaining, lower-priority:

**Also missing:** WebAuthn/passkeys as an MFA alternative, request-size limits beyond `MAX_UPLOAD_BYTES`. Dependency scanning (`pip-audit`, `pnpm audit`) runs in CI but is advisory-only — see [TESTING.md](TESTING.md).

## Data handling

`documents.content` stores whatever the user ingests, in plaintext at rest (Neon's storage encryption only). Chunks duplicate that content alongside their vectors.

**Chunk text is sent to the AI provider on every ingestion and every question.** On Gemini's free tier, Google may use that data for training. This is acceptable for development and unacceptable for other people's documents — move to a paid tier or a self-hosted model before onboarding real users. See [AI.md](AI.md).

Prompt injection is unmitigated: ingested documents become model context, so a document containing instructions can influence answers. The system prompt constrains the model to answer only from context, which limits but does not eliminate this.

Deletion is soft by default (`deleted_at`); the 30-day window in [FEATURES.md](FEATURES.md) is enforced by `purge_expired_trash`, which runs opportunistically on API startup by default, or daily via an optional Cloudflare Worker cron trigger — see [DEPLOYMENT.md](DEPLOYMENT.md). `GET /api/v1/me/export` serves GDPR Article 20 portability requests — every document, folder, tag, collection, and conversation the user owns, as JSON; excludes auth/security bookkeeping (password hash, MFA secret, sessions, verification tokens, audit logs). There is still no erasure endpoint (account + all owned rows, cascade-deleted) — only the export half is built.

## Reporting

No formal process yet. For a personal deployment, keep `GEMINI_API_KEY` and `JWT_SECRET` rotatable — rotating `JWT_SECRET` invalidates every outstanding token across every user, which is the global sign-out of last resort. For a single user or session, `POST /auth/sign-out` (or a password reset, which revokes all of that user's sessions) is the targeted alternative.
