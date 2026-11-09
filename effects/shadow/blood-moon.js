import { Particles, Lights, P, Rng, fit, hex, mix, flare, sparkle, clamp, smooth, ease, noise2, TAU, WHITE, READY } from "../../core/index.js";
import { tintActor, lightActor, haloActor } from "../ui/_lib.js";

// A werewolf's power-up: a small moon rises over his head and trembles, a red tide sweeps across it behind a
// burning copper edge, and it pulses as he throws his head back and howls; red light pours down into him, he
// burns with a crimson aura while the moon beats twice like a heart, then it melts down into him.
const MY = -60, MR = 10, RISE = 0.35, SWEEP0 = 0.5, SWEEP1 = 1.05, PULSE = 1.12, BEATS = [1.5, 1.68], SINK = 2.05, GONE = 2.5;

export const meta = {
  name: "Blood moon",
  desc: "A small moon rises over his head and bleeds crimson behind a copper edge; it pulses as he howls, pours red light into him, beats twice and melts into his crimson aura.",
  tags: ["shadow", "moon", "blood", "werewolf", "buff", "power-up", "rage", "howl", "actor", "one-shot"],
  size: [152, 134],
  origin: [76, 122],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    moon: "silver", // silver | yellow | a ramp of 5 colours, dark to bright
    palette: ["#1a0306", "#3e060c", "#6e0c16", "#a8161e", "#dc3028", "#ff6a48", "#ffb08a", "#ffffff"],
    seed: 8,
  },
};

const MOONS = {
  silver: ["#3e4052", "#6c7088", "#a4a8bc", "#d6d8e4", "#f8f8fe"],
  yellow: ["#5a4212", "#9a7424", "#d4a83e", "#f2d672", "#fff6c4"],
};

const STAND = { ...READY, crouch: 2, fx: 9, fy: -20, bx: 8, by: -20 };
const BRACE = { ...READY, crouch: 6, lean: 3, fx: 6, fy: -17, bx: 10, by: -16, ffx: 8, fbx: -8 };
const HOWL = { turn: 1, crouch: 1, lean: -4, hy: -3, fx: -11, fy: -29, bx: 13, by: -29, ffx: 7, fbx: -7 };
export const act = {
  onBody: true,
  poses: [
    [-0.2, READY],
    [0.2, STAND],
    [0.9, BRACE, "in"],
    [PULSE, HOWL, "snap"],
    [1.45, { ...HOWL, lean: -3, fy: -31 }],
    [1.9, { ...HOWL, lean: -2, fy: -28, by: -27 }],
    [2.45, { ...BRACE, crouch: 4, lean: 1 }, "out"],
    [3.0, READY],
  ],
  hits: [{ t: PULSE, stop: 0.08, shake: 0.22, amp: 2, target: false }],
};

// two thumps, each a quick swell and fall
const beat = (t) => BEATS.reduce((s, b, i) => s + (i ? 0.7 : 1) * Math.exp(-(((t - b) / 0.05) ** 2)), 0);

