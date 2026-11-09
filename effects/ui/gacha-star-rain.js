import { Particles, Lights, P, Rng, PAL, hex, mix, flare, sparkle, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.js";
import { rows, bayer, clip } from "../weather/_lib.js";
import { cardStyle, drawCard, drawBadge } from "./_gacha.js";

// A ten-pull as a star rain: a night sky fades in, ten shooting stars fall one after another and land in a
// 5 x 2 grid of results, each with the light of its rarity; rarer stars fall slower with longer trails and land
// harder (gold turns rays, the candy star flashes the whole screen in rainbow). They hold, twinkling, then each
// bursts into sparkles and the sky fades away. The pull is the `stars` option: one letter a star, W B P G C.
const D = 10.4, FADE_IN = 0.6, FIRST = 0.75, GAP = 0.22;

export const meta = {
  name: "Gacha star rain",
  desc: "A ten-pull as a rain of shooting stars over a night sky, landing in a grid in the colour of their rarity, white to candy rainbow; they hold, then burst into sparkles.",
  tags: ["ui", "gacha", "pull", "stars", "shooting-star", "reward", "rarity", "scene", "candy", "one-shot"],
  size: [320, 180],
  origin: [160, 180],
  duration: D,
  loop: false,
  fps: 30,
  bg: "black",
  options: { stars: "WWWWWWBWWW", candy: PAL.candy, seed: 2 },
};

// each rarity: its ramp (deep to white-hot), its rank, how big it is
const RAR = {
  W: { c: ["#4a5068", "#a0a8c4", "#e4e8ff", "#ffffff"], rank: 0 },
  B: { c: ["#10307a", "#2a68e8", "#6ab4ff", "#dcf2ff"], rank: 1 },
  P: { c: ["#381270", "#7a34d8", "#ba7cff", "#f2e0ff"], rank: 2 },
  G: { c: ["#6a3a08", "#d08a18", "#ffd040", "#fff6c4"], rank: 3 },
  C: { c: ["#7a1a6a", "#f53cd1", "#ffb0f0", "#ffffff"], rank: 4 },
};
const SKY = ["#04050f", "#070a1c", "#0c0f2a", "#131538", "#1c1a44", "#2a1e52"].map(hex);
const INK = hex("#04040c");

// where each slot sits, and when its star starts to fall and lands
function plan(stars) {
  let t = FIRST;
  return [...stars.slice(0, 10).padEnd(10, "W")].map((ch, i) => {
    const r = RAR[ch] ?? RAR.W, rank = r.rank, fall = 0.42 + 0.1 * rank;
    // a rare one takes a breath before it comes
    t += rank >= 3 ? 0.2 : 0;
    const s = { i, ch, rank, ramp: r.c.map(hex), x: -104 + (i % 5) * 52, y: i < 5 ? -112 : -56, start: t, land: t + fall };
    t += GAP + (rank >= 3 ? 0.15 : 0);
    return s;
  });
}
// the stars rest a moment after the last one lands, then turn into cards one by one; the cards hold, then
// pop away into sparkles and the sky fades out
function timing(S) {
  const hold = Math.min(6.0, Math.max(4.6, Math.max(...S.map((s) => s.land)) + 0.8)), cards = Math.max(8.6, hold + 2.9);
  S.forEach((s) => ((s.turn = hold + s.i * 0.09), (s.out = cards + s.i * 0.05)));
  return { hold, fade: cards + 0.85 };
}

// a four-point star: long arms on the axes, short on the diagonals, a white-hot core
function starIcon(p, x, y, L, ramp, k = 1, hue = null, t = 0) {
  const col = (j, a) => (hue ? hue[Math.floor(((a / TAU + 1) * hue.length + t * 8) % hue.length)] : ramp[j]);
  for (let s = -L; s <= L; s++) {
    const u = Math.abs(s) / L, j = u < 0.25 ? 3 : u < 0.55 ? 2 : 1;
    p.dot(x + s, y, u < 0.25 ? ramp[3] : col(j, s < 0 ? Math.PI : 0), k);
    p.dot(x, y + s, u < 0.25 ? ramp[3] : col(j, s < 0 ? -Math.PI / 2 : Math.PI / 2), k);
    if (u < 0.35 && Math.abs(s) >= 1) {
      p.dot(x + Math.sign(s), y + s * 0.5 > 0 ? y + 1 : y - 1, ramp[2], k * 0.8);
    }
  }
  const d = Math.max(1, Math.round(L * 0.35));
  for (let s = 1; s <= d; s++) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.dot(x + sx * s, y + sy * s, s === d ? ramp[1] : ramp[2], k);
  p.circle(x, y, Math.max(1, L * 0.2), ramp[3], k);
  p.dot(x, y, WHITE, k);
}

export function create(o) {
  const S = plan(String(o.stars ?? "WWWWWWBWWW").toUpperCase()), K = (o.candy ?? PAL.candy).map(hex), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [WHITE, hex("#fff2b0"), hex("#ffc060"), hex("#c06030")] }), lights = new Lights();
  const landed = new Set(), popped = new Set();
  const top = Math.max(...S.map((s) => s.rank)), { hold: HOLD_END, fade: FADE_OUT } = timing(S);
  S.forEach((s) => (s.st = cardStyle(s.ch, K)));
  const turned = new Set();
  let t = 0;
  // the head of star s at time t, falling in from the upper right, speeding up
  const head = (s, t) => {
    const u = ease.inQuad(clamp((t - s.start) / (s.land - s.start)));
    return [s.x + 150 * (1 - u), s.y - (s.y + 200) * (1 - u), u];
  };
  const skyK = () => smooth(0, FADE_IN, t) * (1 - smooth(FADE_OUT, D - 0.1, t));

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      for (const s of S) {
        // the trail sheds motes as it falls
        if (t > s.start && t < s.land && R.chance((0.3 + 0.2 * s.rank) * f)) {
          const [hx, hy] = head(s, t);
          ps.spawn(s.rank >= 2 ? P.STAR : P.MOTE, hx + R.range(-2, 2), hy + R.range(-2, 2), R.range(10, 40), -R.range(0, 20), R.range(0.2, 0.4), s.ch === "C" ? R.pick(K) : s.ramp[R.int(2, 3)], R.range(0.7, 1.2));
        }
        if (!landed.has(s.i) && t >= s.land) {
          landed.add(s.i);
          const n = 6 + s.rank * 9, col = (j) => (s.ch === "C" ? R.pick(K) : s.ramp[j]);
          lights.add(s.x, s.y, 26 + s.rank * 14, s.ramp[2], 0.5 + 0.12 * s.rank, 0.3 + 0.08 * s.rank);
          lights.add(s.x, s.y, 10, WHITE, 0.6, 0.06);
          if (s.rank >= 3) lights.add(0, -90, 200, s.ch === "C" ? K[6] : s.ramp[2], 0.35, 0.5);
          for (let j = 0; j < n; j++) {
            const a = R.range(0, TAU), sp = R.range(40, 90 + 30 * s.rank);
            ps.spawn(j % 3 ? P.SPARK : P.STAR, s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.3 + 0.08 * s.rank), col(R.int(2, 3)), 1);
          }
        }
        if (!turned.has(s.i) && t >= s.turn) {
          turned.add(s.i);
          lights.add(s.x, s.y, 30 + s.rank * 8, s.ramp[2], 0.6, 0.25);
          for (let j = 0; j < 10 + s.rank * 4; j++) {
            const a = R.range(0, TAU), sp = R.range(40, 100);
            ps.spawn(j % 2 ? P.STAR : P.SPARK, s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), s.ch === "C" ? R.pick(K) : s.ramp[R.int(2, 3)], 1);
          }
        }
        if (!popped.has(s.i) && t >= s.out + 0.35) {
          popped.add(s.i);
          lights.add(s.x, s.y, 20 + s.rank * 6, s.ramp[2], 0.5, 0.2);
          for (let j = 0; j < 8 + s.rank * 3; j++) {
            const a = R.range(0, TAU), sp = R.range(30, 80);
            ps.spawn(j % 2 ? P.STAR : P.MOTE, s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, Math.min(R.range(0.3, 0.6), D - 0.08 - t), s.ch === "C" ? R.pick(K) : s.ramp[R.int(2, 3)], 1);
          }
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p0) {
      const k = skyK(), p = clip(p0, meta);
      if (k <= 0) return;
      // the sky: deep night bands, dithered where they meet, blended in and out
      rows(p0, meta, -180, 0, (y, Rw) => {
        const f = clamp((y + 180) / 180) * (SKY.length - 1), i = Math.floor(f), fr = f - i, j = Math.min(SKY.length - 1, i + 1);
        for (let x = 0; x < 320; x++) {
          Rw.c[x] = fr > 0.35 && bayer(x, y) < (fr - 0.35) / 0.65 ? SKY[j] : SKY[i];
          Rw.b[x] = 1;
          Rw.a[x] = k;
        }
      });
      // far stars, twinkling
      for (let i = 0; i < 70; i++) {
        const x = -160 + rand(o.seed, i, 1) * 320, y = -178 + rand(o.seed, i, 2) * 150, tw = 0.5 + 0.5 * Math.sin(t * (1.5 + rand(o.seed, i, 3) * 2) + i);
        p.dot(x, y, tw > 0.6 ? WHITE : hex("#7a80b0"), k * (0.3 + 0.7 * tw));
      }
      // the result slots: faint rings waiting for their stars
      for (const s of S) {
        const a = k * (t < s.land ? 0.5 : 0.15) * (1 - smooth(HOLD_END, HOLD_END + 0.5, t));
        if (a > 0.05) p.ring(s.x, s.y, 11, 1, hex("#2a2e5a"), a);
      }
      // the whole sky lights up in the colour of the best star when it lands
      const best = S.find((s) => s.rank === top && s.rank >= 2);
      if (best && t > best.land) p.glow(0, -90, 240, best.ch === "C" ? K[(Math.floor(t * 6)) % K.length] : best.ramp[1], 0.18 * k * (1 - smooth(HOLD_END, FADE_OUT, t)));
    },
    draw(p0) {
      const p = clip(p0, meta);
      for (const s of S) {
        const L = 5 + s.rank * 1.6;
        if (t > s.start && t < s.land) {
          // falling: a bright head and a tapering trail, longer and wider for rarer stars
          const [hx, hy] = head(s, t), len = 26 + s.rank * 14, dx = 150, dy = -(s.y + 200), dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
          const tx = hx + ux * len, ty = hy + uy * len;
          const trail = (u) => (s.ch === "C" ? K[Math.floor(u * 7 + t * 10) % 7] : u < 0.15 ? s.ramp[3] : u < 0.5 ? s.ramp[2] : s.ramp[1]);
          p.line(hx, hy, tx, ty, trail, (u) => 1 - u);
          if (s.rank >= 2) p.line(hx + 1, hy, tx + 1, ty, trail, (u) => 0.8 * (1 - u * 1.4));
          if (s.rank >= 3) p.line(hx, hy + 1, tx, ty + 1, trail, (u) => 0.7 * (1 - u * 1.6));
          p.glowLine(hx, hy, tx, ty, 4 + s.rank, s.ch === "C" ? K[6] : s.ramp[2], 0.35);
          starIcon(p, hx, hy, Math.max(2, L * 0.6), s.ramp, 1, s.ch === "C" ? K : null, t);
          p.glow(hx, hy, 10 + s.rank * 4, s.ramp[2], 0.5);
        } else if (t >= s.land && t < s.turn + 0.06) {
          // landed: a flare and a ring, then it sits twinkling in its slot; rays turn behind the rare ones
          const q = (t - s.land) / 0.5, pop = t < s.land + 0.25 ? 1 + 0.6 * Math.sin(Math.PI * ((t - s.land) / 0.25)) : 1;
          const tw = 1 + 0.15 * Math.sin(t * 5 + s.i), grow = t > s.turn - 0.15 ? 1 + 1.2 * clamp((t - s.turn + 0.15) / 0.15) : 1, Ls = L * pop * tw * grow;
          if (q < 1) {
            if (q < 0.4) flare(p, s.x, s.y, (14 + 8 * s.rank) * (1 - q / 0.4) + 3, 1 - q / 0.4, s.ramp);
            p.ring(s.x, s.y, 4 + (14 + 8 * s.rank) * ease.outCubic(q), Math.max(1, 2 * (1 - q)), s.ch === "C" ? K[Math.floor(q * 14) % 7] : s.ramp[2], 1 - q);
            if (s.ch === "C") for (let r = 0; r < 3; r++) p.ring(s.x, s.y, 6 + (40 - r * 10) * ease.outCubic(q), 1, K[(r * 2 + 1) % 7], 1 - q);
          }
          if (s.rank >= 3) {
            for (let r = 0; r < 8; r++) {
              const a = (r / 8) * TAU + t * (s.ch === "C" ? 1.4 : 0.8), l = (r % 2 ? 12 : 18) + 3 * s.rank;
              p.line(s.x + Math.cos(a) * 6, s.y + Math.sin(a) * 6, s.x + Math.cos(a) * l, s.y + Math.sin(a) * l, s.ch === "C" ? K[r % 7] : s.ramp[2], (u) => 0.9 * (1 - u));
            }
          }
          p.glow(s.x, s.y, 10 + s.rank * 5, s.ch === "C" ? K[Math.floor(t * 8) % 7] : s.ramp[2], 0.45 + 0.1 * s.rank);
          starIcon(p, s.x, s.y, Math.round(Ls), s.ramp, 1, s.ch === "C" ? K : null, t);
          if (s.rank >= 2 && Math.sin(t * 3 + s.i * 2) > 0.85) sparkle(p, s.x + 7, s.y - 6, 2, WHITE, s.ramp[2], 0.7);
        }
      }
      // the cards: each pops out of its star in a white flash that cools into its face, rare ones with rays
      // turning behind them and a shine sweeping across, and the UR's candy frame shimmering
      for (const s of S) {
        if (t < s.turn || t >= s.out + 0.35) continue;
        const k = clamp((t - s.turn) / 0.3), sc = ease.outBack(k, 1.8) * (1 - ease.inBack(clamp((t - s.out) / 0.35))), white = 1 - clamp((t - s.turn) / 0.25);
        if (sc <= 0.02) continue;
        const gc = s.ch === "C" ? K[Math.floor(t * 8) % K.length] : s.st.glow;
        p.glow(s.x, s.y, (20 + 6 * s.rank) * sc, gc, (0.1 + 0.05 * s.rank) * sc);
        if (s.rank >= 3) {
          for (let r = 0; r < 10; r++) {
            const a = (r / 10) * TAU + t * (s.ch === "C" ? 1.2 : 0.7), l = (r % 2 ? 24 : 32) * sc;
            p.line(s.x + Math.cos(a) * 14 * sc, s.y + Math.sin(a) * 18 * sc, s.x + Math.cos(a) * l, s.y + Math.sin(a) * l * 1.1, s.ch === "C" ? K[r % K.length] : s.ramp[2], (u) => 0.8 * (1 - u) * sc);
          }
        }
        const ph = t - s.turn - 0.6 - s.i * 0.05, cyc = ((ph % 1.7) + 1.7) % 1.7, sw = s.rank >= 3 && ph > 0 && cyc < 0.4 ? -14 + 60 * (cyc / 0.4) : null;
        drawCard(p, s.x, s.y, sc, -1, false, s.st, t * 6, sw, white);
        if (sc > 0.95 && white <= 0) drawBadge(p, s.x, s.y, sc, s.st);
      }
      // the candy star's landing whites out the screen for a frame
      const c = S.find((s) => s.ch === "C");
      if (c && t >= c.land && t < c.land + 0.12) p.glow(0, -90, 260, WHITE, 0.5 * (1 - (t - c.land) / 0.12));
      ps.draw(p);
      lights.draw(p);
    },
  };
}
