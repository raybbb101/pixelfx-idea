import { Particles, Lights, P, Rng, PAL, fit, hex, mix, flare, sparkle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { spell, drawWord } from "./_lib.js";
import { CW, CH, INK, cardStyle, drawCard, drawBadge } from "./_gacha.js";

// A gacha pull that lands an Ultra Rare: candy light gathers into a mystery card, it shakes as its aura climbs
// from white to gold and then cracks into a candy rainbow, it bursts and flips to show a candy holographic UR
// card; UR drops in over it, rays turn behind it, candy confetti rains, a shine sweeps it, then it pops away.
const CY = -6;
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

const GOLDC = ["#7a4a0c", "#c8861c", "#f5c043", "#fff0a0"].map(hex);

export function create(o) {
  const K = fit(o.palette, 7).map(hex), R = new Rng(o.seed), word = spell(o.text ?? "UR"), ST = { ...cardStyle("UR", K), label: o.text ?? "UR" };
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
        drawCard(p, x, CY, s, sx, false, ST, sh, sw, white);
        // the mystery mark on the back
        if (sx > 0.9 && t < BURST && t > SOLID) p.text("?", x, CY - 6, hex("#ffd0f0"), { font: "big", align: "center", outline: INK });
        // the UR badge on the corner of the face
        if (sx < -0.95 && s > 0.9) drawBadge(p, x, CY, s, ST);
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
