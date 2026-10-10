// The studio's simulation engine. It drives traffic through a small cloud
// topology using the *real* primitives from shared/structures — the same
// LRU cache, token-bucket limiter, consistent-hash ring and circuit breaker
// that the unit tests cover. Nothing here is faked: the cache hit-rate you see
// is the LRU actually hitting and missing; the shard loads are the hash ring
// actually routing keys.

import { LRUCache } from "../../shared/structures/lru.ts";
import { TokenBucket } from "../../shared/structures/ratelimiter.ts";
import { HashRing } from "../../shared/structures/hashring.ts";
import { CircuitBreaker } from "../../shared/structures/circuitbreaker.ts";

export interface SimConfig {
  rps: number;
  cacheEnabled: boolean;
  cacheSize: number;
  replicas: number;
  shards: number;
  faulty: boolean; // inject a failing replica
  limitPerSec: number; // gateway rate limit
}

export interface SimMetrics {
  throughput: number; // served/s
  hitRate: number;
  p50: number;
  p95: number;
  errorRate: number;
  replicaLoad: number[];
  breaker: string[];
  shardLoad: number[];
  totalServed: number;
  totalThrottled: number;
  totalErrors: number;
}

export interface Pulse {
  // a visual request for the renderer
  path: ("client" | "gw" | "cache" | string)[]; // node ids
  outcome: "ok" | "hit" | "error" | "throttled";
  born: number;
}

const HOT_KEYS = 600;

export class AqueductSim {
  private cache: LRUCache<number, number>;
  private bucket: TokenBucket;
  private ring: HashRing;
  private breakers: CircuitBreaker[] = [];
  private rr = 0;

  private lat: number[] = [];
  private served = 0;
  private hits = 0;
  private reqWindow = 0;
  private servedWindow = 0;
  private errWindow = 0;
  private replicaHits: number[] = [];
  private shardHits: Record<string, number> = {};
  totalServed = 0;
  totalThrottled = 0;
  totalErrors = 0;

  pulses: Pulse[] = [];

  constructor(private cfg: SimConfig) {
    this.cache = new LRUCache(Math.max(1, cfg.cacheSize));
    this.bucket = new TokenBucket(cfg.limitPerSec, cfg.limitPerSec, 0);
    this.ring = new HashRing(this.shardIds(cfg.shards), 80);
    this.rebuildReplicas();
  }

  private shardIds(n: number) {
    return Array.from({ length: n }, (_, i) => `db-${i + 1}`);
  }
  private rebuildReplicas() {
    this.breakers = Array.from({ length: this.cfg.replicas }, () => new CircuitBreaker(6, 3000));
    this.replicaHits = Array(this.cfg.replicas).fill(0);
  }

  reconfigure(cfg: SimConfig) {
    if (cfg.cacheSize !== this.cfg.cacheSize) this.cache = new LRUCache(Math.max(1, cfg.cacheSize));
    if (cfg.limitPerSec !== this.cfg.limitPerSec) this.bucket = new TokenBucket(cfg.limitPerSec, cfg.limitPerSec, performance.now());
    if (cfg.shards !== this.cfg.shards) this.ring = new HashRing(this.shardIds(cfg.shards), 80);
    const replicasChanged = cfg.replicas !== this.cfg.replicas;
    this.cfg = cfg;
    if (replicasChanged) this.rebuildReplicas();
  }

  private hotKey(): number {
    // power-law: small keys are popular, so the cache earns its keep
    return Math.floor(Math.pow(Math.random(), 2.2) * HOT_KEYS);
  }

  /** Advance the simulation by dt milliseconds. */
  step(now: number, dt: number) {
    const n = Math.max(0, Math.round((this.cfg.rps * dt) / 1000));
    this.pulses = [];
    for (let i = 0; i < n; i++) this.one(now);
    // decay rolling windows
    const decay = Math.min(1, dt / 1000);
    this.reqWindow *= 1 - decay * 0.5;
    this.servedWindow *= 1 - decay * 0.5;
    this.errWindow *= 1 - decay * 0.5;
    if (this.lat.length > 400) this.lat = this.lat.slice(-400);
  }

  private one(now: number) {
    this.reqWindow++;
    const key = this.hotKey();
    // 1) gateway rate limit
    if (!this.bucket.take(now)) {
      this.totalThrottled++;
      this.errWindow++;
      if (this.pulses.length < 60) this.pulses.push({ path: ["client", "gw"], outcome: "throttled", born: now });
      return;
    }
    // 2) cache
    if (this.cfg.cacheEnabled && this.cache.get(key) !== undefined) {
      this.hits++;
      this.record(now, 4 + Math.random() * 6, "hit", ["client", "gw", "cache"]);
      return;
    }
    // 3) route to a healthy replica (round-robin, skipping open breakers)
    let idx = -1;
    for (let t = 0; t < this.cfg.replicas; t++) {
      const cand = (this.rr + t) % this.cfg.replicas;
      if (this.breakers[cand].allow(now)) {
        idx = cand;
        break;
      }
    }
    this.rr = (this.rr + 1) % this.cfg.replicas;
    if (idx === -1) {
      this.fail(now, ["client", "gw"]);
      return;
    }
    this.replicaHits[idx]++;
    // the faulty replica (index 0 when enabled) fails ~55% of the time
    const willFail = this.cfg.faulty && idx === 0 && Math.random() < 0.55;
    this.breakers[idx].record(!willFail, now);
    if (willFail) {
      this.fail(now, ["client", "gw", `svc-${idx}`]);
      return;
    }
    // 4) DB shard via hash ring
    const shard = this.ring.locate(`k${key}`) ?? "db-1";
    this.shardHits[shard] = (this.shardHits[shard] || 0) + 1;
    // 5) populate cache
    if (this.cfg.cacheEnabled) this.cache.put(key, 1);
    const latency = 18 + Math.random() * 30 + (this.cfg.faulty ? 6 : 0);
    this.record(now, latency, "ok", ["client", "gw", `svc-${idx}`, shard]);
  }

  private fail(now: number, path: string[]) {
    this.totalErrors++;
    this.errWindow++;
    if (this.pulses.length < 60) this.pulses.push({ path, outcome: "error", born: now });
  }
  private record(now: number, latency: number, outcome: "ok" | "hit", path: string[]) {
    this.served++;
    this.servedWindow++;
    this.totalServed++;
    this.lat.push(latency);
    if (this.pulses.length < 60) this.pulses.push({ path, outcome, born: now });
  }

  metrics(): SimMetrics {
    const sorted = [...this.lat].sort((a, b) => a - b);
    const pct = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0);
    const totalReq = this.reqWindow || 1;
    const shardLoad = this.shardIds(this.cfg.shards).map((id) => this.shardHits[id] || 0);
    const shardTotal = shardLoad.reduce((a, b) => a + b, 0) || 1;
    const replicaTotal = this.replicaHits.reduce((a, b) => a + b, 0) || 1;
    return {
      throughput: Math.round(this.servedWindow),
      hitRate: this.served + this.hits ? this.hits / (this.served + this.hits) : 0,
      p50: Math.round(pct(0.5)),
      p95: Math.round(pct(0.95)),
      errorRate: this.errWindow / totalReq,
      replicaLoad: this.replicaHits.map((h) => h / replicaTotal),
      breaker: this.breakers.map((b) => b.current),
      shardLoad: shardLoad.map((h) => h / shardTotal),
      totalServed: this.totalServed,
      totalThrottled: this.totalThrottled,
      totalErrors: this.totalErrors,
    };
  }
}
