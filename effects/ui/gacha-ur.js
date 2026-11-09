import { Particles, Lights, P, Rng, PAL, fit, hex, mix, flare, sparkle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { spell, drawWord } from "./_lib.js";

// A gacha pull that lands an Ultra Rare: candy light gathers into a mystery card, it shakes as its aura climbs
// from white to gold and then cracks into a candy rainbow, it bursts and flips to show a candy holographic UR
// card; UR drops in over it, rays turn behind it, candy confetti rains, a shine sweeps it, then it pops away.
const CW = 36, CH = 52, CY = -6;
const FORM = 0.45, SOLID = 0.75, GOLD = 1.05, RAINBOW = 1.4, BURST = 1.9, FLIP1 = 2.2, URIN = 2.25, OUT = 3.75, D = 4.4;

export const meta = {
  name: "Gacha UR",
  desc: "Candy light gathers into a card that shakes as its aura climbs white, gold, then candy rainbow; it bursts and flips to an Ultra Rare holo card, UR drops in, confetti rains.",
  tags: ["ui", "gacha", "card", "reveal", "reward", "rare", "rainbow", "candy", "loot", "one-shot"],
  size: [208, 222],
  origin: [104, 118],
  duration: D,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: PAL.candy, text: "UR", seed: 11 },
};

const INK = hex("#2a0c34"), BACK = ["#120c30", "#1e1650", "#2e2478", "#5a4cc0", "#a898ff"].map(hex);
const ART = ["#ffe0f4", "#f8cdf2", "#e8c0ff", "#d0b6ff"].map(hex), GOLDC = ["#7a4a0c", "#c8861c", "#f5c043", "#fff0a0"].map(hex);

// a 5-point star test, r its outer radius
function inStar(x, y, r) {
  const a = Math.atan2(y, x) + Math.PI / 2, d = Math.hypot(x, y), k = (((a / TAU) * 5) % 1 + 1) % 1;
  const edge = r * (0.48 + 0.52 * Math.abs(k - 0.5) * 2);
  return d < edge ? d / edge : -1;
}

// one card cell (u 0..35, v 0..51); face or back; K the candy ramp; sh the holo shift; sw the shine position
function cell(u, v, face, K, sh, sw) {
  if (u === 0 || u === CW - 1 || v === 0 || v === CH - 1) return INK;
  const ring = Math.min(u, v, CW - 1 - u, CH - 1 - v);
  if (!face) {
    if (ring === 1) return hex("#ff8ad8");
    if (ring === 2) return BACK[3];
    const dx = u + 0.5 - CW / 2, dy = v + 0.5 - CH / 2, dm = Math.abs(dx) + Math.abs(dy) * 0.7;
    if (dm > 9.5 && dm < 10.6) return BACK[4];
    if (dm <= 9.5) return dm < 7 ? BACK[2] : BACK[1];
    return (u + v) % 4 === 0 && (u - v) % 4 === 0 ? BACK[2] : v < CH / 2 ? BACK[1] : BACK[0];
  }
  let c;
  if (ring <= 3) {
    // the holo frame: candy stripes running diagonally, lit on the outside, deep on the inside
    const n = K.length, h = Math.floor(((u + v) / 3 + sh) % n + n) % n;
    c = ring === 1 ? mix(K[h], WHITE, 0.45) : ring === 2 ? K[h] : mix(K[h], INK, 0.3);
  } else if (ring === 4) c = hex("#fff4fb");
  else if (v >= 39 && v <= 46) {
    // the rarity plate: five candy stars on white
    if (v === 39 || v === 46) c = hex("#f0c8e8");
    else {
      c = hex("#fffafd");
      for (let s = 0; s < 5; s++) {
        const sx = 8.5 + s * 5, s0 = inStar(u + 0.5 - sx, v + 0.5 - 42.8, 2.6);
        if (s0 >= 0) c = s0 < 0.45 ? mix(K[(s * 2) % K.length], WHITE, 0.5) : K[(s * 2) % K.length];
      }
    }
  } else if (v === 38) c = INK;
  else {
    // the art: a pastel sky with light stripes, a big rainbow candy star in the middle, sparkles
    const ax = u + 0.5 - CW / 2, ay = v + 0.5 - 21.5, s0 = inStar(ax, ay, 12.5), s1 = inStar(ax, ay, 14);
    if (s0 >= 0) {
      const a = Math.atan2(ay, ax), h = Math.floor(((a / TAU + 1) * K.length + sh * 0.5) % K.length);
      c = s0 < 0.3 ? WHITE : s0 < 0.55 ? mix(K[h], WHITE, 0.55) : K[h];
      if (ax + ay < -6 && s0 > 0.55) c = mix(c, WHITE, 0.3);
    } else if (s1 >= 0) c = INK;
    else {
      c = ART[Math.min(3, Math.floor((v - 5) / 8.5))];
      if (((u - v) & 7) === 0) c = mix(c, WHITE, 0.5);
      for (const [px, py] of [[8, 9], [28, 11], [9, 32], [27, 31]])
        if ((u === px && Math.abs(v - py) <= 1) || (v === py && Math.abs(u - px) <= 1)) c = u === px && v === py ? WHITE : K[(px + py) % K.length];
    }
  }
  // the shine sweeping across
  if (sw !== null) {
    const d = Math.abs(u - v * 0.55 - sw);
    if (d < 1.2) c = mix(c, WHITE, 0.85);
    else if (d < 2.6) c = mix(c, WHITE, 0.35);
  }
  return c;
}

