import { Particles, Bits, B, Lights, P, Rng, fit, hex, mix, clamp, smooth, ease, noise, noise2, rand, TAU, WHITE, SMOKE_RAMP } from "../../core/index.js";
import { W, H, screenMeta, clipTo, rect } from "./_lib.js";

// A wall of fire climbs the screen from the bottom, roaring tongues leaping off its crest and black char left
// under it; the black glows with cracks, then crumbles to falling ash from the top down and the picture returns.
export const meta = screenMeta({
  name: "Inferno rise",
  desc: "A roaring wall of flame climbs the screen from the bottom, leaving black char; then the char cracks with glowing veins and crumbles away top down in falling ash.",
  tags: ["fire", "flames", "burn", "ash", "embers", "wipe"],
  duration: 3.4,
  options: { palette: ["#3a0f0c", "#7a1a12", "#b8281a", "#ea521c", "#ff8a26", "#ffbe3a", "#ffe066", "#fff4b0", "#ffffff"], seed: 4 },
});

const D = meta.duration, RISE = 1.3, COVER = 1.42, CRUMBLE = 1.72, GONE = 3.0, TALL = 58;
const ASH = ["#2a2430", "#4a4250", "#706878", "#9a92a2"];
// a tongue's layers: [width, height, palette step], outermost (deep red) to the white-hot core
const LAYERS = [[1, 1, 2], [0.74, 0.84, 4], [0.5, 0.64, 6], [0.26, 0.38, 8]];

function tongue(p, F, x, y, h, w, sway, t, n) {
  for (const [lw, lh, ri] of LAYERS) {
    const Ht = h * lh, col = F[ri];
    for (let r = 0; r <= Ht; r++) {
      const u = r / Math.max(1, Ht), half = w * lw * Math.pow(1 - u, 0.8) * Math.min(1, (r + 2) / 4) + noise(t * 10 + r * 0.4, n) * 0.6;
      if (half < 0.3) continue;
      const cx = x + sway * u * u * lh + noise(t * 5 + r * 0.18, n + 7) * u * 1.6;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
    }
  }
}

