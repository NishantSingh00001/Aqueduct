import { useEffect, useMemo, useRef, useState } from "react";
import { AqueductSim, type SimConfig, type SimMetrics } from "../sim/engine.ts";

type Node = { id: string; x: number; y: number; label: string; kind: string };

function layout(cfg: SimConfig): { nodes: Node[]; edges: [string, string][] } {
  const nodes: Node[] = [
    { id: "client", x: 70, y: 260, label: "Clients", kind: "client" },
    { id: "gw", x: 240, y: 260, label: "Gateway", kind: "gw" },
    { id: "cache", x: 455, y: 70, label: "Cache", kind: "cache" },
  ];
  const edges: [string, string][] = [["client", "gw"], ["gw", "cache"]];
  const svcY = spread(cfg.replicas, 170, 440);
  for (let i = 0; i < cfg.replicas; i++) {
    nodes.push({ id: `svc-${i}`, x: 455, y: svcY[i], label: `svc ${i}`, kind: "svc" });
    edges.push(["gw", `svc-${i}`]);
  }
  const dbY = spread(cfg.shards, 150, 450);
  for (let i = 0; i < cfg.shards; i++) {
    nodes.push({ id: `db-${i + 1}`, x: 780, y: dbY[i], label: `db ${i + 1}`, kind: "db" });
    for (let s = 0; s < cfg.replicas; s++) edges.push([`svc-${s}`, `db-${i + 1}`]);
  }
  return { nodes, edges };
}
function spread(n: number, a: number, b: number): number[] {
  if (n === 1) return [(a + b) / 2];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

const KIND_COLOR: Record<string, string> = {
  client: "#8a9aa2",
  gw: "#e0a868",
  cache: "#e0a868",
  svc: "#35e0c4",
  db: "#2f8fe0",
};
const OUTCOME_COLOR: Record<string, string> = {
  ok: "#35e0c4",
  hit: "#e0a868",
  error: "#f2616b",
  throttled: "#f2b04a",
};

function Slider(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="ctl">
      <span className="ctl-row">
        <span>{props.label}</span>
        <span className="mono">{props.fmt ? props.fmt(props.value) : props.value}</span>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.step ?? 1} value={props.value} onChange={(e) => props.onChange(+e.target.value)} />
    </label>
  );
}
function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="ctl-toggle" onClick={() => props.onChange(!props.value)} type="button">
      <span>{props.label}</span>
      <span className={`sw ${props.value ? "on" : ""}`} />
    </button>
  );
}