export function create(o) {
  const C = fit(o.palette, 8).map(hex), M = fit(Array.isArray(o.moon) ? o.moon : MOONS[o.moon] ?? MOONS.silver, 5).map(hex);
  const R = new Rng(o.seed), A = o.actor, S = o.seed;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
  const COPPER = hex("#f08a3a"), EMBER = hex("#ffc070");
  let t = 0, risen = false, pulsed = false, sank = false;
  const beatsDone = new Set();
  const chest = () => [A ? A.chest?.x ?? 0 : 0, A ? A.chest?.y ?? -24 : -24];

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      // motes gather to the point the moon rises from
      if (t < RISE && R.chance(0.5 * f)) {
        const a = R.range(0, TAU), d = R.range(16, 28), x = Math.cos(a) * d, y = MY + Math.sin(a) * d;
        ps.spawn(P.STREAK, x, y, -x * 4, (MY - y) * 4, R.range(0.15, 0.22), R.chance(0.5) ? M[4] : M[3]);
      }
      if (!risen && t >= RISE * 0.6) {
        risen = true;
        lights.add(0, MY, 30, M[3], 0.6, 0.25);
      }
      // the copper edge spits sparks as it crosses
      if (t > SWEEP0 && t < SWEEP1 && R.chance(0.3 * f)) ps.spawn(P.SPARK, R.range(-MR, MR) * 0.6, MY + R.range(-MR, MR) * 0.6, R.range(-60, 60), R.range(-80, 20), R.range(0.12, 0.25), EMBER);
      if (!pulsed && t >= PULSE) {
        pulsed = true;
        lights.add(0, MY, 80, C[4], 0.9, 0.5);
        lights.add(0, MY, 18, WHITE, 0.8, 0.08);
        lights.add(0, -22, 50, C[4], 0.6, 0.4);
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 190);
          ps.spawn(R.chance(0.55) ? P.SPARK : P.MOTE, Math.cos(a) * MR, MY + Math.sin(a) * MR, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45), R.pick([C[6], C[5], C[4]]), 1);
        }
      }
      // red light pours down into him while it beats
      if (t > PULSE && t < SINK + 0.3 && R.chance(0.55 * f)) {
        const [cx, cy] = chest(), x = R.range(-MR, MR) * 0.7, y = MY + MR * 0.6, tx = cx + R.range(-5, 5), ty = cy + R.range(-6, 8), T = R.range(0.18, 0.28);
        ps.spawn(P.STREAK, x, y, (tx - x) / T, (ty - y) / T, T, R.chance(0.5) ? C[5] : C[4]);
      }
      for (const b of BEATS)
        if (!beatsDone.has(b) && t >= b) {
          beatsDone.add(b);
          lights.add(0, MY, 50, C[4], 0.6, 0.25);
          lights.add(0, -22, 36, C[4], 0.45, 0.25);
        }
      // embers rise off him as the power takes hold
      if (t > PULSE && t < GONE + 0.2 && R.chance(0.4 * f)) {
        const x = R.range(-9, 9), y = -R.range(4, 36);
        ps.spawn(P.EMBER, x, y, R.range(-8, 8), -R.range(20, 45), Math.min(R.range(0.5, 0.9), meta.duration - 0.05 - t), R.chance(0.6) ? C[5] : C[6], 1);
      }
      if (!sank && t >= GONE) {
        sank = true;
        lights.add(0, -24, 46, C[4], 0.7, 0.35);
        for (let i = 0; i < 16; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 110);
          ps.spawn(P.MOTE, Math.cos(a) * 4, -26 + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 20, R.range(0.25, 0.45), R.pick([C[6], C[5]]), 1);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a red glow behind him once the moon turns
      const k = smooth(PULSE - 0.1, PULSE + 0.1, t) * (1 - smooth(GONE, meta.duration - 0.2, t));
      if (k > 0) p.glow(0, -24, 34, C[3], (0.3 + 0.3 * beat(t)) * k);
    },
    draw(p) {
      const red = ease.inOutSine(clamp((t - SWEEP0) / (SWEEP1 - SWEEP0))), bt = beat(t);
      // the moon: rises in, trembles, sweeps red, beats, then sinks into his head and is drawn in
      const rise = ease.outBack(clamp(t / RISE)), sink = ease.inCubic(clamp((t - SINK) / (GONE - SINK)));
      const r = MR * rise * (1 - 0.85 * sink) * (1 + 0.12 * bt), my = MY + 30 * sink;
      const shk = t > RISE && t < PULSE ? Math.round(Math.sin(t * 53) * smooth(RISE, SWEEP0, t) * 0.8) : 0, mx = shk;
      if (r > 0.6 && t < GONE) {
        const halo = mix(M[3], C[4], red);
        p.glow(mx, my, r * 3.2, halo, 0.16 + 0.25 * bt + 0.15 * red);
        p.shade(mx - r - 1, my - r - 1, mx + r + 1, my + r + 1, (x, y, out) => {
          const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy) / r;
          if (d > 1) return;
          const u = dx / r, v = dy / r;
          // seas and a crater, a lit limb top left, a shade step bottom right
          let i = 3;
          if ((u + 0.25) ** 2 + (v + 0.2) ** 2 < 0.12 || (u - 0.3) ** 2 + (v - 0.35) ** 2 < 0.06 || (u + 0.1) ** 2 + (v - 0.45) ** 2 < 0.04) i = 2;
          if ((u - 0.35) ** 2 + (v + 0.4) ** 2 < 0.03) i = 1;
          if (u + v > 0.75) i = Math.max(0, i - 1);
          if (d > 0.82) i = u + v < 0 ? 4 : Math.max(0, i - 1);
          else if (u + v < -0.8 && i === 3) i = 4;
          const s = u * 0.75 - v * 0.65 + noise2(dx / 3, dy / 3, S) * 0.25, front = -1.35 + 2.75 * red;
          if (s < front - 0.18) out.c = [C[1], C[2], C[3], C[4], C[5]][i];
          else if (s < front) {
            out.c = s > front - 0.08 ? EMBER : COPPER;
            out.k = 0.5;
          } else out.c = M[i];
        });
        if (t < RISE) flare(p, mx, my, 9 * (1 - t / RISE) + 2, 0.7 * (1 - t / RISE), M);
      }
      // the pulse: a white-hot rim, a ring racing out, a flare
      const q = (t - PULSE) / 0.45;
      if (q >= 0 && q < 1) {
        const e = ease.outCubic(q);
        if (q < 0.12) p.ring(mx, my, r, 2, WHITE, 1);
        if (q < 0.35) flare(p, mx, my, 26 * (1 - q / 0.35) + 4, 1 - q / 0.35, C);
        p.ring(mx, my, r + 2 + 46 * e, Math.max(1, 3 * (1 - q)), q < 0.2 ? C[6] : C[4], 1 - q);
      }
      // each heartbeat: a ripple off the rim
      for (const b of BEATS) {
        const k = (t - b) / 0.3;
        if (k > 0 && k < 1) p.ring(mx, my, r + 1 + 16 * ease.outCubic(k), 1, C[5], 1 - k);
      }
      // a beam of red joining the moon to his head while it pours in
      const pour = smooth(PULSE, PULSE + 0.1, t) * (1 - smooth(SINK, GONE, t));
      if (pour > 0) p.glowLine(mx, my + r, 0, -36, 6, C[4], 0.35 * pour * (0.7 + 0.5 * bt));
      // him: flashed red at the pulse, then rim-lit crimson with a flickering aura
      const flash = t < PULSE ? 0 : t < PULSE + 0.05 ? 1 : Math.exp(-(t - PULSE - 0.05) / 0.08);
      const aura = smooth(PULSE, PULSE + 0.15, t) * (1 - smooth(GONE + 0.1, meta.duration - 0.1, t));
      tintActor(p, A, flash, [C[3], C[5], C[6]]);
      lightActor(p, A, C[4], 0.12 * aura + 0.15 * bt * aura, (0.55 + 0.3 * bt) * aura, t);
      haloActor(p, A, C[5], (0.7 + 0.3 * bt) * aura, t);
      if (t > GONE && t < GONE + 0.15) sparkle(p, 0, -34, 5 * (1 - (t - GONE) / 0.15) + 1, WHITE, C[6], 0.8);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
