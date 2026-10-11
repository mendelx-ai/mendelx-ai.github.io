/**
 * "From orbit to every row" — a canvas 2D sequence driven by a progress value p in [0, 2]:
 *   0  satellite view: patchwork of parcels, graticule, target parcel bracketed
 *   1  ground view: zoomed into the parcel, crop rows, tractor with a green LiDAR fan
 *   2  zones: parcel recoloured into management zones; tractor trail drops dots by zone
 */

type Rect = { x: number; y: number; w: number; h: number; v: number };

const BG = '#0B0C0A';
const TEXT = '236,236,228';
const ACCENT = '198,244,50';
const DIM = '#8A8A80';
const WORLD = 1000;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParcels(): { parcels: Rect[]; target: Rect } {
  const r = rng(11);
  const out: Rect[] = [];
  const split = (x: number, y: number, w: number, h: number, depth: number) => {
    if (depth === 0 || (w < 120 && h < 120)) {
      const g = 5;
      out.push({ x: x + g, y: y + g, w: w - 2 * g, h: h - 2 * g, v: r() });
      return;
    }
    const horiz = w > h ? false : w < h ? true : r() > 0.5;
    const t = 0.32 + r() * 0.36;
    if (horiz) {
      split(x, y, w, h * t, depth - 1);
      split(x, y + h * t, w, h * (1 - t), depth - 1);
    } else {
      split(x, y, w * t, h, depth - 1);
      split(x + w * t, y, w * (1 - t), h, depth - 1);
    }
  };
  split(0, 0, WORLD, WORLD, 7);
  // Target: a large-ish parcel near the centre, wider than tall.
  let best = out[0], bestScore = -Infinity;
  for (const p of out) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const dist = Math.hypot(cx - 500, cy - 480);
    const aspect = p.w / p.h;
    const score = p.w * p.h * 0.002 - dist * 0.35 + (aspect > 1.25 && aspect < 2.2 ? 40 : -40);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return { parcels: out, target: best };
}

/** Management-zone value 0..1 inside the parcel (u, v in 0..1). */
function zoneAt(u: number, v: number) {
  const n = Math.sin(u * 5.2 + 0.7) * 0.5 + Math.sin(v * 3.9 - u * 2.6 + 1.9) * 0.35 + Math.sin((u - v) * 8.1) * 0.15;
  return Math.min(1, Math.max(0, n * 0.5 + 0.5));
}
const zoneLevel = (z: number) => (z < 0.38 ? 0 : z < 0.64 ? 1 : 2);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const { parcels, target } = buildParcels();

export class OrbitScene {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private running = false;
  private t0 = performance.now();
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = false;
  p = 0;

