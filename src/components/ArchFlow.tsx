import { useEffect, useRef } from "react";

// The hero backdrop: a Roman aqueduct in luminous line-work, with request
// "water" flowing along the top channel and spilling down through the arches.
// It's the project's whole idea in one image — traffic carried at scale across
// a structure. Honours prefers-reduced-motion by drawing a single still frame.

interface Particle {
  x: number;
  speed: number;
  size: number;
  hue: number;
}

export function ArchFlow() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.floor(w / 18));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        speed: 0.4 + Math.random() * 1.1,
        size: 1 + Math.random() * 2.4,
        hue: Math.random(),
      }));
    };

    // Geometry of the aqueduct: two tiers of arches sitting on the lower half.
    const channelY = () => h * 0.46;
    const drawStructure = () => {
      const baseY = h * 0.92;
      const archSpan = Math.max(96, w / 9);
      const archH = archSpan * 0.62;
      const pierW = Math.max(10, archSpan * 0.14);

      ctx.lineWidth = 1.4;
      // lower arcade
      for (let x = -archSpan; x < w + archSpan; x += archSpan) {
        const grad = ctx.createLinearGradient(0, baseY - archH, 0, baseY);
        grad.addColorStop(0, "rgba(224,168,104,0.42)");
        grad.addColorStop(1, "rgba(224,168,104,0.08)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY - archH);
        ctx.arc(x + archSpan / 2, baseY - archH, archSpan / 2, Math.PI, 0);
        ctx.lineTo(x + archSpan, baseY);
        ctx.stroke();
        // pier shadow
        ctx.fillStyle = "rgba(224,168,104,0.05)";
        ctx.fillRect(x - pierW / 2, baseY - archH, pierW, archH);
      }
      // the water channel deck running along the top of the arcade
      const cy = channelY();
      ctx.strokeStyle = "rgba(53,224,196,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy + 16);
      ctx.lineTo(w, cy + 16);
      ctx.stroke();
    };

    const drawChannel = (t: number) => {
      const cy = channelY();
      // base water line glow
      const g = ctx.createLinearGradient(0, cy - 10, 0, cy + 10);
      g.addColorStop(0, "rgba(53,224,196,0)");
      g.addColorStop(0.5, "rgba(53,224,196,0.5)");
      g.addColorStop(1, "rgba(53,224,196,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = cy + Math.sin(x * 0.015 + t * 0.001) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // flowing particles
      for (const p of particles) {
        p.x += p.speed * (reduce ? 0 : 1);
        if (p.x > w + 10) p.x = -10;
        const y = cy + Math.sin(p.x * 0.015 + t * 0.001) * 3;
        const c = p.hue > 0.6 ? "106,242,219" : "53,224,196";
        ctx.beginPath();
        ctx.arc(p.x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c},0.9)`;
        ctx.shadowColor = `rgba(${c},0.9)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      drawStructure();
      drawChannel(t);
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduce) frame(0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="archflow" aria-hidden />;
}
