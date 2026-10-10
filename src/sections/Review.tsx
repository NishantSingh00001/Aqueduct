import { useState } from "react";

type Dim = "Availability" | "Consistency" | "Cost efficiency" | "Scalability";

interface Pattern {
  id: string;
  name: string;
  tagline: string;
  scores: Record<Dim, number>;
  notes: string[];
}

const DIMS: Dim[] = ["Availability", "Consistency", "Cost efficiency", "Scalability"];

const PATTERNS: Pattern[] = [
  {
    id: "monolith",
    name: "Monolith",
    tagline: "One deployable, one database.",
    scores: { Availability: 45, Consistency: 92, "Cost efficiency": 88, Scalability: 32 },
    notes: [
      "Strong consistency — one database, one transaction boundary.",
      "Cheapest to run and simplest to reason about.",
      "A single point of failure; one bad deploy takes everything down.",
      "You can't scale the hot path without scaling the whole app.",
    ],
  },
  {
    id: "three-tier",
    name: "Load-balanced 3-tier",
    tagline: "LB → app replicas → shared DB.",
    scores: { Availability: 68, Consistency: 84, "Cost efficiency": 72, Scalability: 56 },
    notes: [
      "A load balancer and app replicas remove the app-tier single point of failure.",
      "The shared database is still the bottleneck and the limit on write scaling.",
      "A solid default for most products — well understood, moderate cost.",
    ],
  },
  {
    id: "microservices",
    name: "Microservices + cache",
    tagline: "Gateway, services, cache, sharded data.",
    scores: { Availability: 82, Consistency: 60, "Cost efficiency": 54, Scalability: 86 },
    notes: [
      "Services scale independently; a cache absorbs the read-heavy hot path.",
      "Sharding spreads writes, so the data tier scales horizontally.",
      "Consistency gets harder — data is spread, caches can go stale.",
      "More moving parts means more operational cost and complexity.",
    ],
  },
  {
    id: "multi-region",
    name: "Multi-region active-active",
    tagline: "Full stack live in every region.",
    scores: { Availability: 97, Consistency: 46, "Cost efficiency": 30, Scalability: 95 },
    notes: [
      "Survives an entire region failing — the highest availability.",
      "Lowest latency: users are served from the nearest region.",
      "Cross-region writes force a real CAP choice — usually eventual consistency.",
      "The most expensive and the hardest to operate correctly.",
    ],
  },
];

const toneFor = (v: number) => (v >= 75 ? "var(--water)" : v >= 50 ? "var(--stone)" : "var(--err)");

export function Review() {
  const [active, setActive] = useState(PATTERNS[2]);
  return (
    <section className="section band" id="review">
      <div className="content">
        <div className="section-head">
          <span className="eyebrow">Architecture review</span>
          <h2>Every design is a set of trade-offs.</h2>
          <p className="muted">
            There's no "best" architecture — only the right fit for the constraints. Pick a pattern
            and see where it wins and what it costs you. This is the lens from the BCG IT-architecture
            and Solutions-Architecture work: score the options, then choose deliberately.
          </p>
        </div>

        <div className="review">
          <div className="patterns">
            {PATTERNS.map((p) => (
              <button
                key={p.id}
                className={`pattern ${active.id === p.id ? "on" : ""}`}
                onClick={() => setActive(p)}
              >
                <strong>{p.name}</strong>
                <span className="muted tiny">{p.tagline}</span>
              </button>
            ))}
          </div>

          <div className="review-detail card">
            <div className="dims">
              {DIMS.map((d) => (
                <div className="dim" key={d}>
                  <div className="row spread tiny">
                    <span className="muted">{d}</span>
                    <span className="mono" style={{ color: toneFor(active.scores[d]) }}>{active.scores[d]}</span>
                  </div>
                  <div className="meter">
                    <i style={{ width: `${active.scores[d]}%`, background: toneFor(active.scores[d]) }} />
                  </div>
                </div>
              ))}
            </div>
            <ul className="notes">
              {active.notes.map((n, i) => (
                <li key={i} className="tiny">{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