  constructor(private canvas: HTMLCanvasElement, private opts: { animate: boolean; fixedP?: number }) {
    this.ctx = canvas.getContext('2d')!;
    if (opts.fixedP !== undefined) this.p = opts.fixedP;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.sync();
    });
    this.io.observe(canvas);
    this.resize();
  }

  private sync() {
    const want = this.visible && this.opts.animate && !document.hidden;
    if (want && !this.running) {
      this.running = true;
      const loop = () => { this.draw(); if (this.running) this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    } else if (!want && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
    if (!want && this.visible) this.draw();
  }

  resume() { this.sync(); }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    if (this.visible) this.draw();
  }

  setProgress(p: number) {
    this.p = p;
    if (!this.running && this.visible) this.draw();
  }

  draw() {
    const { ctx, w, h, dpr } = this;
    const time = this.opts.animate ? (performance.now() - this.t0) / 1000 : 9.5;
    const p = this.p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const zoom = smooth(0.05, 0.95, p); // 0 = orbit, 1 = inside parcel
    const zones = smooth(1.15, 1.85, p);

    // Camera: fit whole world -> fit target parcel (with padding).
    const fitWorld = Math.min(w, h) / WORLD * 1.05;
    const pad = 0.86;
    const fitTarget = Math.min((w * pad) / target.w, (h * pad) / target.h);
    const scale = Math.exp(lerp(Math.log(fitWorld), Math.log(fitTarget), zoom));
    const cx = lerp(WORLD / 2, target.x + target.w / 2, zoom);
    const cy = lerp(WORLD / 2, target.y + target.h / 2, zoom);
    const X = (x: number) => (x - cx) * scale + w / 2;
    const Y = (y: number) => (y - cy) * scale + h / 2;

    // Parcels (satellite patchwork)
    const parcelFade = 1 - smooth(0.55, 1.0, zoom) * 0.85;
    for (const pc of parcels) {
      if (pc === target) continue;
      const a = (0.05 + pc.v * 0.26) * parcelFade;
      ctx.fillStyle = `rgba(${TEXT},${a.toFixed(3)})`;
      ctx.fillRect(X(pc.x), Y(pc.y), pc.w * scale, pc.h * scale);
    }

    // Target parcel base
    const tx = X(target.x), ty = Y(target.y), tw = target.w * scale, th = target.h * scale;
    ctx.fillStyle = `rgba(${TEXT},${(0.12 + 0.14 * (1 - zoom)).toFixed(3)})`;
    ctx.fillRect(tx, ty, tw, th);

    // Graticule
    const gA = 0.16 * (1 - zoom);
    if (gA > 0.005) {
      ctx.strokeStyle = `rgba(${TEXT},${gA.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = 0; g <= WORLD; g += 125) {
        ctx.moveTo(X(g), 0); ctx.lineTo(X(g), h);
        ctx.moveTo(0, Y(g)); ctx.lineTo(w, Y(g));
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${TEXT},${(gA * 2.4).toFixed(3)})`;
      ctx.font = '500 10px "Chakra Petch", sans-serif';
      for (let g = 125; g < WORLD; g += 250) {
        const lat = (37.92 + (WORLD - g) / WORLD * 0.12).toFixed(3) + '°N';
        const lon = (23.66 + g / WORLD * 0.14).toFixed(3) + '°E';
        if (Y(g) - 6 > 40) ctx.fillText(lat, 8, Y(g) - 6);
        ctx.fillText(lon, X(g) + 6, h - 10);
      }
    }

    // Inside the parcel: rows, zones, tractor
    const rowsA = smooth(0.45, 1.0, zoom);
    const ROWS = 26;
    const rowGap = target.h / ROWS;
    const SEG = 96;
    if (rowsA > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx, ty, tw, th);
      ctx.clip();

      // Zone tint
      if (zones > 0.01) {
        const cell = target.w / SEG;
        for (let i = 0; i < SEG; i++) {
          for (let j = 0; j < ROWS; j++) {
            const lvl = zoneLevel(zoneAt((i + 0.5) / SEG, (j + 0.5) / ROWS));
            const a = [0.03, 0.09, 0.18][lvl] * zones;
            ctx.fillStyle = `rgba(${ACCENT},${a.toFixed(3)})`;
            ctx.fillRect(X(target.x + i * cell), Y(target.y + j * rowGap), cell * scale + 0.6, rowGap * scale + 0.6);
          }
        }
      }

      // Crop rows (dashed plants)
      ctx.strokeStyle = `rgba(${TEXT},${(0.42 * rowsA).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, rowGap * scale * 0.16);
      ctx.setLineDash([Math.max(1.5, rowGap * scale * 0.18), Math.max(2, rowGap * scale * 0.22)]);
      ctx.beginPath();
      for (let j = 0; j < ROWS; j++) {
        const y = Y(target.y + (j + 0.5) * rowGap);
        ctx.moveTo(tx, y); ctx.lineTo(tx + tw, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Tractor path (boustrophedon along rows, every 2nd row = implement width)
      const PASS = 2;
      const passes = Math.ceil(ROWS / PASS);
      const speed = 0.11; // parcel widths per second
      const total = passes;
      const s = (time * speed) % total;
      const passIdx = Math.floor(s);
      const f = s - passIdx;
      const passY = (k: number) => target.y + (k * PASS + PASS / 2) * rowGap;
      const passX = (k: number, frac: number) => (k % 2 === 0 ? target.x + frac * target.w : target.x + (1 - frac) * target.w);

      // Variable-rate trail
      if (zones > 0.01) {
        for (let k = 0; k <= passIdx; k++) {
          const end = k < passIdx ? 1 : f;
          const y = passY(k);
          for (let u = 0; u < end; u += 0.008) {
            const xw = passX(k, u);
            const lvl = zoneLevel(zoneAt((xw - target.x) / target.w, (y - target.y) / target.h));
            // Fewer dots where the crop is already vigorous, more where it needs it.
            const step = [1, 2, 4][lvl]; // dense = more fertilizer
            const idx = Math.round(u / 0.008);
            if (idx % step !== 0) continue;
            for (const off of [-0.5, 0.5]) {
              ctx.fillStyle = `rgba(${ACCENT},${(0.9 * zones).toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(X(xw), Y(y + off * rowGap), Math.max(1, rowGap * scale * 0.09), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Tractor + LiDAR fan
      const dir = passIdx % 2 === 0 ? 1 : -1;
      const trX = X(passX(passIdx, f));
      const trY = Y(passY(passIdx));
      const unit = rowGap * scale;
      const fanLen = unit * 7;
      const fanHalf = unit * 2.2;
      const grad = ctx.createLinearGradient(trX, trY, trX + dir * fanLen, trY);
      grad.addColorStop(0, `rgba(${ACCENT},${(0.55 * rowsA).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${ACCENT},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(trX + dir * unit * 0.6, trY);
      ctx.lineTo(trX + dir * fanLen, trY - fanHalf);
      ctx.lineTo(trX + dir * fanLen, trY + fanHalf);
      ctx.closePath();
      ctx.fill();
      // scan ticks inside the fan
      ctx.strokeStyle = `rgba(${ACCENT},${(0.7 * rowsA).toFixed(3)})`;
      ctx.lineWidth = 1;
      const sweep = (time * 1.6) % 1;
      ctx.beginPath();
      const sx = trX + dir * (unit * 0.6 + sweep * (fanLen - unit * 0.6));
      const sh = (fanHalf * (sx - trX) * dir) / fanLen;
      ctx.moveTo(sx, trY - sh); ctx.lineTo(sx, trY + sh);
      ctx.stroke();

      // body
      const bw = unit * 1.6, bh = unit * 1.15;
      ctx.fillStyle = BG;
      ctx.strokeStyle = `rgba(${TEXT},${rowsA.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.fillRect(trX - bw / 2, trY - bh / 2, bw, bh);
      ctx.strokeRect(trX - bw / 2, trY - bh / 2, bw, bh);
      ctx.fillStyle = `rgba(${ACCENT},${rowsA.toFixed(3)})`;
      ctx.fillRect(trX + dir * bw * 0.18 - unit * 0.18, trY - unit * 0.18, unit * 0.36, unit * 0.36);
      ctx.restore();
    }

    // Target bracket
    const bracketA = 1 - smooth(0.6, 1, zoom) * 0.4;
    ctx.strokeStyle = `rgba(${ACCENT},${bracketA.toFixed(3)})`;
    ctx.lineWidth = 1.5;
    const L = Math.min(18, tw * 0.25, th * 0.25);
    const o = 6;
    ctx.beginPath();
    ctx.moveTo(tx - o, ty - o + L); ctx.lineTo(tx - o, ty - o); ctx.lineTo(tx - o + L, ty - o);
    ctx.moveTo(tx + tw + o - L, ty - o); ctx.lineTo(tx + tw + o, ty - o); ctx.lineTo(tx + tw + o, ty - o + L);
    ctx.moveTo(tx + tw + o, ty + th + o - L); ctx.lineTo(tx + tw + o, ty + th + o); ctx.lineTo(tx + tw + o - L, ty + th + o);
    ctx.moveTo(tx - o + L, ty + th + o); ctx.lineTo(tx - o, ty + th + o); ctx.lineTo(tx - o, ty + th + o - L);
    ctx.stroke();

    // HUD label
    const view = p < 0.5 ? 'View / Orbit' : p < 1.5 ? 'View / Ground' : 'View / Zones';
    ctx.font = '500 11px "Chakra Petch", sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(view.toUpperCase().split('').join(' '), 14, 22);
    ctx.fillStyle = `rgb(${ACCENT})`;
    ctx.fillRect(w - 20, 15, 6, 6);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
  }
}
