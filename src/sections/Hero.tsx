import { FluidHero } from "../components/FluidHero.tsx";

export function Hero() {
  return (
    <header className="hero">
      <FluidHero />
      <div className="hero-veil" />
      <div className="hero-inner">
        <span className="eyebrow">Distributed-systems studio</span>
        <h1>
          Carry traffic <em>at scale</em>
        </h1>
        <p className="lead">
          Compose a cloud architecture and send live traffic through it — watch it cache, shard,
          autoscale and recover, running on real rate limiters, hash rings and circuit breakers.
        </p>
        <div className="cta">
          <a className="btn primary" href="#studio">Open the studio →</a>
          <a className="btn ghost" href="#engineering">See the engineering</a>
        </div>
      </div>
      <div className="scroll-hint">SCROLL</div>
    </header>
  );
}
