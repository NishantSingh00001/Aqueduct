import { useEffect, useRef } from "react";
import * as THREE from "three";

// A real GPU generative-fluid backdrop: a full-screen fragment shader of
// domain-warped fractal noise in the Aqueduct palette (deep ink, teal, blue,
// aqua). It drifts on its own and bends toward the cursor. Honours
// prefers-reduced-motion by freezing the clock.

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;

// hash + value noise + fbm
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0; float amp = 0.5;
  for(int i=0;i<6;i++){ v += amp*noise(p); p *= 2.0; amp *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv;
  float aspect = u_res.x / u_res.y;
  vec2 p = uv; p.x *= aspect;
  float t = u_time * 0.06;

  // cursor pull
  vec2 m = u_mouse; m.x *= aspect;
  float md = distance(p, m);
  vec2 pull = (p - m) * 0.25 / (md*md + 0.35);

  // domain warping
  vec2 q = vec2(fbm(p*1.4 + t), fbm(p*1.4 + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p*1.4 + 2.4*q + vec2(1.7,9.2) + t*1.2 - pull),
                fbm(p*1.4 + 2.4*q + vec2(8.3,2.8) - t));
  float f = fbm(p*1.4 + 3.0*r);

  vec3 cDeep  = vec3(0.012, 0.047, 0.078);
  vec3 cBlue  = vec3(0.075, 0.33, 0.78);
  vec3 cTeal  = vec3(0.075, 0.82, 0.74);
  vec3 cAqua  = vec3(0.30, 0.97, 0.82);

  vec3 col = cDeep;
  col = mix(col, cBlue, smoothstep(0.1, 0.75, f));
  col = mix(col, cTeal, smoothstep(0.55, 1.05, length(r)));
  col = mix(col, cAqua, smoothstep(0.9, 1.25, length(q)) * 0.8);

  // darken toward edges so text stays readable; glow near cursor
  float vig = smoothstep(1.25, 0.25, distance(uv, vec2(0.5)));
  col *= 0.35 + 0.65*vig;
  col += cAqua * 0.10 * smoothstep(0.5, 0.0, md);

  // subtle grain
  col += (hash(uv*u_res + u_time)-0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

export function FluidHero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      uniforms.u_res.value.set(w * dpr, h * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const target = new THREE.Vector2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
    };
    window.addEventListener("pointermove", onMove);

    const start = performance.now();
    let raf = 0;
    const loop = () => {
      uniforms.u_time.value = reduce ? 8 : (performance.now() - start) / 1000;
      uniforms.u_mouse.value.lerp(target, 0.04);
      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      renderer.dispose();
      mat.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="fluid-canvas" aria-hidden />;
}
