// Aqueduct's live backend. These endpoints run the *same* primitives the studio
// visualises — the token-bucket limiter, the LRU cache and the consistent-hash
// ring — as real server-side code, so the concepts aren't only animated, they
// actually execute here. Node/TS on Netlify Functions; no external services.

import type { Config } from "@netlify/functions";
import { TokenBucket } from "../../shared/structures/ratelimiter.ts";
import { LRUCache } from "../../shared/structures/lru.ts";
import { HashRing } from "../../shared/structures/hashring.ts";

export const config: Config = { path: "/api/*" };

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

// Per-instance state. On a serverless platform each warm instance keeps its own,
// which is exactly how a single gateway node would behave.
const buckets = new Map<string, TokenBucket>();
const cache = new LRUCache<string, { value: string; at: number }>(100);

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  if (path === "health") {
    return json({
      ok: true,
      service: "aqueduct",
      primitives: ["token-bucket", "lru-cache", "consistent-hash-ring", "circuit-breaker"],
      time: new Date().toISOString(),
    });
  }

  // Token-bucket rate limit, keyed by client. 10 req burst, refilling 2/s.
  if (path === "ratelimit") {
    const key = url.searchParams.get("key") || req.headers.get("x-forwarded-for") || "anon";
    let b = buckets.get(key);
    if (!b) {
      b = new TokenBucket(10, 2);
      buckets.set(key, b);
    }
    const allowed = b.take();
    return json({ key, allowed, remaining: b.available }, allowed ? 200 : 429);
  }

  // LRU cache demo: first read of a key is a miss (and gets stored), repeats hit.
  if (path === "cache") {
    const key = url.searchParams.get("key") || "demo";
    const existing = cache.get(key);
    if (existing) return json({ key, hit: true, value: existing.value, stats: cache.stats });
    const value = `computed:${Math.random().toString(36).slice(2, 8)}`;
    cache.put(key, { value, at: Date.now() });
    return json({ key, hit: false, value, stats: cache.stats });
  }

  // Consistent-hash distribution: how N keys spread across M nodes.
  if (path === "hashring") {
    const nodes = Math.min(10, Math.max(1, Number(url.searchParams.get("nodes") || 4)));
    const count = Math.min(20000, Math.max(1, Number(url.searchParams.get("keys") || 2000)));
    const ring = new HashRing(
      Array.from({ length: nodes }, (_, i) => `node-${i + 1}`),
      100,
    );
    const keys = Array.from({ length: count }, (_, i) => `key-${i}`);
    return json({ nodes, keys: count, distribution: ring.distribution(keys) });
  }

  return json({ error: "not found", routes: ["/api/health", "/api/ratelimit", "/api/cache", "/api/hashring"] }, 404);
};
