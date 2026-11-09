// Shared by weather/blood-moon (the moon turning crimson) and weather/blood-moon-loop (the crimson moon after):
// a night sky over a pine ridge, a wolf on a crag howling at the moon. scene(q, tl, o, K) draws it; tl is the
// loop's clock (periodic in L), K says how far the change has gone. At the end of the turn tl = 0 and K is all
// 1, which is exactly the loop's first frame.
import { fit, hex, mix, clamp, rand, wrap, noise2, cycle, ease, TAU, WHITE } from "../../core/index.js";
import { bayer, rows } from "./_lib.js";

export const L = 12, W = 320;
export const MX = 62, MY = -120, MR = 24;
export const MOONS = {
  silver: ["#3a3c4e", "#6c7088", "#a4a8bc", "#d4d6e2", "#f6f6fc"],
  yellow: ["#5a4212", "#9a7424", "#d4a83e", "#f2d672", "#fff6c4"],
};
const RED = ["#2a0408", "#5c0a12", "#94141e", "#cc2a28", "#f86a4a"];
const NIGHT = ["#060918", "#0a102a", "#111a3a", "#1a2448", "#263258"];
const BLOOD = ["#0a0205", "#1a0408", "#30070e", "#4c0b14", "#6e121c"];
const INK = hex("#05030a"), COPPER = hex("#f08a3a"), EMBER = hex("#ffc070");

// a howling wolf, sitting, muzzle raised to the right
const WOLF = [
  "...................##...",
  "..................###...",
  ".................###....",
  "...............####.....",
  "............#.####......",
  "............######......",
  "............#####.......",
  "............#####.......",
  "...........######.......",
  "..........#######.......",
  ".........########.......",
  ".......##########.......",
  ".....############.......",
  "....#############.......",
  "...##############.......",
  "..##.############.......",
  ".##..#####.##.###.......",
  "##...#####.##..##.......",
];

const heart = (tl) => {
  // two thumps every 2 s, distance measured round the cycle so it wraps clean
  const ph = wrap(tl, 2) / 2, d = (c) => Math.min(Math.abs(ph - c), 1 - Math.abs(ph - c));
  return Math.exp(-((d(0.02) / 0.045) ** 2)) + 0.65 * Math.exp(-((d(0.17) / 0.045) ** 2));
};
export { heart };

// the ridge: rolling hills with pines, a crag on the left the wolf sits on
const ridge = (x, S) => {
  let h = 16 + 5 * Math.sin(x * 0.021 + 1) + 3 * Math.sin(x * 0.057 + 2);
  const k = Math.floor((x + 400) / 11), px = k * 11 - 400 + rand(S, k, 3) * 5, ph = 10 + rand(S, k, 4) * 20, pw = 5 + rand(S, k, 5) * 3;
  const dx = Math.abs(x - px);
  if (dx < pw) h += Math.max(0, ph * (1 - dx / pw) - (Math.floor((1 - dx / pw) * ph) % 4 === 0 ? 1.5 : 0));
  if (x < -70) h = Math.max(h, 48 - Math.abs(x + 112) * 0.55 + Math.sin(x * 0.4) * 1.5);
  return h;
};

/** K: { sweep (0..1 red across the moon), sky (0..1), mist (0..1), tremble (px), burst (seconds since the pulse, or -1), beat (0..1 weight) } */
const ridges = new Map();
const ridgeOf = (S) => ridges.get(S) ?? (ridges.set(S, Int16Array.from({ length: W }, (_, i) => Math.round(ridge(-W / 2 + i + 0.5, S)))), ridges.get(S));

