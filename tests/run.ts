import { check, eq, report, section } from "./assert.ts";
import { PriorityQueue } from "../shared/structures/heap.ts";
import { LRUCache } from "../shared/structures/lru.ts";
import { TokenBucket } from "../shared/structures/ratelimiter.ts";
import { HashRing } from "../shared/structures/hashring.ts";
import { CircuitBreaker } from "../shared/structures/circuitbreaker.ts";

section("Priority queue (binary heap)");
{
  const pq = new PriorityQueue<number>((a, b) => a < b); // min-heap
  for (const n of [5, 3, 8, 1, 9, 2, 7]) pq.push(n);
  const out: number[] = [];
  while (pq.size) out.push(pq.pop()!);
  eq("pops in sorted order", out.join(","), "1,2,3,5,7,8,9");

  const tasks = new PriorityQueue<{ id: string; prio: number }>((a, b) => a.prio < b.prio);
  tasks.push({ id: "low", prio: 10 });
  tasks.push({ id: "urgent", prio: 1 });
  tasks.push({ id: "mid", prio: 5 });
  eq("highest-priority task comes first", tasks.pop()!.id, "urgent");

  // randomized vs a sorted reference
  const ref: number[] = [];
  const h = new PriorityQueue<number>((a, b) => a < b);
  for (let i = 0; i < 1000; i++) {
    const v = Math.floor(Math.random() * 10000);
    ref.push(v);
    h.push(v);
  }
  ref.sort((a, b) => a - b);
  const got: number[] = [];
  while (h.size) got.push(h.pop()!);
  eq("1000 random elements match a sort", got.join(",") === ref.join(","), true);
}

section("LRU cache");
{
  const c = new LRUCache<string, number>(2);
  c.put("a", 1);
  c.put("b", 2);
  eq("hit returns the value", c.get("a"), 1); // a is now most-recent
  c.put("c", 3); // evicts b (least-recent)
  eq("evicted key is gone", c.get("b"), undefined);
  eq("recently used key survives", c.get("a"), 1);
  eq("newest key present", c.get("c"), 3);
  check("hit-rate is tracked", c.stats.hitRate > 0 && c.stats.hitRate < 1);
}

section("Token-bucket rate limiter");
{
  const tb = new TokenBucket(5, 1, 0); // capacity 5, 1 token/sec
  let allowed = 0;
  for (let i = 0; i < 5; i++) if (tb.take(0)) allowed++;
  eq("burst of capacity is allowed", allowed, 5);
  eq("the next request is throttled", tb.take(0), false);
  eq("one token back after 1s", tb.take(1000), true);
  eq("and only one", tb.take(1000), false);
  eq("refill is capped at capacity", (() => { const b = new TokenBucket(3, 1, 0); return b.take(100000) && b.available; })(), 2);
}

section("Consistent-hash ring");
{
  const ring = new HashRing(["n1", "n2", "n3"], 100);
  const keys = Array.from({ length: 6000 }, (_, i) => `key-${i}`);
  const before = ring.distribution(keys);
  const spread = Object.values(before);
  const min = Math.min(...spread);
  const max = Math.max(...spread);
  check("keys spread roughly evenly across nodes", max / min < 1.6, { min, max });

  const assigned = new Map(keys.map((k) => [k, ring.locate(k)]));
  ring.addNode("n4");
  let moved = 0;
  for (const k of keys) if (ring.locate(k) !== assigned.get(k)) moved++;
  // adding a 4th node should move roughly 1/4 of keys, far less than half
  check("adding a node moves only a small fraction of keys", moved / keys.length < 0.35, moved / keys.length);
}

section("Circuit breaker");
{
  const cb = new CircuitBreaker(3, 1000);
  eq("starts closed", cb.current, "closed");
  for (let i = 0; i < 3; i++) cb.record(false, 0);
  eq("trips open after threshold failures", cb.current, "open");
  eq("blocks requests while open", cb.allow(500), false);
  eq("half-opens after cooldown", cb.allow(1100), true);
  cb.record(true, 1100);
  eq("closes again on a successful probe", cb.current, "closed");
}

section("Backend API runs the real primitives");
{
  const handler = (await import("../netlify/functions/api.mts")).default;
  const call = async (p: string) => {
    const res = await handler(new Request(`https://aqueduct.test/api/${p}`));
    return { status: res.status, body: await res.json() };
  };
  const health = await call("health");
  eq("health ok", health.body.ok, true);
  check("health lists the primitives", health.body.primitives.includes("consistent-hash-ring"));

  // rate limit: burst of 10 allowed, 11th throttled
  let allowed = 0;
  for (let i = 0; i < 10; i++) if ((await call("ratelimit?key=t1")).body.allowed) allowed++;
  eq("burst of 10 allowed", allowed, 10);
  eq("11th request throttled (429)", (await call("ratelimit?key=t1")).status, 429);

  // cache: first miss, second hit
  eq("first read is a miss", (await call("cache?key=k1")).body.hit, false);
  eq("second read is a hit", (await call("cache?key=k1")).body.hit, true);

  // hashring distribution is balanced
  const ring = await call("hashring?nodes=4&keys=4000");
  const spread = Object.values(ring.body.distribution) as number[];
  check("4000 keys spread across 4 nodes", Math.max(...spread) / Math.min(...spread) < 1.6, spread);

  eq("unknown route 404s", (await call("nope")).status, 404);
}

report();
