import { useEffect, useRef, useState } from "react";

const STAGES = [
  { name: "Commit", tool: "git", detail: "Push to main" },
  { name: "Build", tool: "vite · maven", detail: "Compile & bundle" },
  { name: "Test", tool: "CI", detail: "28 checks" },
  { name: "Containerize", tool: "Docker", detail: "Build image" },
  { name: "Provision", tool: "Terraform", detail: "Infra as code" },
  { name: "Deploy", tool: "Netlify · K8s", detail: "Rolling release" },
  { name: "Observe", tool: "metrics", detail: "Health & alerts" },
];

type State = "idle" | "running" | "passed";

export function Pipeline() {
  const [states, setStates] = useState<State[]>(STAGES.map(() => "idle"));
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    if (running) return;
    setRunning(true);
    setStates(STAGES.map(() => "idle"));
    timers.current.forEach(clearTimeout);
    timers.current = [];
    STAGES.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => setStates((s) => s.map((v, j) => (j === i ? "running" : v))), i * 620 + 100),
      );
      timers.current.push(
        window.setTimeout(() => setStates((s) => s.map((v, j) => (j === i ? "passed" : v))), i * 620 + 560),
      );
    });
    timers.current.push(window.setTimeout(() => setRunning(false), STAGES.length * 620 + 200));
  };

  return (
    <section className="section" id="pipeline">
      <div className="content">
        <div className="section-head">
          <span className="eyebrow">Ship it</span>
          <h2>From commit to production, automated.</h2>
          <p className="muted">
            A zero-touch delivery pipeline — the DevOps practice behind shipping safely and often:
            build, test, containerize, provision with infrastructure-as-code, then a rolling deploy
            with health checks. Run it.
          </p>
        </div>

        <div className="pipeline card">
          {STAGES.map((s, i) => (
            <div key={s.name} className={`pstage ${states[i]}`}>
              <div className="pstage-top">
                <span className="dot" />
                <strong>{s.name}</strong>
              </div>
              <div className="muted tiny">{s.detail}</div>
              <div className="mono tiny tool">{s.tool}</div>
              {i < STAGES.length - 1 && <div className="connector" />}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={run} disabled={running}>
            {running ? "Running pipeline…" : "Run the pipeline →"}
          </button>
        </div>
      </div>
    </section>
  );
}
