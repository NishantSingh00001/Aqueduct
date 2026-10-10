const MAP: { group: string; items: { feature: string; detail: string }[] }[] = [
  {
    group: "Software engineering",
    items: [
      { feature: "Priority-queue task scheduler", detail: "Walmart — Advanced Software Engineering (data structures)." },
      { feature: "Microservice decomposition & the gateway", detail: "Skyscanner — Software Engineering." },
      { feature: "REST service + backend API", detail: "HPE — Software Engineering; Scaler Spring Boot (reference service)." },
    ],
  },
  {
    group: "Architecture & cloud",
    items: [
      { feature: "The trade-off review (availability/consistency/cost/scale)", detail: "BCG — IT Architecture; Forage Solutions Architecture." },
      { feature: "Multi-cloud topology, autoscaling, sharding", detail: "Datacom — Introduction to Cloud." },
      { feature: "East-West routing, SDN/NFV framing", detail: "JNCIA-Cloud (Juniper)." },
    ],
  },
  {
    group: "Reliability & operations",
    items: [
      { feature: "Circuit breaker, rate limiting, caching", detail: "Distributed-systems resilience patterns — beyond the coursework." },
      { feature: "CI/CD pipeline, containerize, IaC, rolling deploy", detail: "Udemy — DevOps (Docker, Kubernetes, Terraform, Jenkins)." },
      { feature: "Live metrics & health", detail: "Observability — the operate half of DevOps." },
    ],
  },
];

export function CourseMap() {
  return (
    <section className="section band" id="learn">
      <div className="content">
        <div className="section-head">
          <span className="eyebrow">What it demonstrates</span>
          <h2>Each piece, tied to the work behind it.</h2>
          <p className="muted">
            Aqueduct puts a stack of certifications into one running system — and goes past them with
            the resilience patterns and the live simulation.
          </p>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          {MAP.map((g) => (
            <div className="card" key={g.group}>
              <strong style={{ display: "block", marginBottom: 6 }}>{g.group}</strong>
              {g.items.map((it) => (
                <div className="course-item" key={it.feature}>
                  <strong className="tiny">{it.feature}</strong>
                  <span className="muted tiny">{it.detail}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <strong>Honest about the stack</strong>
          <p className="muted tiny" style={{ marginTop: 6 }}>
            The live backend runs on Netlify Functions (Node/TypeScript) so the whole thing deploys in
            one step. The same gateway is also written in Java/Spring Boot in <span className="mono">reference/springboot/</span> —
            the Scaler course stack — for roles that interview on the JVM.
          </p>
        </div>
      </div>
    </section>
  );
}