export function create(o) {
  const F = fit(o.palette, 9).map(hex), ink = hex(o.color), R = new Rng(o.seed), seed = o.seed * 17;
  const CHAR = mix(ink, F[0], 0.5), WARM = mix(F[4], F[5], 0.4), SMOKE = mix(hex("#7a6468"), F[1], 0.25);
  const A = ASH.map(hex);
  const ps = new Particles({ rng: R, sparks: [F[7], F[6], F[4], F[2]] });
  const bits = new Bits(), lights = new Lights();
  // the flames along the crest: spaced a few px apart, each its own height, width, phase
  const flames = [];
  for (let x = -4; x < W + 6; x += R.range(3.5, 6)) flames.push({ x, h: R.range(0.45, 1), w: R.range(3, 5.5), n: R.int(0, 900) });
  // per pixel of the char: a web of thin cracks (near 0 along them)
  const vein = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0, rx = x * 0.8 + y * 0.6, ry = y * 0.8 - x * 0.6;
    vein[i] = Math.min(Math.abs(noise2(rx / 12, ry / 9, seed + 3)), Math.abs(noise2(ry / 6, rx / 5.5, seed + 5)) * 1.4);
  }
  // the crest of the fire at column x: rising, ragged at two scales, the middle leading a little
  const front = (t) => H + 8 - (H + TALL + 30) * Math.pow(clamp(t / RISE), 1.35);
  const crest = (x, t) => front(t) + 9 * noise(x / 46 + 3, seed) + 3 * noise(x / 9 + t * 2, seed + 1) + 10 * ((x - W / 2) / (W / 2)) ** 2;
  // the crumbling edge of the char at column x: falling top to bottom in steps, so it breaks off in blocks
  const fall = (t) => -10 + (H + 26) * ease.inOutSine(clamp((t - CRUMBLE) / (GONE - CRUMBLE)));
  const edge = (x, t) => fall(t) + 7 * noise(Math.floor(x / 4) * 0.37 + 11, seed + 9) + 3 * noise(x / 13 + t * 1.5, seed + 2);
  let t = 0;

  return {
    update(dt) {
      t += dt;
      if (t < RISE + 0.1) {
        // the crest sheds flame, embers and smoke as it climbs
        for (let i = 0; i < 9; i++) {
          const x = R.range(0, W), y = crest(x, t) - R.range(4, 30);
          if (y < -20 || y > H + 10) continue;
          const r = R.next();
          if (r < 0.45) ps.spawn(P.FIRE, x, y, R.range(-10, 10), -R.range(50, 110), R.range(0.18, 0.36), 0, R.range(1.2, 2.2));
          else if (r < 0.8) ps.spawn(P.EMBER, x, y, R.range(-30, 30), -R.range(90, 190), R.range(0.4, 0.9), 0, R.chance(0.25) ? 2 : 1);
          else if (r < 0.93) ps.spawn(P.SMOKE, x, y - 10, R.range(-8, 8), -R.range(40, 70), R.range(0.5, 0.8), SMOKE, R.range(4, 7));
          else lights.add(x, y, R.range(30, 48), WARM, R.range(0.2, 0.35), R.range(0.15, 0.3));
        }
      }
      if (t >= COVER && t < CRUMBLE + 0.2 && R.chance(0.5)) {
        // the black smoulders: the odd ember floats up out of it
        ps.spawn(P.EMBER, R.range(0, W), R.range(30, H), R.range(-10, 10), -R.range(20, 50), R.range(0.5, 1), 0, 1);
      }
      if (t >= CRUMBLE && t < GONE) {
        // blocks of char break off the edge and fall, crumbling to ash flakes and the odd ember
        for (let i = 0; i < 5; i++) {
          const x = R.range(0, W), y = edge(x, t) + R.range(0, 3);
          if (y < 0 || y > H) continue;
          const r = R.next();
          if (r < 0.38) bits.add({ kind: B.CHUNK, x, y, vx: R.range(-15, 15), vy: R.range(0, 40), a: R.range(0, TAU), va: R.range(-6, 6), s: R.range(1.2, 2.6), ramp: [ASH[0], ASH[0], ASH[1], F[1], F[3]], g: 0.35, drag: 0.4, life: lifeTo(R.range(0.5, 0.9)) });
          else if (r < 0.62) ps.spawn(P.FLAKE, x, y, R.range(-12, 12), R.range(10, 50), lifeTo(R.range(0.25, 0.55)), R.pick(A), R.range(0.6, 1.4));
          else ps.spawn(P.EMBER, x, y, R.range(-20, 20), -R.range(20, 60), lifeTo(R.range(0.3, 0.7)), 0, 1);
        }
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    draw(p0) {
      const p = clipTo(p0);
      if (t < COVER) {
        // the char under the fire, and the band of embers along its top
        for (let x = 0; x < W; x++) {
          const c = crest(x, t), y0 = Math.round(c + 4), yi = Math.max(0, y0 + 7);
          if (yi < H) rect(p0, x, yi, 1, H - yi, ink);
          for (let k = 0; k < 7; k++) {
            const y = y0 + k;
            if (y >= 0 && y < H) p0.px(x, y, k < 1 ? F[6] : k < 2 ? F[5] : k < 3 ? F[4] : k < 4 ? F[3] : k < 5 ? F[2] : k < 6 ? F[1] : CHAR);
          }
          // the picture just above it scorches and glows
          for (let k = 1; k < 4; k++) if (c + 4 - k >= 0 && c + 4 - k < H) p.blend(x, c + 4 - k, F[1], 0.35 * (1 - k / 4));
        }
        // the base of the wall: a solid run of flame, then the tongues leaping off it
        for (const f of flames) {
          const c = crest(f.x, t) + 5, n = f.n, leap = 1 + Math.max(0, noise(t * 2.8 + n * 3.1, n + 70) - 0.45) * 1.6;
          const h = TALL * f.h * (0.55 + 0.45 * noise(t * 3.6 + n * 1.7, n)) * leap * (1 - smooth(RISE - 0.2, RISE + 0.1, t) * 0.6);
          if (c - h > H || c < -TALL * 2) continue;
          tongue(p, F, f.x, c, Math.max(4, h), f.w * (0.8 + h / 70), noise(t * 2.2 + n, n + 40) * 3, t, n);
        }
        const fy = front(t) + 5;
        p.glowLine(-10, fy - 14, W + 10, fy - 14, 40, WARM, 0.55);
        p.glowLine(-10, fy - 4, W + 10, fy - 4, 14, F[6], 0.35);
      } else {
        // the black, cracked with glowing veins near the edge as it crumbles
        const fl = t < CRUMBLE ? -1e9 : fall(t);
        const glowK = t < CRUMBLE ? smooth(COVER, CRUMBLE, t) * 0.5 : 1;
        for (let x = 0; x < W; x++) {
          const e = t < CRUMBLE ? -1e9 : edge(x, t), y0 = Math.max(0, Math.ceil(e));
          if (y0 >= H) continue;
          const deep = H;
          if (deep < H) rect(p0, x, deep, 1, H - deep, ink);
          for (let y = y0; y < deep; y++) {
            const i = y * W + x, d = y - e;
            if (d < 1.2) {
              p0.px(x, y, F[noise(x * 0.5 + t * 6, seed + 13) > 0.1 ? 6 : 5]);
              p.light(x, y, WARM, 0.5);
            } else if (d < 2.4) p0.px(x, y, F[4]);
            else if (d < 3.6) p0.px(x, y, F[2]);
            else {
              const hm = clamp(1 - (d - 3) / 22) * glowK, near = t < CRUMBLE ? glowK * clamp(0.1 + 0.9 * noise2(x / 26, y / 26, seed + 7)) : Math.max(hm, 0.5 * clamp(noise2(x / 26, y / 26, seed + 7)));
              if (near > 0.22 && vein[i] < 0.02 + 0.07 * near) {
                const c = near > 0.75 ? F[5] : near > 0.5 ? F[4] : near > 0.3 ? F[3] : near > 0.12 ? F[2] : F[1];
                p0.px(x, y, c);
                if (near > 0.2) p.light(x, y, WARM, 0.3 * near);
              } else p0.px(x, y, d < 5 + rand(x, 1, seed) * 3 ? CHAR : ink);
            }
          }
        }
        if (t >= CRUMBLE && fl < H + 10) p.glowLine(-10, fl + 6, W + 10, fl + 6, 18, WARM, 0.35);
      }
      // smoke shaded warm near the fire
      for (const q of ps.list) {
        if (q.k !== P.SMOKE || q.delay > 0) continue;
        const kk = q.life / q.max, age = 1 - kk, r = q.size * (0.7 + age * 0.9), above = t < COVER ? clamp((crest(q.x, t) - 6 - q.y) / 12) : 0;
        const a = Math.min(1, age * 10) * Math.min(1, kk * 2.2) * 0.5 * above;
        if (a < 0.04) continue;
        const c = mix(mix(SMOKE, F[3], 0.3 * kk), SMOKE_RAMP[2], age * 0.5);
        p.disc(q.x, q.y, r, c, a * 0.45);
        p.disc(q.x - r * 0.2, q.y - r * 0.25, r * 0.6, mix(c, WHITE, 0.12), a * 0.5);
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };

  // nothing may outlive the transition
  function lifeTo(l) {
    return Math.max(0.05, Math.min(l, D - 0.04 - t));
  }
}
