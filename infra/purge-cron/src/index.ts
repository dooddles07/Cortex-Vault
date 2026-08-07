export interface Env {
  API_URL: string;
  INTERNAL_PURGE_TOKEN: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purge(env));
  },

  // GET-triggerable too, so a deploy can be smoke-tested without waiting for
  // the cron to fire. Same token gate as the scheduled path.
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get("X-Internal-Token") !== env.INTERNAL_PURGE_TOKEN) {
      return new Response("Forbidden", { status: 403 });
    }
    const result = await purge(env);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;

async function purge(env: Env): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await fetch(`${env.API_URL}/api/v1/internal/purge`, {
    method: "POST",
    headers: { "X-Internal-Token": env.INTERNAL_PURGE_TOKEN },
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`purge failed: ${response.status} ${body}`);
  }
  return { ok: response.ok, status: response.status, body };
}