export function Studio() {
  const [cfg, setCfg] = useState<SimConfig>({
    rps: 600,
    cacheEnabled: true,
    cacheSize: 150,
    replicas: 3,
    shards: 4,
    faulty: false,
    limitPerSec: 1200,
  });
  const [m, setM] = useState<SimMetrics | null>(null);
  const simRef = useRef<AqueductSim | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const { nodes, edges } = useMemo(() => layout(cfg), [cfg.replicas, cfg.shards]);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const nodeMapRef = useRef(nodeMap);
  nodeMapRef.current = nodeMap;

  useEffect(() => {
    simRef.current = new AqueductSim(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    simRef.current?.reconfigure(cfg);
  }, [cfg]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const VW = 880;
    const VH = 520;
    let parts: { pts: { x: number; y: number }[]; t: number; dur: number; color: string }[] = [];
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VW * dpr;
      canvas.height = VH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const sim = simRef.current!;
      sim.step(now, dt);
      // spawn visual particles from this step's pulses
      const nm = nodeMapRef.current;
      for (const p of sim.pulses) {
        const pts = p.path.map((id) => nm[id]).filter(Boolean).map((n) => ({ x: n.x, y: n.y }));
        if (pts.length < 2) continue;
        if (parts.length < 140) parts.push({ pts, t: 0, dur: 620 + Math.random() * 260, color: OUTCOME_COLOR[p.outcome] });
      }
      // advance + draw
      ctx.clearRect(0, 0, VW, VH);
      for (const part of parts) {
        part.t += reduce ? 0 : dt / part.dur;
        const seg = (part.pts.length - 1) * Math.min(1, part.t);
        const i = Math.min(part.pts.length - 2, Math.floor(seg));
        const f = seg - i;
        const a = part.pts[i];
        const b = part.pts[i + 1];
        const x = a.x + (b.x - a.x) * f;
        const y = a.y + (b.y - a.y) * f;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.shadowColor = part.color;
        ctx.shadowBlur = 9;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      parts = parts.filter((p) => p.t < 1);

      acc += dt;
      if (acc > 180) {
        acc = 0;
        setM(sim.metrics());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (patch: Partial<SimConfig>) => setCfg((c) => ({ ...c, ...patch }));

  return (
    <section className="section" id="studio">
      <div className="content">
        <div className="section-head">
          <span className="eyebrow">The studio</span>
          <h2>Send traffic through it. Watch it hold.</h2>
          <p className="muted">
            This runs on the real primitives — the LRU cache is really hitting and missing, the hash
            ring is really routing keys to shards, the breaker really trips. Turn the cache off, crank
            the traffic, or break a replica, and watch the numbers move.
          </p>
        </div>

        <div className="studio">
          <div className="controls card">
            <Slider label="Traffic" value={cfg.rps} min={50} max={2000} step={50} onChange={(v) => set({ rps: v })} fmt={(v) => `${v} rps`} />
            <Slider label="Rate limit" value={cfg.limitPerSec} min={200} max={3000} step={100} onChange={(v) => set({ limitPerSec: v })} fmt={(v) => `${v}/s`} />
            <Slider label="Service replicas" value={cfg.replicas} min={1} max={6} onChange={(v) => set({ replicas: v })} />
            <Slider label="DB shards" value={cfg.shards} min={2} max={6} onChange={(v) => set({ shards: v })} />
            <Slider label="Cache size" value={cfg.cacheSize} min={10} max={400} step={10} onChange={(v) => set({ cacheSize: v })} fmt={(v) => `${v} keys`} />
            <Toggle label="Cache enabled" value={cfg.cacheEnabled} onChange={(v) => set({ cacheEnabled: v })} />
            <Toggle label="Break a replica" value={cfg.faulty} onChange={(v) => set({ faulty: v })} />
          </div>

          <div className="stage card">
            <svg viewBox="0 0 880 520" className="topo">
              {edges.map(([a, b], i) => {
                const na = nodeMap[a];
                const nb = nodeMap[b];
                if (!na || !nb) return null;
                return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="edge" />;
              })}
              {nodes.map((n) => {
                const brk = n.kind === "svc" && m ? m.breaker[+n.id.split("-")[1]] : null;
                const open = brk === "open";
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <circle r={n.kind === "client" ? 20 : 17} className="node" style={{ fill: "var(--surface-2)", stroke: open ? "var(--err)" : KIND_COLOR[n.kind] }} />
                    <circle r={5} style={{ fill: open ? "var(--err)" : KIND_COLOR[n.kind] }} />
                    <text y={n.kind === "cache" ? -26 : 34} className="node-label">{n.label}{open ? " ⚡" : ""}</text>
                  </g>
                );
              })}
            </svg>
            <canvas ref={canvasRef} className="pulses" />
          </div>

          <div className="metrics">
            <Metric label="Throughput" value={m ? `${m.throughput}` : "—"} unit="served/s" tone="ok" />
            <Metric label="Cache hit-rate" value={m ? `${Math.round(m.hitRate * 100)}%` : "—"} unit={cfg.cacheEnabled ? "" : "cache off"} tone="warm" />
            <Metric label="p95 latency" value={m ? `${m.p95}` : "—"} unit="ms" tone={m && m.p95 > 60 ? "bad" : "ok"} />
            <Metric label="Error rate" value={m ? `${(m.errorRate * 100).toFixed(1)}%` : "—"} unit="" tone={m && m.errorRate > 0.05 ? "bad" : "ok"} />
            <div className="card bars-card">
              <div className="bars-h">Shard balance (hash ring)</div>
              <div className="loadbars">
                {m?.shardLoad.map((v, i) => (
                  <div key={i} className="lb"><i style={{ height: `${Math.max(3, v * 100)}%`, background: "var(--water-deep)" }} /><span>{i + 1}</span></div>
                ))}
              </div>
            </div>
            <div className="card bars-card">
              <div className="bars-h">Replica load</div>
              <div className="loadbars">
                {m?.replicaLoad.map((v, i) => (
                  <div key={i} className="lb"><i style={{ height: `${Math.max(3, v * 100)}%`, background: m?.breaker[i] === "open" ? "var(--err)" : "var(--water)" }} /><span>{i}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="card metric">
      <div className="m-label">{label}</div>
      <div className={`m-value ${tone}`}>{value} <span className="m-unit">{unit}</span></div>
    </div>
  );
}
