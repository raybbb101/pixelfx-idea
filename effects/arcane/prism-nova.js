import { Particles, Bits, B, Lights, P, Rng, fit, hex, mix, flare, sparkle, clamp, ease, TAU, WHITE } from "../../core/index.js";

// A crystal prism forms in the air, a shaft of white light strikes it from above and it throws a sweeping
// rainbow fan across the floor in front of it; it overloads, cracks and bursts into spectral shards.
const CY = -36, FORM = 0.5, SPLIT = 0.62, CRACK = 1.38, BURST = 1.56, FAN = 52;

export const meta = {
  name: "Prism nova",
  desc: "A crystal prism forms in the air, catches a shaft of light and rakes a rainbow fan across the floor, then overloads, cracks and bursts into spectral shards.",
  tags: ["arcane", "prism", "rainbow", "light", "crystal", "spectrum", "burst", "magic", "ground", "one-shot"],
  size: [280, 160],
  origin: [112, 134],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0e1430", "#232e66", "#3f52a6", "#6c86da", "#a4bef6", "#d6e6ff", "#f4f8ff", "#ffffff"],
    spectrum: ["#ff3f5e", "#ff8a2e", "#ffd83a", "#4cf06a", "#36cfff", "#4a6cff", "#b64cff"],
    seed: 7,
  },
};

// the prism: a tall octahedron seen from the side, spinning about its vertical axis
function prism(p, x, y, s, spin, C, S, hot, crack) {
  const ht = 17 * s, hb = 12 * s, w = 9 * s;
  if (w < 0.6) return;
  const ridge = Math.sin(spin) * w * 0.8, back = Math.sin(spin + Math.PI / 2) * w * 0.8;
  const inside = (dx, dy) => Math.abs(dx) / w + (dy < 0 ? -dy / ht : dy / hb) <= 1;
  p.shade(x - w - 2, y - ht - 2, x + w + 2, y + hb + 2, (px, py, o) => {
    const dx = px - x, dy = py - y;
    if (!inside(dx, dy)) {
      if (inside(dx - 1, dy) || inside(dx + 1, dy) || inside(dx, dy - 1) || inside(dx, dy + 1)) return C[1];
      return;
    }
    if (hot >= 1) return WHITE;
    const v = dy < 0 ? -dy / ht : dy / hb, hw = w * (1 - v) || 1e-3, r = ridge * (1 - v), b = back * (1 - v);
    // faces: the lit one left of the ridge, the dark one right; the upper half catches more light
    let c = dx < r ? (dy < 0 ? C[5] : C[4]) : dy < 0 ? C[3] : C[2];
    if (Math.abs(dx - b) < 0.6 && Math.abs(b) < hw - 1) c = dy < 0 ? C[4] : C[3];
    if (Math.abs(dx - r) < 0.7) c = C[6];
    if (Math.abs(dx) > hw - 1) c = dx < 0 ? C[5] : C[2];
    if (Math.abs(dy) < 0.6) c = C[6];
    // refracted colour caught inside the crystal: a rainbow band sweeping down the dark faces
    if (dx >= r && Math.abs(dx) < hw - 1) {
      const band = (dx - r) / Math.max(1, hw - r) + spin * 0.3 + dy * 0.04;
      const i = Math.floor(((band % 1) + 1) % 1 * S.length);
      if ((((band * 3) % 1) + 1) % 1 < 0.45) c = mix(c, S[i], 0.55);
    }
    if (v > 0.86) c = WHITE;
    if (crack > 0) {
      // cracks run out from the heart as it overloads
      const ang = Math.atan2(dy, dx), d = Math.hypot(dx, dy / 1.6);
      for (let k = 0; k < 5; k++) {
        const ca = k * 1.37 + 0.4 + Math.sin(d * 0.7 + k) * 0.18;
        let da = Math.abs(((ang - ca + Math.PI) % TAU + TAU) % TAU - Math.PI);
        if (da * d < 0.7 && d < crack * (w + 6)) c = WHITE;
      }
    }
    if (hot > 0) c = mix(c, WHITE, hot);
    o.c = c;
  });
}

