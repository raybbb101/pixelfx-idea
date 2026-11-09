import { Particles, Lights, P, Rng, hex, mix, luma, flare, sparkle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { clip } from "../weather/_lib.js";

// An enemy chimera: a traffic light on an octopus. It scuttles in on eight rippling tentacles and skids to a
// stop; its yellow lamp blinks a warning, then its red lamp blazes STOP and sweeps a red beam over the hero, who
// freezes, drained grey-red and shivering. Two tentacles lash out, coil round the hero and lift them to the
// green lamp, which stretches open into a fanged mouth and swallows them whole; a lump climbs the housing,
// flickering each lamp as it passes, the green glows GO, it burps, and it scuttles away.
const RUN_END = 1.15, WARN = 1.25, FREEZE = 1.62, GRAB = 2.75, LIFT = 3.15, OPEN = 3.45, GULP = 4.05, SHUT = 4.25, GO = 4.75, LEAVE = 5.45, D = 6.9;
const STOP_X = 80, LAMP = [-92, -71, -50], LR = 8.5, HW = 16;

export const meta = {
  name: "Signal kraken",
  desc: "A traffic-light octopus scuttles in, blinks yellow, stares red to freeze the hero, coils its tentacles round them and swallows them whole through its green lamp.",
  tags: ["critters", "enemy", "monster", "chimera", "octopus", "tentacles", "traffic-light", "freeze", "grab", "swallow", "actor", "one-shot"],
  size: [330, 168],
  origin: [64, 150],
  duration: D,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { flesh: ["#24092e", "#4e1a5e", "#7e3290", "#b25cc0", "#e09ae0"], housing: ["#101418", "#222c34", "#38464f", "#56666f", "#7e8e96"], seed: 3 },
};

// the hero is swapped for a copy we can freeze, lift and swallow from the moment the red light hits
export const actorAlpha = (t) => (t < FREEZE ? 1 : 0);

const H = (a) => a.map(hex);
const RED = H(["#2a0606", "#7a1010", "#e02a20", "#ff7a60", "#ffd8cc"]);
const YEL = H(["#2a2006", "#7a5a0c", "#f0b820", "#ffe070", "#fff8d0"]);
const GRN = H(["#04200e", "#0c6a2e", "#22d060", "#8affa8", "#e0ffe8"]);
const INK = hex("#0a0610"), SUCK = hex("#f4c0e8"), HAZ = hex("#f0c020");

export function create(o) {
  const FL = H(o.flesh), HS = H(o.housing), R = new Rng(o.seed), A = o.actor;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, RED[3], RED[2], RED[1]] }), lights = new Lights();
  const done = new Set();
  let t = 0;
  const once = (k, tt) => (t >= tt && !done.has(k) ? (done.add(k), true) : false);

  // where its body is, how fast it is scuttling, how it leans
  const bodyX = () => {
    if (t < RUN_END) return STOP_X + 200 * (1 - ease.outCubic(t / RUN_END));
    if (t < LEAVE) return STOP_X - 3 * Math.sin(Math.PI * clamp((t - WARN) / 0.3)) * (t < 1.6 ? 1 : 0);
    return STOP_X + 260 * ease.inCubic(clamp((t - LEAVE) / (D - 0.2 - LEAVE)));
  };
  const running = () => t < RUN_END + 0.05 || t > LEAVE;
  // the lamps: how lit each is (red, yellow, green)
  const lamps = () => {
    const blink = (a, b) => (t > a && t < b ? 1 : 0);
    let r = 0.15, y = 0.15, g = 0.4;
    if (t < RUN_END) g = 0.75 + 0.25 * Math.sin(t * 20);
    y = Math.max(y, blink(WARN, WARN + 0.12), blink(WARN + 0.22, WARN + 0.34));
    if (t > FREEZE - 0.06 && t < GRAB + 0.3) r = 1;
    if (t > GULP + 0.1 && t < GO) {
      // the lump passes each lamp in turn
      const u = (t - GULP - 0.1) / (GO - GULP - 0.1);
      g = Math.abs(u - 0.15) < 0.12 ? 1 : 0.2;
      y = Math.abs(u - 0.5) < 0.12 ? 1 : y;
      r = Math.abs(u - 0.85) < 0.12 ? 1 : r;
    }
    if (t >= GO && t < LEAVE + 0.3) g = 0.85 + 0.15 * Math.sin(t * 12);
    if (t >= LEAVE + 0.3) g = 0.7;
    return [r, y, g];
  };
  // how far the green mouth is open; the lump's height in the housing
  const mouth = () => (t < OPEN ? 0 : t < GULP ? ease.outBack(clamp((t - OPEN) / 0.22), 1.6) : 1 - ease.inCubic(clamp((t - GULP) / (SHUT - GULP))));
  const lump = () => (t > SHUT - 0.05 && t < GO ? (t - SHUT + 0.05) / (GO - SHUT + 0.05) : -1);

  // the hero's copy: where it is, how big, how frozen
  const hero = () => {
    if (t < FREEZE) return null;
    const bx = bodyX(), mx = bx - 1, my = LAMP[2];
    let x = 0, y = 0, s = 1;
    if (t > LIFT) {
      const k = ease.inOutSine(clamp((t - LIFT) / (OPEN + 0.15 - LIFT)));
      x = (mx - 24) * k;
      y = (my + 20) * k + Math.sin(t * 40) * (t < OPEN ? 0.8 : 0);
    }
    if (t > OPEN + 0.15) {
      const k = ease.inCubic(clamp((t - OPEN - 0.15) / (GULP - OPEN - 0.15)));
      x += (mx - 6 - x) * k;
      y += (my + 4 - y) * k;
      s = 1 - 0.95 * k;
    }
    if (t >= GULP) return null;
    const shiver = t < GRAB ? Math.round(Math.sin(t * 70) * 0.6) : 0;
    return { x: x + shiver, y, s };
  };

  // one tentacle from its base to its tip through a bend: an outline, a shaded body, a lit stripe, suckers
  const tentacle = (p, x0, y0, cx, cy, x1, y1, r0, r1, curl, back = false) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u;
      pts.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]);
    }
    // the tip curls over
    const [lx, ly] = pts[10], [px, py] = pts[9], dir = Math.atan2(ly - py, lx - px);
    for (let i = 1; i <= 3; i++) {
      const a = dir + curl * i * 0.7;
      pts.push([pts[pts.length - 1][0] + Math.cos(a) * 1.6, pts[pts.length - 1][1] + Math.sin(a) * 1.6]);
    }
    const n = pts.length - 1, F = back ? FL.map((cc) => mix(cc, FL[0], 0.35)) : FL;
    for (let i = 1; i <= n; i++) p.beam(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2 * (r0 + (r1 - r0) * (i / n)) + 2, INK);
    for (let i = 1; i <= n; i++) {
      const r = r0 + (r1 - r0) * (i / n);
      p.beam(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2 * r, F[2]);
      p.beam(pts[i - 1][0] - r * 0.3, pts[i - 1][1] - r * 0.35, pts[i][0] - r * 0.3, pts[i][1] - r * 0.35, Math.max(1, r * 0.7), F[3]);
      if (!back && i % 2 === 0 && r > 1.4) {
        const [ax, ay] = pts[i], [bx2, by2] = pts[i - 1], nx = ay - by2, ny = -(ax - bx2), l = Math.hypot(nx, ny) || 1;
        p.dot(ax - (nx / l) * r * 0.55, ay - (ny / l) * r * 0.55, SUCK);
      }
    }
    return pts;
  };

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120), bx = bodyX();
      // dust kicked up by the scuttling tentacles, and a skid as it stops
      if (running() && t < D - 0.6 && R.chance(0.5 * f)) ps.spawn(P.DUST, bx + R.range(-20, 20), -1, (t > LEAVE ? -1 : 1) * R.range(20, 50), -R.range(4, 12), Math.min(R.range(0.3, 0.5), D - 0.1 - t), FL[1], R.range(1.5, 2.5));
      if (once("skid", RUN_END - 0.12)) for (let i = 0; i < 8; i++) ps.spawn(P.DUST, bx - R.range(4, 16), -1, -R.range(20, 60), -R.range(6, 16), R.range(0.4, 0.7), FL[1], R.range(2, 3.4));
      if (once("stop", FREEZE)) {
        lights.add(bx, LAMP[0], 70, RED[2], 0.9, 0.4);
        lights.add(0, -22, 40, RED[3], 0.7, 0.3);
      }
      // the frozen hero sheds a few red sparks; the coils squeeze
      if (t > FREEZE && t < GRAB && R.chance(0.15 * f)) ps.spawn(P.STAR, R.range(-10, 10), -R.range(6, 36), 0, -10, 0.4, RED[3], 1);
      if (once("snap", GRAB + 0.18)) for (let i = 0; i < 8; i++) ps.spawn(P.SPARK, R.range(-6, 6), -R.range(10, 30), R.range(-60, 60), -R.range(20, 80), R.range(0.12, 0.25));
      if (once("gulp", GULP)) {
        lights.add(bx, LAMP[2], 50, GRN[2], 0.8, 0.3);
        for (let i = 0; i < 10; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 90);
          ps.spawn(P.STAR, bx - 2, LAMP[2], Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), R.pick([GRN[3], WHITE]), 1);
        }
      }
      if (once("go", GO)) lights.add(bx, LAMP[2], 60, GRN[2], 0.8, 0.5);
      if (once("burp", GO + 0.25)) for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, bx - 10, LAMP[2] - 2, -R.range(15, 30), -R.range(8, 18), R.range(0.6, 0.9), FL[2], R.range(2.2, 3.4), i * 0.05);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p0) {
      const p = clip(p0, meta), bx = bodyX(), [lr] = lamps();
      // a red pool on the floor while it stares
      if (lr > 0.9) p.glow(0, -2, 40, RED[2], 0.25);
      p.ellipse(bx, 0, 30, 3.5, INK, 0.5);
    },
    draw(p0) {
      const p = clip(p0, meta), bx = bodyX(), [lr, ly, lg] = lamps(), m = mouth(), run = running();
      const ph = t * (t > LEAVE ? 16 : 18), bob = run ? Math.abs(Math.sin(ph)) * -3 : Math.sin(t * 3) * 0.8;
      const lean = run ? (t > LEAVE ? 4 : -4) : t > WARN && t < FREEZE ? -3 : 0;
      const by = -26 + bob;

      // the back tentacles, then the front ones: scuttling in a wave while it runs, splayed while it stands
      const legs = (back) => {
        for (let k = 0; k < 8; k++) {
          if ((k % 2 === 0) !== back) continue;
          if (!back && (k === 1 || k === 3) && t > GRAB - 0.05 && t < GULP) continue;
          const s = (k - 3.5) / 3.5, x0 = bx + s * 15, y0 = by + 8, step = run ? Math.sin(ph + k * 1.7) : 0;
          const tx = bx + s * 34 + step * 9 + Math.sin(t * 2 + k) * 1.5, ty = run ? -Math.max(0, Math.cos(ph + k * 1.7)) * 8 : 0;
          tentacle(p, x0, y0, x0 + s * 13, y0 + 12, tx, ty, 4.6, 1.4, s < 0 ? 0.7 : -0.7, back);
        }
      };
      legs(true);
      // the mantle: a soft round body under the housing, spotted, lit on top
      p.ellipse(bx, by + 1, 23.5, 16, INK);
      p.shade(bx - 23, by - 16, bx + 23, by + 17, (x, y) => {
        const u = (x - bx) / 22.5, v = (y - by - 1) / 15, d = u * u + v * v;
        if (d > 1) return;
        const lit = -u * 0.4 - v * 0.8, spot = ((x * 7 + y * 13) % 41 + 41) % 41 < 1 && lit > -0.3;
        return spot ? FL[4] : lit > 0.55 ? FL[3] : lit > -0.2 ? FL[2] : FL[1];
      });
      legs(false);

      // the housing: a slate box with a hazard-striped collar, three hooded lamps; it bulges as the lump climbs
      const hx = bx + lean, top = -108 + bob, bot = by - 8, L = lump();
      const halfW = (y) => HW + (L >= 0 ? 6 * Math.exp(-(((y - (LAMP[2] + (LAMP[0] - LAMP[2]) * L + bob)) / 8) ** 2)) : 0) + (m > 0 && Math.abs(y - LAMP[2] - bob) < 18 ? 7 * m * (1 - Math.abs(y - LAMP[2] - bob) / 18) : 0);
      for (let y = Math.floor(top); y < bot; y++) {
        const w = halfW(y), round = y < top + 4 ? 4 - (y - top) : 0, x0 = Math.round(hx - w + round), x1 = Math.round(hx + w - round);
        p.rect(x0 - 1, y, x1 - x0 + 2, 1, INK);
        p.rect(x0, y, x1 - x0, 1, HS[2]);
        p.rect(x0, y, 2, 1, HS[3]);
        p.rect(x1 - 3, y, 3, 1, HS[1]);
      }
      p.rect(Math.round(hx - HW + 2), Math.floor(top) - 1, 2 * HW - 4, 1, INK);
      for (let x = -HW; x < HW; x++) for (let y = 0; y < 5; y++) p.px(hx + x, bot - 5 + y, ((x + y) & 4) ? HAZ : INK);
      // the lamps: dark glass when off, bright and glowing when lit, a hood over each
      [[RED, lr, 0], [YEL, ly, 1], [GRN, lg, 2]].forEach(([C, k, i]) => {
        const cy = LAMP[i] + bob;
        if (i === 2 && m > 0.02) return;
        p.circle(hx, cy, LR + 1, INK);
        p.shade(hx - LR, cy - LR, hx + LR, cy + LR, (x, y) => {
          const u = (x - hx) / LR, v = (y - cy) / LR, d = u * u + v * v;
          if (d > 1) return;
          const lit = k > 0.5, base = lit ? (d > 0.75 ? C[2] : d > 0.3 ? C[3] : C[4]) : d > 0.6 ? C[0] : C[1];
          return (u + 0.35) ** 2 + (v + 0.4) ** 2 < 0.05 ? WHITE : base;
        });
        if (k > 0.3) p.glow(hx, cy, 18 + 10 * k, C[2], 0.55 * k);
        p.arc(hx, cy, LR + 1.5, 2, Math.PI * 1.05, Math.PI * 1.95, HS[0]);
      });
      // the mouth: the green lamp stretched open, a dark throat, a ring of teeth, a glowing green rim
      if (m > 0.02) {
        const cy = LAMP[2] + bob, r = LR + 10 * m;
        p.circle(hx, cy, r + 1.5, INK);
        p.circle(hx, cy, r + 0.5, GRN[2]);
        p.shade(hx - r, cy - r, hx + r, cy + r, (x, y) => {
          const d = Math.hypot(x - hx, y - cy) / (r - 0.5);
          if (d > 1) return;
          return d > 0.8 ? GRN[1] : d > 0.55 ? hex("#06301a") : INK;
        });
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a), w = 0.26;
          p.tri(hx + Math.cos(a - w) * (r - 0.5), cy + Math.sin(a - w) * (r - 0.5), hx + Math.cos(a + w) * (r - 0.5), cy + Math.sin(a + w) * (r - 0.5), hx + c * (r - 5 * m), cy + s * (r - 5 * m), WHITE);
        }
        p.glow(hx, cy, r + 10, GRN[2], 0.5 * m);
      }

      // the stare: a red beam from the top lamp sweeping onto the hero
      if (t > FREEZE - 0.05 && t < GRAB + 0.1) {
        const k = clamp((t - FREEZE + 0.05) / 0.15) * (1 - clamp((t - GRAB) / 0.1)), sw = Math.sin((t - FREEZE) * 6) * 4;
        for (let i = -2; i <= 2; i++) p.line(hx - LR, LAMP[0] + bob, 4 + i * 5 + sw, -30 + Math.abs(i) * 6, RED[2 + (i === 0 ? 1 : 0)], (u) => k * (0.9 - u * 0.5) * (i === 0 ? 1 : 0.6));
        p.glowLine(hx - LR, LAMP[0] + bob, 2 + sw, -24, 14, RED[2], 0.35 * k);
      }

      // the hero: frozen grey-red and shivering, coiled, lifted and swallowed
      const hr = hero();
      if (hr && A) {
        const fz = (c) => {
          const l = luma(c);
          return mix(l > 0.6 ? hex("#e8c8c8") : l > 0.35 ? hex("#a07878") : hex("#4a2a32"), RED[2], 0.18);
        };
        const flash = t < FREEZE + 0.06;
        drawCopy(p, A, hr.x, hr.y, hr.s, flash ? () => WHITE : fz);
        if (t < LIFT) {
          // a stop sign over its head
          const k = ease.outBack(clamp((t - FREEZE) / 0.2)), sy = A.y - 12;
          if (k > 0.05) stopSign(p, hr.x, sy, 6 * k);
        }
      }
      // the grabbing tentacles: they lash out, coil round the hero and carry them up
      if (t > GRAB - 0.05 && t < GULP && hr) {
        const k = ease.outCubic(clamp((t - GRAB + 0.05) / 0.2)), cx = hr.x, cyc = hr.y + A.y + A.h * 0.55 * hr.s;
        for (const [side, dy] of [[1, -6], [3, 6]]) {
          const s = (side - 3.5) / 3.5, x0 = bx + s * 15, y0 = by + 8;
          const ex = x0 + (cx + 8 * hr.s - x0) * k, ey = y0 + (cyc + dy * hr.s - y0) * k;
          tentacle(p, x0, y0, (x0 + ex) / 2, Math.min(y0, ey) - 12, ex, ey, 4.2, 1.8, 0, false);
          // the coil wrapped round the body
          if (k > 0.95) {
            const rx = 9 * hr.s + 1, ry = 3 * hr.s + 1, yy = cyc + dy * hr.s;
            p.arc(cx, yy, rx, Math.max(1, 2.6 * hr.s), Math.PI * 0.05, Math.PI * 0.95, FL[2]);
            p.arc(cx, yy - 0.5, rx, 1, Math.PI * 0.15, Math.PI * 0.85, FL[3]);
            p.dot(cx - rx + 1, yy, SUCK);
          }
        }
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}

