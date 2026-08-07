# purge-cron

Cloudflare Worker Cron Trigger that replaces the opportunistic (API-startup-only)
trash and session purge with a real daily schedule. Free tier, no credit card.

Calls `POST /api/v1/internal/purge` on the deployed API once a day. That route
only exists in a meaningful way once `INTERNAL_PURGE_TOKEN` is set on the API
(Render) — unset, it 404s and this worker's calls just fail harmlessly, so
deploying this is fully optional and additive. See
[docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

## Deploy

```bash
cd infra/purge-cron
npm install
npx wrangler login                       # one-time, opens a browser

# Set API_URL in wrangler.toml to the real deployed API first, then:
npx wrangler secret put INTERNAL_PURGE_TOKEN   # paste the same value set on Render

npm run deploy
```

## Verify

```bash
curl -X POST https://cortexvault-purge-cron.<your-subdomain>.workers.dev \
  -H "X-Internal-Token: <the same token>"
```

Expect `{"ok":true,"status":200,"body":"{\"trashed_documents\":N,\"sessions\":N}"}`.

The cron itself fires daily at 03:00 UTC (`wrangler.toml` → `[triggers]`) — no
action needed after deploy.