export function create(o) {
  const C = fit(o.palette, 8).map(hex), S = (o.spectrum ?? meta.options.spectrum).map(hex), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const bits = new Bits({ ground: () => 0 }), lights = new Lights();
  const glints = [];
  let t = 0, flashed = false, burst = false;

  return {
    update(dt) {
      t += dt;
      // forming: motes and streaks spiral in to the point the crystal grows from
      if (t < FORM - 0.05) {
        for (let i = 0; i < 2; i++) {
          const a = R.range(0, TAU), D = R.range(26, 50), T = R.range(0.16, 0.26), v = (D * 3) / (Math.exp(3 * T) - 1);
          const x = Math.cos(a) * D, y = Math.min(-4, CY + Math.sin(a) * D * 0.8), l = Math.hypot(x, y - CY) || 1;
          ps.spawn(P.STREAK, x, y, (-x / l) * v + (-(y - CY) / l) * v * 0.3, ((CY - y) / l) * v + (x / l) * v * 0.3, T, R.chance(0.5) ? C[6] : S[R.int(0, S.length - 1)]);
        }
      }
      if (t >= SPLIT && !flashed) {
        flashed = true;
        lights.add(0, CY, 70, C[5], 0.9, 0.4);
        lights.add(0, CY, 14, WHITE, 0.7, 0.06);
        for (let i = 0; i < 18; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 150);
          ps.spawn(P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp * (Math.sin(a) > 0 ? 0.35 : 0.7), R.range(0.25, 0.5), R.pick([WHITE, C[6], ...S]), R.range(0.8, 1.5));
        }
      }
      // the fan rakes the floor: each ray throws sparks and leaves a glint where it lands
      if (t >= SPLIT + 0.08 && t < CRACK) {
        const fan = fanAt(t);
        for (let i = 0; i < S.length; i++) {
          const hit = rayHit(fan, i, S.length);
          if (!hit || !R.chance(0.28)) continue;
          ps.spawn(P.SPARK, hit, -1, R.range(-30, 70), -R.range(60, 170), R.range(0.15, 0.35), S[i]);
          if (R.chance(0.3)) glints.push({ x: hit + R.range(-2, 2), t, c: S[i], life: R.range(0.5, 1.1) });
        }
      }
      if (t >= BURST && !burst) {
        burst = true;
        lights.add(0, CY, 110, C[5], 1, 0.6);
        lights.add(0, CY, 34, WHITE, 1, 0.12);
        // spectral shards: thrown out in every direction, fall, bounce once and lie glittering
        for (let i = 0; i < 34; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 190);
          bits.add({ kind: B.SHARD, x: R.range(-4, 4), y: CY + R.range(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 90, a: R.range(0, TAU), va: R.range(-24, 24), s: R.range(2, 4.5), c: R.chance(0.45) ? C[R.int(4, 6)] : S[i % S.length], g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.9, 1.3) });
        }
        for (let i = 0; i < 70; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 240);
          ps.spawn(R.chance(0.6) ? P.MOTE : P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp * (Math.sin(a) > 0 ? 0.35 : 0.8), R.range(0.25, 0.6), R.pick([WHITE, C[6], ...S]), R.range(0.8, 1.8));
        }
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(120, 240);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.2, 0.45));
        }

      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a cold pool of light on the floor under the crystal
      const k = t < SPLIT ? 0.5 * clamp(t / FORM) : Math.max(0, 1 - (t - SPLIT) / 1.6);
      if (k > 0) {
        p.glow(0, -1, 40, C[4], 0.35 * k);
        p.ellipse(0, 1, 10 * k + 2, 2, C[1], 0.5 * k);
      }
    },
    draw(p) {
      const spin = t * 5.5;
      // the shaft of white light from above: it bores in, holds, and thins as the prism cracks
      const sh = t < SPLIT - 0.06 ? 0 : t < SPLIT ? (t - SPLIT + 0.06) / 0.06 : t < CRACK ? 1 : Math.max(0, 1 - (t - CRACK) / 0.18);
      if (sh > 0) {
        const top = -131, tip = CY - 16, w = t < SPLIT + 0.06 ? 5 : 3 + Math.sin(t * 40) * 0.6;
        const y1 = t < SPLIT ? top + (tip - top) * sh : tip;
        p.beam(-38, top, -2, y1, w * sh, (u, v) => (v < 0.45 ? WHITE : C[6]), sh);
        p.glowLine(-34, top + 6, -2, y1, 8, C[5], 0.45 * sh);
      }
      // the rainbow fan: seven rays leave the crystal's right face and sweep along the floor
      if (t >= SPLIT && t < CRACK + 0.2) {
        const fade = t < CRACK ? 1 : 1 - (t - CRACK) / 0.2, fan = fanAt(t), n = S.length;
        for (let i = 0; i < n; i++) {
          const a = fan.a0 + fan.spread * (i - (n - 1) / 2), L = fan.len, x0 = 6, y0 = CY + 1;
          let x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
          if (y1 > 0) { const k = (0 - y0) / (y1 - y0); x1 = x0 + (x1 - x0) * k; y1 = 0; }
          const flick = 0.5 + 0.5 * Math.sin(t * 50 + i * 2.1);
          p.beam(x0, y0, x1, y1, 2 + flick * 0.8, (u) => (u < 0.08 ? WHITE : S[i]), (u) => fade * (u > 0.85 ? 1 - (u - 0.85) / 0.25 : 1));
          p.glowLine(x0, y0, x1, y1, 5, S[i], 0.22 * fade);
          if (y1 >= 0) {
            p.ellipse(x1, 0, 4, 1.2, mix(S[i], WHITE, 0.4), fade);
            p.glow(x1, -1, 9, S[i], 0.5 * fade);
          }
        }
      }
      // the crystal: grows from a point, spins, overloads and is gone at the burst
      if (t < BURST) {
        const s = t < FORM ? ease.outBack ? ease.outBack(clamp(t / FORM)) : ease.outCubic(clamp(t / FORM)) : 1;
        const bob = Math.sin(t * 6) * 1.2 * clamp(t / FORM);
        const hot = t < FORM ? (t > FORM - 0.05 ? 1 : 0) : t >= SPLIT && t < SPLIT + 0.05 ? 1 : t > CRACK ? clamp((t - CRACK) / (BURST - CRACK)) * 0.85 : 0;
        const crack = t > CRACK ? clamp((t - CRACK) / (BURST - CRACK - 0.04)) : 0;
        const sh = t > CRACK ? Math.round(Math.sin(t * 90) * 1.2 * crack) : 0;
        prism(p, sh, CY + bob, s, spin, C, S, hot, crack);
        p.glow(0, CY, 22 + 10 * s, C[4], s * 0.16 + 0.5 * (t > CRACK ? crack : 0));
        if (t > SPLIT) sparkle(p, -4, CY - 6 + bob, 2 + 2 * (0.5 + 0.5 * Math.sin(t * 13)), WHITE, C[6], 0.6);
      } else {
        const q = (t - BURST) / 0.5;
        if (q < 1) {
          const e = ease.outCubic(q);
          if (q < 0.1) p.circle(0, CY, 14 * (1 - q / 0.1) + 2, WHITE);
          if (q < 0.4) flare(p, 0, CY, 36 * (1 - q / 0.4) + 4, 1 - q / 0.4, C);
          // a ring that splits into the spectrum as it grows
          for (let i = 0; i < 3; i++) {
            const r = 4 + (60 - i * 9) * e;
            p.ring(0, CY, r, Math.max(1, 3 * (1 - q)), q < 0.18 ? WHITE : S[[0, 3, 5][i]], (v, ang) => (CY + Math.sin(ang) * r > 0 ? 0 : 1.1 - q));
          }
          p.glow(0, CY, 70 * (0.4 + 0.6 * e), C[5], 0.8 * (1 - q));
        }
      }
      // glints left on the floor where the rays raked it
      for (const g of glints) {
        const k = (t - g.t) / g.life;
        if (k >= 1) continue;
        const tw = Math.sin((t - g.t) * 22) > 0.2;
        p.dot(g.x, -1, tw ? WHITE : g.c, 1 - k);
        if (tw && k < 0.6) sparkle(p, g.x, -2, 2, g.c, WHITE, 0.4 * (1 - k));
        p.glow(g.x, -1, 4, g.c, 0.3 * (1 - k));
      }
      bits.draw(p);
      for (const b of bits.list) if (b.rest && Math.sin(t * 17 + b.x) > 0.7) p.light(b.x, b.y - 1, hex(b.c), 0.6 * Math.min(1, b.life / 0.4));
      ps.draw(p);
      lights.draw(p);
    },
  };
}

// the fan opens out, then its aim drops and sweeps from near the feet out to the far floor
function fanAt(t) {
  const u = clamp((t - SPLIT) / (CRACK - SPLIT)), open = ease.outCubic(clamp((t - SPLIT) / 0.14));
  return { a0: 0.68 - 0.26 * ease.inOutSine(u), spread: 0.06 * open, len: 20 + FAN * 3.2 * open };
}
function rayHit(fan, i, n) {
  const a = fan.a0 + fan.spread * (i - (n - 1) / 2), y0 = CY + 1, s = Math.sin(a);
  if (s <= 0) return null;
  const d = -y0 / s;
  return d <= fan.len ? 6 + Math.cos(a) * d : null;
}