export function scene(q, tl, o, K, p, meta) {
  const S = o.seed, M = fit(Array.isArray(o.moon) ? o.moon : MOONS[o.moon] ?? MOONS.silver, 5).map(hex), Rd = RED.map(hex);
  const sky = NIGHT.map((c, i) => mix(hex(c), hex(BLOOD[i]), K.sky));
  const beat = heart(tl) * K.beat, mx = MX + K.tremble, my = MY;
  const halo = mix(M[3], Rd[3], ease.inQuad(K.sweep)), red = K.sweep;

  // one pass down the screen: the sky in bands of tone dithered where they meet, the ridge in silhouette with
  // its tops catching the light, and the moon's halo, throbbing with the heartbeat once it is red
  const RH = ridgeOf(S), k1 = 0.12 + 0.1 * K.sky + 0.12 * beat, k2 = 0.2 + 0.15 * beat;
  rows(p, meta, -180, 0, (y, R) => {
    const f = clamp((y + 180) / 150) * (sky.length - 1), si = Math.floor(f), fr = f - si, sj = Math.min(sky.length - 1, si + 1), dyy = y - my;
    for (let i = 0; i < W; i++) {
      const x = -W / 2 + i + 0.5, h = RH[i];
      if (-y < h - 0.5) R.c[i] = INK;
      else if (-y < h + 0.5) R.c[i] = mix(INK, halo, 0.2 + 0.25 * clamp(1 - Math.abs(x - mx) / 260));
      else R.c[i] = fr > 0.3 && bayer(x, y) < (fr - 0.3) / 0.7 ? sky[sj] : sky[si];
      const d2 = (x - mx) ** 2 + dyy * dyy;
      if (d2 < 14400) {
        const d = Math.sqrt(d2), a = 1 - d / 120, b = d < 54 ? 1 - d / 54 : 0;
        R.k[i] = a * a * k1 + b * b * k2;
        R.l[i] = halo;
      }
    }
  });
  // stars, twinkling; they redden with the sky
  for (let i = 0; i < 80; i++) {
    const x = -W / 2 + rand(S, i, 1) * W, y = -178 + rand(S, i, 2) * 120;
    if (Math.hypot(x - mx, y - my) < MR + 6) continue;
    const tw = 0.5 + 0.5 * Math.sin((TAU * (1 + (i % 3)) * tl) / L + rand(S, i, 3) * TAU), big = rand(S, i, 4) > 0.88;
    const c = mix(mix(hex("#8890c0"), WHITE, tw), hex("#ff7a68"), K.sky);
    if (tw < 0.25 && !big) continue;
    q.px(x, y, c);
    if (big && tw > 0.5) {
      q.px(x - 1, y, mix(c, sky[1], 0.5));
      q.px(x + 1, y, mix(c, sky[1], 0.5));
      q.px(x, y - 1, mix(c, sky[1], 0.5));
      q.px(x, y + 1, mix(c, sky[1], 0.5));
      q.light(x, y, c, 0.3);
    }
  }

  // the moon: seas and craters, a lit limb top left; a red tide sweeps across it with a burning copper edge
  q.shade(mx - MR - 1, my - MR - 1, mx + MR + 1, my + MR + 1, (x, y, out) => {
    const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy) / MR;
    if (d > 1) return;
    const n = noise2(dx / 9 + 3, dy / 9, S + 5) + 0.5 * noise2(dx / 4, dy / 4 + 7, S + 9);
    let i = n > 0.32 ? 1 : n > 0.02 ? 2 : 3;
    for (const [cx, cy, r] of [[-9, -6, 3.5], [7, 8, 2.6], [10, -10, 2], [-4, 12, 2.2]]) {
      const c = Math.hypot(dx - cx, dy - cy);
      if (c < r) i = c > r - 1 ? (dx - cx + dy - cy < 0 ? 1 : 4) : 2;
    }
    // a sphere: lit top left, a shade step on the lower right, a bright rim on the lit side
    if ((dx + dy) / MR > 0.55 + noise2(dx / 5, dy / 5, S + 3) * 0.1) i = Math.max(0, i - 1);
    if (d > 0.9) i = dx + dy < 0 ? 4 : Math.max(0, i - 1);
    else if ((dx + dy) / MR < -0.7 && i === 3) i = 4;
    const s = (dx * 0.75 - dy * 0.65) / MR + noise2(dx / 6, dy / 6, S + 2) * 0.22, front = -1.35 + 2.75 * red;
    if (s < front - 0.14) {
      out.c = Rd[Math.min(4, i)];
    } else if (s < front) {
      out.c = s > front - 0.06 ? EMBER : COPPER;
      out.k = 0.5;
    } else out.c = M[i];
    out.l = out.c;
  });
  q.glow(mx, my, MR + 8, halo, 0.08 + 0.2 * beat);
  // the heartbeat: a ripple of red off the rim with each thump
  if (beat > 0.05) {
    const ph = wrap(tl, 2) / 2;
    for (const [c, k] of [[0.02, 1], [0.17, 0.65]]) {
      const a = ph - c;
      if (a > 0 && a < 0.2) q.ring(mx, my, MR + 2 + a * 120, 1, Rd[3], (1 - a / 0.2) * K.beat * k);
    }
  }
  // the pulse when the moon turns: a white-hot rim, a shock ring racing out, the sky flashing red
  if (K.burst >= 0 && K.burst < 1.2) {
    const b = K.burst / 1.2, e = ease.outCubic(b);
    if (b < 0.1) q.ring(mx, my, MR, 2, WHITE, 1 - b / 0.1);
    q.ring(mx, my, MR + 4 + 220 * e, Math.max(1, 4 * (1 - b)), b < 0.15 ? Rd[4] : Rd[3], 1 - b);
    q.ring(mx, my, MR + 2 + 120 * e, Math.max(1, 2 * (1 - b)), Rd[2], 0.8 * (1 - b));
    q.glow(mx, my, 160, Rd[3], 0.5 * (1 - b));
  }

  // thin streaks of cloud sliding across, lit where they cross near the moon
  for (let i = 0; i < 4; i++) {
    const w = 80 + rand(S, i, 11) * 70, x0 = wrap(rand(S, i, 12) * 560 + (560 * tl) / L, 560) - 280 - w / 2;
    const y0 = -152 + rand(S, i, 13) * 72, h = 2 + Math.floor(rand(S, i, 14) * 2);
    for (let dy = -h; dy <= h; dy++) {
      const half = (w / 2) * Math.sqrt(1 - (dy / (h + 0.5)) ** 2), sh = dy * 3 + Math.sin(i * 3 + dy) * 4;
      for (let x = Math.round(x0 + w / 2 - half + sh); x < x0 + w / 2 + half + sh; x++) {
        const lit = clamp(1 - Math.hypot(x - mx, y0 - my) / 70);
        q.blend(x, y0 + dy, dy < 0 && lit > 0 ? mix(sky[3], halo, 0.7 * lit) : mix(sky[1], INK, 0.3), dy < 0 ? 0.4 + 0.4 * lit : 0.45);
      }
    }
  }

  // red mist rolling along the ridge, and embers drifting up out of it
  if (K.mist > 0) {
    for (let i = 0; i < 9; i++) {
      const x = wrap(rand(S, i, 21) * 400 + (400 * tl) / L, 400) - 200, y = -10 - rand(S, i, 22) * 18 + Math.sin((TAU * tl) / L + i) * 2;
      // only over the sky: the ridge stands in front of it
      const above = (cx, cy, r, k) => (d, ang) => {
        const px = cx + Math.cos(ang) * d * r, py = cy + Math.sin(ang) * d * r, col = Math.floor(px + W / 2);
        return col >= 0 && col < W && -py > RH[col] + 0.5 ? k : 0;
      };
      const r1 = 12 + rand(S, i, 23) * 8, r2 = 8 + rand(S, i, 24) * 6;
      q.disc(x, y, r1, Rd[1], above(x, y, r1, 0.3 * K.mist));
      q.disc(x - 3, y - 5, r2, Rd[2], above(x - 3, y - 5, r2, 0.18 * K.mist));
    }
    cycle(tl, L, 26, S + 4, 3.2, (age, life, r) => {
      const k = age / life, x = r.range(-160, 160) + Math.sin(age * 2 + r.range(0, 6)) * 4, y = -8 - age * r.range(10, 22);
      q.dot(x, y, k < 0.4 ? Rd[4] : Rd[3], K.mist * (1 - k));
      q.light(x, y, Rd[3], 0.3 * K.mist * (1 - k));
    });
  }

  // the wolf on the crag, muzzle to the moon; its eye burns red once the moon does
  const wx = -124, wy = -Math.round(ridge(-112, S)) - WOLF.length + 1;
  WOLF.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === "#") q.px(wx + i, wy + j, INK);
  });
  for (let j = 0; j < WOLF.length; j++) {
    const row = WOLF[j], i = row.lastIndexOf("#");
    if (i >= 0) q.px(wx + i, wy + j, mix(INK, halo, 0.35));
  }
  if (K.sky > 0.5) {
    q.px(wx + 14, wy + 5, Rd[4]);
    q.light(wx + 14, wy + 5, Rd[4], 0.6 * (K.sky - 0.5) * 2 * (0.7 + 0.3 * beat));
  }
}
