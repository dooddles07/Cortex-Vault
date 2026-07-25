# Deployment

Railway, five services in one project (`CortexVault`), all on the `production` environment.

## Services

| Service | Source | Root directory | Public |
|---|---|---|---|
| `@cortexvault/web` | GitHub repo | *(repo root)* | Yes |
| `api` | Same repo | `apps/server` | Yes, port 8000 |
| `worker` | Same repo | `apps/server` | No |
| `Postgres` | `pgvector`-capable image | — | Internal |
| `Redis` | `redis:8` | — | Internal |

`api` and `worker` build the **same image** and differ only by `SERVICE_ROLE`. See [ARCHITECTURE.md](ARCHITECTURE.md) for why.

## Config as code

Two `railway.json` files, each resolved relative to its service's root directory:

- `railway.json` (repo root) — the web service: Railpack builder, pnpm filtered build/start
- `apps/server/railway.json` — api and worker: Dockerfile builder, restart on failure

`apps/server/railway.json` deliberately declares **no** `startCommand`. Both services read the same file, so a start command there would apply to both. The Dockerfile's `CMD ["./entrypoint.sh"]` owns it, and the script branches on `SERVICE_ROLE`.

**Root Directory cannot be set via CLI or config file** — it is a dashboard-only setting (Service → Settings → Source). Railway stages settings changes: type the value, press Enter, then click the staged-changes banner to apply. Without applying, the service silently keeps building the repo root — which for `api` meant serving the Next.js app instead of FastAPI.

## Environment variables

Database and Redis use Railway reference syntax over the private network — no egress cost, no hardcoded credentials:

```
DATABASE_URL=postgresql+asyncpg://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}
DATABASE_URL_SYNC=postgresql+psycopg2://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}
REDIS_URL=${{Redis.REDIS_URL}}
```

| Variable | api | worker | Notes |
|---|---|---|---|
| `SERVICE_ROLE` | `api` | `worker` | Selects the entrypoint branch |
| `PORT` | `8000` | — | Railway injects; uvicorn binds it |
| `JWT_SECRET` | ✅ | `${{api.JWT_SECRET}}` | Cross-service reference — never leaves Railway |
| `CORS_ORIGINS` | ✅ | — | JSON array, e.g. `["https://…"]` |
| `GEMINI_API_KEY` | ✅ | ✅ | |
| `CHAT_PROVIDER`, `EMBEDDING_PROVIDER`, `EMBEDDING_DIM` | ✅ | ✅ | Must match between the two |
| `NEXT_PUBLIC_API_URL` | *(web)* | — | Points the frontend at the API |

Set secrets via stdin so they never enter shell history:

```bash
railway variables --service api --set-from-stdin GEMINI_API_KEY
```

`CORS_ORIGINS` is parsed by pydantic-settings as `list[str]` and must be valid JSON — a bare comma-separated string fails at startup.

## Deploy flow

Push to `main` triggers a rebuild of any service whose `watchPatterns` match. `api` and `worker` watch `apps/server/**`.

On boot, the api role runs `alembic upgrade head` before uvicorn. Migrations run **only** in the api role, so scaled workers cannot race the migration lock.

## Verifying a deploy

```bash
curl -s https://<api-domain>/health          # {"status":"ok","env":"production"}
curl -s -o /dev/null -w "%{http_code}\n" https://<api-domain>/api/v1/me   # 401
railway logs --service api --deployment
railway service list
```

A `200` on `/health` returning JSON confirms FastAPI. HTML instead means the root directory is unset and the Next.js app is being served.

## Failures seen in practice

| Symptom | Cause | Fix |
|---|---|---|
| API serves the Next.js app | Root Directory unset/unapplied | Set `apps/server`, apply the staged change |
| `502 Application failed to respond` | Wrong port binding | `PORT` must be honored by the start command |
| `openai.OpenAIError: Missing credentials` at boot | Eager client construction at import | Build provider clients lazily |
| `ValueError: password cannot be longer than 72 bytes` | `passlib` + `bcrypt>=4.1` incompatibility | Use `bcrypt` directly |
| `CREATE INDEX ... hnsw` fails | Embedding dimension >2000 | Pin `outputDimensionality` to 768 |
| Gemini `429 limit: 0` | Model has no free-tier quota | Use a model that does — see [AI.md](AI.md) |

## Cost

Railway Hobby includes $5/month of usage. Five always-on services with two volumes exceeds that; budget $15–25/month. Set a hard spend limit under Workspace → Usage → Limits — without one there is no ceiling.

The AI providers are free tier and contribute $0.

## Operational gaps

- **No staging environment.** `main` deploys straight to production.
- **No healthcheck path configured** in `railway.json`, so Railway does not gate a rollout on `/health`.
- **No error tracking or metrics.** Sentry and PostHog appear in the original plan; neither is wired.
- **No database backups configured** beyond Railway's defaults.
- **No log aggregation** — logs are per-service and ephemeral.
