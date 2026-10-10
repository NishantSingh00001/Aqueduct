const PRIMS = [
  {
    ix: "01",
    name: "Priority queue",
    desc: "A binary heap behind the task scheduler — urgent work jumps the line. The Walmart advanced-engineering exercise, as a reusable structure.",
    bigO: "push / pop · O(log n)",
  },
  {
    ix: "02",
    name: "LRU cache",
    desc: "O(1) get and put over a hash map and a doubly-linked list. The cache tier in the studio: hits are served here, misses fall through.",
    bigO: "get / put · O(1)",
  },
  {
    ix: "03",
    name: "Token-bucket limiter",
    desc: "The shape most API gateways use — a bucket that refills at a steady rate up to a burst. Deterministic in time, so it's testable.",
    bigO: "take · O(1)",
  },
  {
    ix: "04",
    name: "Consistent-hash ring",
    desc: "Shards keys across nodes with virtual nodes; scaling out moves only ~1/N of keys instead of reshuffling everything.",
    bigO: "locate · O(log v)",
  },
  {
    ix: "05",
    name: "Circuit breaker",
    desc: "Stops hammering a failing dependency: trips open after repeated failures, probes half-open after a cooldown, closes on success.",
    bigO: "allow · O(1)",
  },
];

export function Primitives() {
  return (
    <section className="section band" id="engineering">
      <div className="content">
        <div className="section-head">
          <span className="eyebrow">The engine room</span>
          <h2>Built on real data structures, not mockups.</h2>
          <p className="muted">
            The studio isn't a cartoon of a system — it runs on the same primitives a real platform
            does. Each is implemented from scratch and unit-tested, including a consistent-hash ring
            whose distribution is verified to stay balanced as nodes come and go.
          </p>
        </div>
        <div className="grid prim-grid">
          {PRIMS.map((p) => (
            <div className="prim" key={p.ix}>
              <div className="ix">{p.ix}</div>
              <h3>{p.name}</h3>
              <p className="muted tiny">{p.desc}</p>
              <div className="big-o">{p.bigO}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
