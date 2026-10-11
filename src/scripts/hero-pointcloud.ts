/**
 * Hero visual: a procedural LiDAR-style point cloud of a crop field,
 * with a green scan band sweeping away from the viewer.
 * Loaded lazily, only on capable devices (see Hero.astro).
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Points,
  Color,
  NormalBlending,
} from 'three';

export interface PointCloudOptions {
  /** Fixed time (seconds) to render a single still frame — used to generate the fallback image. */
  stillAt?: number;
}

const DEPTH = 210;

// Small deterministic PRNG so the field looks the same on every load.
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function terrain(x: number, z: number) {
  return (
    1.3 * Math.sin(x * 0.028 + 0.6) * Math.sin(z * 0.022 + 1.1) +
    0.7 * Math.sin(x * 0.061 - z * 0.037) +
    0.25 * Math.sin(x * 0.17 + z * 0.11)
  );
}
/** Low-frequency "management zone" field in 0..1 — crop vigour varies across the field. */
function zone(x: number, z: number) {
  const v =
    Math.sin(x * 0.045 + z * 0.018) * 0.5 +
    Math.sin(x * 0.012 - z * 0.041 + 2.0) * 0.35 +
    Math.sin(x * 0.09 + z * 0.06 + 4.0) * 0.15;
  return Math.min(1, Math.max(0, v * 0.5 + 0.5));
}

function buildField(mobile: boolean) {
  const rowGap = mobile ? 1.0 : 0.8;
  const density = mobile ? 0.65 : 1;
  const perPlant = mobile ? 2 : 3;

  // First pass: count samples so we can fill typed arrays directly (fast, no GC churn).
  let n = 0;
  for (let d = -8; d < DEPTH; d += (0.26 + Math.max(0, d) * 0.013) / density) {
    const halfW = 12 + Math.max(0, d) * (mobile ? 0.62 : 0.92);
    n += Math.floor((2 * Math.floor(halfW / rowGap) * rowGap) / rowGap) + 1;
  }
  const total = n * perPlant;
  const pos = new Float32Array(total * 3);
  const seed = new Float32Array(total);
  const shade = new Float32Array(total);

  const rnd = mulberry32(7);
  let i = 0;
  for (let d = -8; d < DEPTH && i < total; ) {
    const dz = (0.26 + Math.max(0, d) * 0.013) / density;
    const z = -d;
    const halfW = 12 + Math.max(0, d) * (mobile ? 0.62 : 0.92);
    const x0 = -Math.floor(halfW / rowGap) * rowGap;
    const rows = Math.floor((-2 * x0) / rowGap) + 1;
    for (let rI = 0; rI < rows && i < total; rI++) {
      const x = x0 + rI * rowGap;
      const jx = x + (rnd() - 0.5) * 0.18;
      const jz = z + (rnd() - 0.5) * dz * 0.9;
      const zn = zone(jx, jz);
      const ground = terrain(jx, jz);
      // Crop height varies with the zone (vigorous zones grow taller).
      const crop = 0.25 + 0.75 * zn;
      // A few returns per plant, spread through the canopy, like a LiDAR scan.
      for (let k = 0; k < perPlant; k++) {
        const r = k === 0 ? 0 : Math.pow(rnd(), 0.6);
        pos[i * 3] = jx + (rnd() - 0.5) * 0.12 * r;
        pos[i * 3 + 1] = ground + r * crop;
        pos[i * 3 + 2] = jz + (rnd() - 0.5) * 0.12 * r;
        seed[i] = rnd();
        shade[i] = (0.5 + 0.5 * zn) * (k === 0 ? 0.55 : 1);
        i++;
      }
    }
    d += dz;
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos.subarray(0, i * 3), 3));
  g.setAttribute('aSeed', new Float32BufferAttribute(seed.subarray(0, i), 1));
  g.setAttribute('aShade', new Float32BufferAttribute(shade.subarray(0, i), 1));
  return g;
}

const vertex = /* glsl */ `
  attribute float aSeed;
  attribute float aShade;
  uniform float uTime;
  uniform float uScan;
  uniform float uPx;
  uniform float uDepth;
  varying float vAlpha;
  varying float vScan;
  varying float vShade;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 1.3 + aSeed * 6.2831 + p.x * 0.2) * 0.03;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    vAlpha = smoothstep(uDepth * 0.98, uDepth * 0.22, d) * smoothstep(0.8, 5.0, d);
    float s = p.z - uScan;            // > 0: the band has already passed this point
    float band = exp(-abs(s) * 0.28);
    float trail = step(0.0, s) * exp(-s * 0.05) * 0.38;
    vScan = clamp(band + trail, 0.0, 1.0);
    vShade = aShade;
    gl_PointSize = clamp(uPx * (0.8 + aSeed * 0.7) * (30.0 / d) * (1.0 + vScan * 0.7), 1.0, 7.0 * uPx);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uBase;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vScan;
  varying float vShade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;
    float soft = smoothstep(0.25, 0.05, r);
    vec3 col = mix(uBase * (0.45 + 0.55 * vShade), uAccent, vScan);
    float a = vAlpha * soft * (0.5 + 0.5 * vShade + vScan * 1.2);
    gl_FragColor = vec4(col, a);
  }
`;

export function mountPointCloud(host: HTMLElement, onReady?: () => void, opts: PointCloudOptions = {}) {
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: opts.stillAt !== undefined });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0b0c0a, 1);
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(mobile ? 62 : 48, 1, 0.5, DEPTH + 20);

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uScan: { value: 0 },
      uPx: { value: dpr },
      uDepth: { value: DEPTH },
      uBase: { value: new Color('#ECECE4') },
      uAccent: { value: new Color('#C6F432') },
    },
  });
  const points = new Points(buildField(mobile), material);
  scene.add(points);

  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const PERIOD = 7; // seconds per scan pass
  function frame(t: number) {
    material.uniforms.uTime.value = t;
    const phase = (t % PERIOD) / PERIOD;
    const ease = 1 - Math.pow(1 - Math.min(phase / 0.8, 1), 2); // sweep during first 80%, then rest
    material.uniforms.uScan.value = 4 - ease * (DEPTH * 0.75);

    // Slow forward drift (ping-pong) with a slight yaw.
    const drift = (1 - Math.cos(t * 0.045)) * 5;
    camera.position.set(Math.sin(t * 0.03) * 2.2, mobile ? 6.2 : 4.6, 9 - drift);
    camera.lookAt(Math.sin(t * 0.03 + 0.6) * 5, mobile ? -2.5 : -1.5, -48 - drift);
    renderer.render(scene, camera);
  }

  if (opts.stillAt !== undefined) {
    frame(opts.stillAt);
    onReady?.();
    return { destroy() {} };
  }

  let raf = 0;
  let running = false;
  let visible = true;
  const t0 = performance.now();
  const loop = (now: number) => {
    frame((now - t0) / 1000 + 2.2);
    raf = requestAnimationFrame(loop);
  };
  const setRunning = (on: boolean) => {
    if (on && !running) { running = true; raf = requestAnimationFrame(loop); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  };

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); });
  io.observe(host);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  // Render one frame, then reveal.
  frame(2.2);
  requestAnimationFrame(() => onReady?.());
  setRunning(true);

  return {
    destroy() {
      setRunning(false); io.disconnect(); ro.disconnect();
      points.geometry.dispose(); material.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