// the card at (cx, cy), scale s, width factor sx (1 face-on, < 0 the other side), white 0..1
function card(p, cx, cy, s, sx, faceUp, K, sh, sw, white = 0, a = 1) {
  const w = Math.max(Math.abs(sx), 0.06), hw = (CW / 2) * s * w, hh = (CH / 2) * s, face = sx < 0 ? !faceUp : faceUp;
  p.shade(cx - hw - 1, cy - hh - 1, cx + hw + 1, cy + hh + 1, (x, y, o) => {
    let u = (x - cx) / (s * w) + CW / 2;
    const v = (y - cy) / s + CH / 2;
    if (u < 0 || u >= CW || v < 0 || v >= CH) return;
    if (sx < 0) u = CW - u;
    if (w < 0.1) return WHITE;
    let c = cell(Math.floor(u), Math.floor(v), face, K, sh, sw);
    if (white > 0) c = mix(c, WHITE, white);
    // turning away from us darkens it a little
    if (w < 0.9) c = mix(c, INK, (0.9 - w) * 0.4);
    o.a = a;
    return c;
  });
}

export function create(o) {
  const K = fit(o.palette, 7).map(hex), R = new Rng(o.seed), word = spell(o.text ?? "UR");
  const ps = new Particles({ rng: R, sparks: [WHITE, K[2], K[6], K[4]] }), lights = new Lights();
  const confetti = [];
  let t = 0, formed = false, golded = false, rainbowed = false, burst = false, out = false;

  const shake = () => (t > SOLID + 0.2 && t < BURST ? Math.sin(t * 70) * (0.4 + 2.2 * smooth(SOLID, BURST, t)) : 0);
  const scaleAt = () => (t < FORM ? 0 : t < SOLID ? ease.outBack(clamp((t - FORM) / (SOLID - FORM))) : t < BURST ? 1 + 0.04 * Math.sin(t * 9) * smooth(GOLD, BURST, t) : t < FLIP1 ? 1 + 0.25 * Math.sin(Math.PI * clamp((t - BURST) / (FLIP1 - BURST))) : 1);
  const outK = () => ease.inBack(clamp((t - OUT) / 0.35));

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      // candy streaks rush in to where the card will be
      if (t < FORM && R.chance(0.7 * f)) {
        const a = R.range(0, TAU), d = R.range(50, 80), x = Math.cos(a) * d, y = CY + Math.sin(a) * d, T = R.range(0.16, 0.24), v = (d * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, x, y, (-x / d) * v, (-(y - CY) / d) * v, T, R.pick(K));
      }
      if (!formed && t >= FORM) {
        formed = true;
        lights.add(0, CY, 60, WHITE, 0.6, 0.25);
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 100);
          ps.spawn(P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), R.pick([WHITE, ...K]), 1);
        }
      }
      // as it charges: sparks pulled in, faster as the rarity climbs
      if (t > SOLID && t < BURST && R.chance((t < GOLD ? 0.2 : t < RAINBOW ? 0.4 : 0.8) * f)) {
        const a = R.range(0, TAU), d = R.range(40, 64), x = Math.cos(a) * d, y = CY + Math.sin(a) * d;
        ps.spawn(P.STREAK, x, y, -x * 4, -(y - CY) * 4, R.range(0.18, 0.25), t < GOLD ? WHITE : t < RAINBOW ? GOLDC[2] : R.pick(K));
      }
      if (!golded && t >= GOLD) {
        golded = true;
        lights.add(0, CY, 70, GOLDC[2], 0.6, 0.3);
      }
      if (!rainbowed && t >= RAINBOW) {
        rainbowed = true;
        lights.add(0, CY, 80, K[6], 0.7, 0.3);
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 140);
          ps.spawn(P.SPARK, Math.cos(a) * 16, CY + Math.sin(a) * 24, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.3), R.pick(K));
        }
      }
      if (!burst && t >= BURST) {
        burst = true;
        lights.add(0, CY, 120, WHITE, 0.9, 0.5);
        lights.add(0, CY, 40, WHITE, 1, 0.1);
        for (let i = 0; i < 40; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 220);
          ps.spawn(R.chance(0.5) ? P.STAR : P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.6), R.pick([WHITE, ...K]), R.range(1, 1.8));
        }
        // candy confetti: thrown up and out, then fluttering down, flipping as it spins
        for (let i = 0; i < 70; i++) {
          const a = R.range(-Math.PI, 0) + R.range(-0.3, 0.3), sp = R.range(80, 210);
          confetti.push({ x: R.range(-8, 8), y: CY + R.range(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, c: K[i % K.length], ph: R.range(0, TAU), vs: R.range(8, 16), sw: R.range(0, TAU), long: R.chance(0.5), life: R.range(1.8, D - BURST - 0.1) });
        }
      }
      for (let i = confetti.length - 1; i >= 0; i--) {
        const q = confetti[i];
        if ((q.life -= dt) <= 0 || q.y > 86) {
          confetti.splice(i, 1);
          continue;
        }
        q.vy += 260 * dt;
        q.vx -= q.vx * 2.4 * dt;
        q.vy -= q.vy * (q.vy > 0 ? 3.2 : 1.2) * dt;
        q.x += (q.vx + Math.sin(q.sw + t * 5) * 14) * dt;
        q.y += q.vy * dt;
        q.ph += q.vs * dt;
      }
      // while the card shows: twinkles round it
      if (t > FLIP1 && t < OUT && R.chance(0.3 * f)) ps.spawn(P.STAR, R.range(-34, 34), CY + R.range(-44, 44), 0, -8, R.range(0.3, 0.6), R.pick([WHITE, ...K]), R.range(0.8, 1.5));
      if (!out && t >= OUT + 0.35) {
        out = true;
        lights.add(0, CY, 50, WHITE, 0.8, 0.2);
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), sp = R.range(50, 140);
          ps.spawn(R.chance(0.5) ? P.STAR : P.MOTE, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.22), R.pick([WHITE, ...K]), 1);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // rays turning behind the card: candy after the burst, flickering in before it
      const rk = t < RAINBOW ? 0 : t < BURST ? 0.35 * smooth(RAINBOW, BURST, t) : (1 - outK()) * (t < OUT ? 1 : 1 - clamp((t - OUT) / 0.35));
      if (rk > 0) {
        const L = t < BURST ? 50 : 50 + 40 * ease.outCubic(clamp((t - BURST) / 0.4));
        // soft beams of candy light, long and short in turn, a thin bright core down each
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU + t * 0.7, l = L * (i % 2 ? 0.7 : 1), ex = Math.cos(a) * l, ey = CY + Math.sin(a) * l;
          p.glowLine(Math.cos(a) * 14, CY + Math.sin(a) * 14, ex, ey, 6, K[i % K.length], 0.32 * rk);
          p.line(Math.cos(a) * 22, CY + Math.sin(a) * 22, ex * 0.85, CY + Math.sin(a) * l * 0.85, mix(K[i % K.length], WHITE, 0.35), (u) => rk * (1 - u) * 0.9);
        }
        p.glow(0, CY, 90, K[6], 0.25 * rk);
      }
      // the aura: white, then gold, then candy rainbow, swelling as it charges
      if (t > SOLID && t < BURST) {
        const k = smooth(SOLID, GOLD, t), col = t < GOLD ? WHITE : t < RAINBOW ? GOLDC[2] : K[Math.floor(t * 14) % K.length];
        p.glow(0, CY, 44 + 16 * smooth(GOLD, BURST, t), col, 0.25 + 0.35 * k);
      }
    },
    draw(p) {
      const s = scaleAt() * (1 - outK()), x = shake(), sh = t * 6;
      // the gathering orb
      if (t < FORM) {
        const k = t / FORM;
        p.circle(0, CY, 2 + 4 * k, WHITE);
        p.glow(0, CY, 10 + 20 * k, K[6], 0.5 + 0.3 * k);
      }
      if (t >= FORM && s > 0.02) {
        // the rarity rim hugging the card: white, gold, then cycling candy
        if (t > SOLID && t < BURST) {
          const hw = (CW / 2) * s + 2, hh = (CH / 2) * s + 2, k = smooth(SOLID, GOLD, t);
          p.shade(x - hw - 1, CY - hh - 1, x + hw + 1, CY + hh + 1, (px, py, out) => {
            const dx = Math.abs(px - x) - hw + 2, dy = Math.abs(py - CY) - hh + 2;
            if (dx <= 0 && dy <= 0) return;
            if (dx > 2 || dy > 2) return;
            const a = Math.atan2(py - CY, px - x);
            out.a = k * (0.6 + 0.4 * Math.sin(t * 30 + a * 3));
            out.k = 0.4 * k;
            return t < GOLD ? WHITE : t < RAINBOW ? GOLDC[3] : K[Math.floor(((a / TAU + 1) * 7 + t * 10) % 7)];
          });
        }
        const fl = clamp((t - BURST) / (FLIP1 - BURST)), sx = Math.cos(fl * Math.PI);
        const white = t < SOLID ? 1 - (t - FORM) / (SOLID - FORM) : t >= BURST - 0.05 && t < BURST + 0.06 ? 1 : 0;
        const sw = t > 2.55 && t < 2.95 ? -14 + 60 * ((t - 2.55) / 0.4) : t > 3.2 && t < 3.55 ? -14 + 60 * ((t - 3.2) / 0.35) : null;
        card(p, x, CY, s, sx, false, K, sh, sw, white);
        // the mystery mark on the back
        if (sx > 0.9 && t < BURST && t > SOLID) p.text("?", x, CY - 6, hex("#ffd0f0"), { font: "big", align: "center", outline: INK });
        // the UR badge on the corner of the face
        if (sx < -0.95 && s > 0.9) {
          const bx = x - (CW / 2) * s + 2, by = CY - (CH / 2) * s + 2;
          p.rect(bx, by, 13, 8, INK);
          p.rect(bx + 1, by + 1, 11, 6, K[6]);
          p.text(o.text ?? "UR", bx + 6.5, by + 2, WHITE, { align: "center" });
        }
      }
      // the burst: a white flash, a flare, candy rings
      const q = (t - BURST) / 0.6;
      if (q >= 0 && q < 1) {
        const e = ease.outCubic(q);
        if (q < 0.25) flare(p, 0, CY, 60 * (1 - q / 0.25) + 6, 1 - q / 0.25, [K[5], K[6], K[0], K[2], WHITE]);
        for (let i = 0; i < 3; i++) p.ring(0, CY, 10 + (70 - i * 16) * e, Math.max(1, 3 * (1 - q)), q < 0.15 ? WHITE : K[[6, 2, 4][i]], 1 - q);
      }
      // UR drops in over the card with a bounce, candy-coloured, a shine sliding through it
      if (t >= URIN && t < OUT + 0.35) {
        const k = clamp((t - URIN) / 0.25), sc = 3, top = CY - (CH / 2) - 30 + (1 - ease.outBack(k, 2.2)) * -24, W = word.w * sc;
        const items = word.letters.filter((l) => l.g).map((l, i) => ({ g: l.g, x: -W / 2 + l.x * sc, y: top, sx: sc, sy: sc, a: 1 - outK(), flash: k < 1 ? 1 - k : 0 }));
        const shine = t > 2.7 && t < 3.1 ? -W / 2 - 6 + (W + 24) * ((t - 2.7) / 0.4) : null;
        drawWord(p, items, { fill: [K[5], K[6], K[0], K[1], K[2]], edge: WHITE, under: hex("#4a1a6a"), outline: INK, ow: 1, shadow: hex("#12081c"), shine, shineY: top, glint: K[2] });
        if (k >= 1) {
          sparkle(p, -W / 2 - 4, top + 2, 2 + 2 * (0.5 + 0.5 * Math.sin(t * 9)), WHITE, K[2], 0.8);
          sparkle(p, W / 2 + 4, top + 18, 2 + 2 * (0.5 + 0.5 * Math.sin(t * 7 + 2)), WHITE, K[4], 0.8);
        }
      }
      // confetti: little paper bits, flipping edge-on as they spin
      for (const c of confetti) {
        const w = Math.abs(Math.cos(c.ph)), a = Math.min(1, c.life / 0.4), col = Math.sin(c.ph) > 0 ? c.c : mix(c.c, INK, 0.35);
        if (c.long) p.rect(c.x - (w > 0.5 ? 1 : 0), c.y - 1, w > 0.5 ? 2 : 1, 3, col, a);
        else p.rect(c.x - 1, c.y, w > 0.4 ? 3 : 1, 2, col, a);
      }
      if (t > OUT + 0.3 && t < OUT + 0.45) sparkle(p, 0, CY, 8 * (1 - (t - OUT - 0.3) / 0.15) + 1, WHITE, K[6], 1);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
