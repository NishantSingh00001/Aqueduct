// A consistent-hash ring for sharding across nodes. Each node is placed at
// several virtual points around a 2^32 ring; a key maps to the first node
// clockwise from its hash. Adding or removing a node moves only a small
// fraction of keys — the property that makes it good for distributed caches and
// databases.

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Lowbias32 avalanche finalizer — FNV-1a alone distributes sequential,
  // near-identical strings poorly, which would cluster keys onto one node.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

export class HashRing {
  private ring: { hash: number; node: string }[] = [];

  constructor(
    nodes: string[] = [],
    private readonly vnodes = 64,
  ) {
    for (const n of nodes) this.addNode(n);
  }

  get nodes(): string[] {
    return [...new Set(this.ring.map((r) => r.node))];
  }

  addNode(node: string): void {
    for (let i = 0; i < this.vnodes; i++) {
      this.ring.push({ hash: fnv1a(`${node}#${i}`), node });
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  removeNode(node: string): void {
    this.ring = this.ring.filter((r) => r.node !== node);
  }

  /** The node responsible for a key. */
  locate(key: string): string | null {
    if (this.ring.length === 0) return null;
    const h = fnv1a(key);
    // binary search for the first ring point >= h, wrapping around
    let lo = 0;
    let hi = this.ring.length - 1;
    if (h > this.ring[hi].hash) return this.ring[0].node;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].hash < h) lo = mid + 1;
      else hi = mid;
    }
    return this.ring[lo].node;
  }

  /** Distribution of a set of keys across nodes — for showing balance. */
  distribution(keys: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const n of this.nodes) out[n] = 0;
    for (const k of keys) {
      const n = this.locate(k);
      if (n) out[n]++;
    }
    return out;
  }
}