// the hero's pixels at offset (dx, dy), scaled about their middle by s, each recoloured by col
function drawCopy(p, A, dx, dy, s, col) {
  const m = A.mask, cx = A.x + A.w / 2, cy = A.y + A.h / 2, w = Math.max(1, Math.ceil(A.w * s)), h = Math.max(1, Math.ceil(A.h * s));
  const ox = Math.round(cx + dx - w / 2), oy = Math.round(cy + dy - h / 2);
  for (let Y = 0; Y < h; Y++)
    for (let X = 0; X < w; X++) {
      const i = Math.min(A.w - 1, Math.floor(X / s)), j = Math.min(A.h - 1, Math.floor(Y / s)), q = j * A.w + i;
      if (!m.data[q]) continue;
      p.px(ox + X, oy + Y, col(A.pixels ? A.pixels[q] || INK : INK));
    }
}

// a little octagonal stop sign: red with a white rim and a white bar
function stopSign(p, x, y, r) {
  const pts = Array.from({ length: 8 }, (_, i) => [x + Math.cos((i + 0.5) * (TAU / 8)) * r, y + Math.sin((i + 0.5) * (TAU / 8)) * r]);
  p.poly(pts.map(([a, b]) => [x + (a - x) * 1.25, y + (b - y) * 1.25]), WHITE);
  p.poly(pts, RED[2]);
  p.rect(x - r * 0.6, y - 0.5, r * 1.2, 1.5, WHITE);
  p.glow(x, y, r * 2.5, RED[2], 0.4);
}
