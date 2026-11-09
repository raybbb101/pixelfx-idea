import { Particles, Bits, B, Lights, P, Rng, fit, hex, mix, flare, sparkle, clamp, smooth, ease, noise2, TAU, WHITE } from "../../core/index.js";
import { clip } from "../weather/_lib.js";
import { Doll, drawDragon } from "./_dragon-rig.js";

// A fire dragon egg on a nest of embers: lava seams pulse in its scaled shell, it rocks harder and harder,
// white-hot cracks race round it and the top bursts off. A baby dragon's head rises out, eyes shut; it opens
// them, looks about and blinks, reaches up and grips the broken rim with both clawed hands, hauls itself up and
// gets a foot over, wobbles on the edge and topples off, tumbling to the ground. It shakes its dizzy head, sits up,
// blinks, breathes in and puffs a little jet of fire, coughs, beams, then flutters away. The dragon is a rig of
// shaded parts posed by keyframes every frame, so it moves smoothly.
const ROCKS = [[0.5, 0.25, 0.35], [1.1, 0.35, 0.5], [1.55, 0.45, 0.6], [1.95, 0.5, 0.95]]; // [time, length, strength]
const CRACK1 = 2.35, CRACK2 = 2.75, POP = 3.2;
const GRIP = 5.1, OUT = 6.05, TOPPLE = 6.35, LAND = 6.75, INHALE = 8.05, BREATH = 8.55, BREATH_END = 9.15, COUGH = 9.28, JOY = 9.45, FLY = 10.1, D = 11.2;
const EH = 32, ERX = 13, RIM = -17;
const GRIP_N = [11, -18], GRIP_F = [-9, -18.5];

export const meta = {
  name: "Dragon hatch",
  desc: "A fire dragon egg cracks open; a baby dragon grips the rim with its claws, hauls itself out, tumbles to the ground, blinks, puffs a little jet of fire, then flutters away.",
  tags: ["spawn", "dragon", "egg", "hatch", "fire", "baby", "pet", "summon", "cute", "ground", "one-shot"],
  size: [240, 156],
  origin: [96, 132],
  duration: D,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2a0806", "#5a1408", "#9a240c", "#d84a14", "#ff8a24", "#ffc848", "#fff2a8", "#ffffff"], // the fire
    shell: ["#140808", "#2a1012", "#43191a", "#5e2622", "#7e3a2c"],
    seed: 6,
  },
};

// the dragon's pose through the hatching: [time, the values that change]; everything eases between keys
const KEYS = [
  [3.25, { x: -2, y: 18, tilt: 0.25, head: 0.45, eye: 0, look: 0, jaw: 0, puff: 0, squash: 1, wing: 0, tail: 0, lift: 0, gN: 0, gF: 0 }],
  [3.65, { y: 3, head: 0.2 }],
  [3.95, { head: 0, eye: 0 }],
  [4.15, { eye: 1 }],
  [4.3, { look: -1, head: -0.12 }],
  [4.55, { look: 1, head: 0.1 }],
  [4.68, { look: 0, eye: 1, head: 0 }],
  [4.72, { eye: 0.05 }],
  [4.8, { eye: 1 }],
  [4.85, { gN: 0, gF: 0, tilt: 0.1 }],
  [GRIP, { gN: 1, gF: 1, y: 3, tilt: 0.2 }],
  [5.6, { y: -7, tilt: 0.3, head: 0.15 }],
  [5.85, { y: -12, tilt: 0.38, lift: 1 }],
  [OUT, { y: -18, x: 2, tilt: 0.15, lift: 0, gN: 0.5, gF: 0.5, head: 0 }],
  [6.2, { gN: 0, gF: 0, x: 3, tilt: 0.05, wing: 0.3 }],
  [TOPPLE, { x: 5, y: -18.5, tilt: 0.5, eye: 1, wing: 0.6 }],
  [6.55, { x: 19, y: -22, tilt: 0.95, eye: 0.05, wing: 1 }],
  [LAND, { x: 33, y: 0, tilt: 0, squash: 0.72, wing: 0.2 }],
  [6.9, { squash: 1.08 }],
  [7.02, { squash: 1, eye: 0.45, head: 0.2 }],
  [7.5, { eye: 0.45, head: 0 }],
  [7.58, { eye: 1, look: 0 }],
  [7.7, { eye: 1 }],
  [7.74, { eye: 0.05 }],
  [7.8, { eye: 1 }],
  [7.92, { eye: 1 }],
  [7.96, { eye: 0.05 }],
  [8.02, { eye: 1 }],
  [INHALE, { tilt: 0, head: 0, puff: 0 }],
  [8.5, { tilt: -0.16, head: -0.35, puff: 1 }],
  [BREATH, { tilt: 0.08, head: 0.12, puff: 0, jaw: 1 }],
  [9.1, { jaw: 1 }],
  [9.2, { jaw: 0, head: 0.1 }],
  [9.3, { jaw: 0.55, head: 0.25 }],
  [9.4, { jaw: 0, head: 0, eye: -1 }],
  [FLY, { eye: -1, y: 0 }],
  [10.3, { eye: 1, y: -6, x: 35, tilt: 0.15, wing: 1 }],
  [D - 0.15, { x: 200, y: -150 }],
];
const PARAMS = Object.keys(KEYS[0][1]);
function pose(t) {
  const out = {};
  for (const k of PARAMS) {
    // the last key at or before t with this value, and the next one after it
    let a = null, b = null;
    for (const [kt, v] of KEYS) {
      if (!(k in v)) continue;
      if (kt <= t) a = [kt, v[k]];
      else if (!b) b = [kt, v[k]];
    }
    if (!a) out[k] = b[1];
    else if (!b) out[k] = a[1];
    else {
      const u = (t - a[0]) / (b[0] - a[0]), e = k === "eye" ? u : u * u * (3 - 2 * u);
      out[k] = a[1] + (b[1] - a[1]) * e;
    }
  }
  // the fall: a real arc, not an ease
  if (t > TOPPLE && t < LAND) {
    const u = (t - TOPPLE) / (LAND - TOPPLE);
    out.x = 5 + 28 * u;
    out.y = -18.5 + 18.5 * u * u - 10 * Math.sin(Math.PI * u) * (1 - u);
  }
  // shaking its dizzy head, wagging and flapping when it's happy, flapping hard as it flies
  if (t > 7.02 && t < 7.55) out.head += Math.sin((t - 7.02) * 30) * 0.22 * (1 - (t - 7.02) / 0.53);
  if (t > JOY && t < FLY) {
    out.wing = 0.5 + 0.5 * Math.sin(t * 26);
    out.tail = Math.sin(t * 14) * 0.5;
    out.y = -Math.abs(Math.sin((t - JOY) * Math.PI * 2.4)) * 4;
  }
  if (t >= FLY) out.wing = 0.5 + 0.5 * Math.sin(t * 40);
  return out;
}

// the egg's half width at height v (0 at the base, -EH at the top): rounder below, a narrower top
const halfW = (v) => {
  const c = -13.5, r = v < c ? EH + c : -c;
  return ERX * Math.sqrt(Math.max(0, 1 - ((v - c) / r) ** 2));
};
// the crack line round the egg: a zigzag a little above its middle
const crackY = (u) => -17.3 + 1.8 * Math.abs(((u / 3.2) % 2 + 2) % 2 - 1) * 2 - 1.8;

export function create(o) {
  const F = fit(o.palette, 8).map(hex), SH = fit(o.shell, 5).map(hex), R = new Rng(o.seed), S = o.seed;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, F[6], F[5], F[4]] });
  const bits = new Bits({ ground: () => 0 }), lights = new Lights(), doll = new Doll(), arms = new Doll();
  const top = { x: 0, y: -18, vx: -40, vy: -150, a: 0, va: -7, rest: false };
  const embers = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU + R.range(-0.2, 0.2);
    return { x: Math.cos(a) * R.range(15, 20), y: Math.sin(a) * 3, r: R.range(1.8, 3), ph: R.range(0, TAU), back: Math.sin(a) < 0 };
  });
  const done = new Set();
  let t = 0, cur = null;
  const once = (k, tt) => (t >= tt && !done.has(k) ? (done.add(k), true) : false);

  // the egg's rocking: bursts of wobble, harder each time, then a shudder before it cracks
  const rock = () => {
    let a = 0;
    for (const [t0, len, k] of ROCKS) if (t > t0 && t < t0 + len) a += Math.sin(((t - t0) / len) * Math.PI * 4) * k * 0.22 * Math.sin(((t - t0) / len) * Math.PI);
    if (t > CRACK1 - 0.1 && t < POP) a += Math.sin(t * 60) * 0.04;
    return a;
  };
  // the shell: scales in rows, lava seams pulsing between them, lit top left
  const shellColor = (u, v, tt) => {
    const w = halfW(v), nx = u / Math.max(1, w), lit = -nx * 0.6 + (v < -18 ? 0.4 : 0);
    const row = Math.floor((v + 40) / 3.2), sx = (u + (row % 2) * 1.6) / 3.2, inScale = Math.abs((sx % 1 + 1) % 1 - 0.5) < 0.42 && ((v + 40) % 3.2) > 0.7;
    if (noise2(u / 3 + 9, v / 4, S) > 0.42) return 0.5 + 0.5 * Math.sin(tt * 4 + v * 0.3) > 0.6 ? F[5] : F[4];
    if (Math.abs(nx) > 0.88) return SH[0];
    return inScale ? SH[Math.max(1, Math.min(4, Math.round(2.4 + lit * 1.6)))] : SH[1];
  };
  // the dragon's pose with its hands reaching for the rim, and where its mouth is in the world
  const dragon = () => {
    if (t < 3.25) return null;
    const q = pose(t), X = q.x, Y = q.y, toRel = (g) => [g[0] - X, g[1] - Y];
    const rest = null;
    q.handN = q.gN > 0.01 ? lerp2(restN(q), toRel(GRIP_N), q.gN) : rest;
    q.handF = q.gF > 0.01 ? lerp2(restF(q), toRel(GRIP_F), q.gF) : rest;
    return q;
  };
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const restN = (q) => [8 + Math.sin(q.tilt) * 8, -7 - (q.squash - 1) * 4];
  const restF = (q) => [4 + Math.sin(q.tilt) * 8, -8];

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      cur = dragon();
      if (t < D - 1.6 && R.chance(0.08 * f)) ps.spawn(P.EMBER, R.range(-17, 17), -R.range(0, 3), R.range(-6, 6), -R.range(18, 40), R.range(0.6, 1.1), 0, 1);
      for (const [t0] of ROCKS) if (once("rock" + t0, t0)) for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, R.range(-8, 8), -R.range(4, 22), R.range(-60, 60), -R.range(40, 100), R.range(0.15, 0.3));
      if (once("c1", CRACK1) || once("c2", CRACK2)) {
        lights.add(0, -16, 40, F[5], 0.7, 0.2);
        for (let i = 0; i < 8; i++) ps.spawn(P.SPARK, R.range(-10, 10), -16, R.range(-80, 80), -R.range(60, 140), R.range(0.15, 0.3));
      }
      if (once("pop", POP)) {
        lights.add(0, -18, 80, F[5], 0.9, 0.4);
        lights.add(0, -18, 20, WHITE, 0.9, 0.06);
        for (let i = 0; i < 24; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(60, 170);
          ps.spawn(i % 2 ? P.SPARK : P.EMBER, R.range(-6, 6), -18, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.6), 0, 1);
        }
        for (let i = 0; i < 8; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(50, 120);
          bits.add({ kind: B.CHUNK, x: R.range(-6, 6), y: -18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(1, 1.8), ramp: [o.shell[0], o.shell[1], o.shell[2], o.shell[3], o.shell[4]], bounce: 0.3, life: D - POP - 0.6 });
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, R.range(-5, 5), -20, R.range(-10, 10), -R.range(15, 30), R.range(0.8, 1.2), 0, R.range(3, 4.5));
      }
      // the top of the shell: thrown up and off, tumbling, landing on the nest
      if (t > POP && !top.rest) {
        top.vy += 620 * dt;
        top.x += top.vx * dt;
        top.y += top.vy * dt;
        top.a += top.va * dt;
        if (top.y > -4 && top.vy > 0) {
          if (top.vy > 120) (top.vy *= -0.3), (top.va *= 0.4), (top.vx *= 0.5);
          else (top.rest = true), (top.y = -4), (top.a = Math.PI);
        }
      }
      // crumbs knocked off the rim as it hauls itself up
      if (t > GRIP && t < OUT && R.chance(0.12 * f)) bits.add({ kind: B.CHUNK, x: R.pick([GRIP_N[0], GRIP_F[0]]) + R.range(-2, 2), y: RIM, vx: R.range(-20, 20), vy: R.range(-20, 0), a: R.range(0, TAU), va: R.range(-10, 10), s: R.range(0.6, 1), ramp: [o.shell[0], o.shell[1], o.shell[2], o.shell[3], o.shell[4]], bounce: 0.2, life: D - t - 0.6 });
      if (cur && once("land", LAND)) {
        for (let i = 0; i < 7; i++) ps.spawn(P.DUST, cur.x + R.range(-8, 8), -1, R.sign() * R.range(12, 34), -R.range(4, 12), R.range(0.4, 0.7), SH[3], R.range(1.6, 2.8));
        for (let i = 0; i < 3; i++) ps.spawn(P.STAR, cur.x + R.range(-6, 10), -32 + R.range(-3, 3), 0, -6, 0.5, F[6], 1, 0.3 + i * 0.1);
      }
      const m = cur ? mouthAt(cur) : null;
      // breathing in: sparks drawn into its mouth
      if (m && t > INHALE && t < BREATH && R.chance(0.45 * f)) {
        const a = R.range(-1.2, 1.2), r = R.range(12, 22);
        ps.spawn(P.STREAK, m[0] + Math.cos(a) * r, m[1] + Math.sin(a) * r, -Math.cos(a) * r * 4, -Math.sin(a) * r * 4, 0.22, F[5]);
      }
      // the fire: a jet of little flames from its mouth, curling up as they cool
      if (m && t > BREATH + 0.04 && t < BREATH_END) {
        if (once("breath", BREATH + 0.04)) lights.add(m[0] + 18, m[1], 56, F[5], 0.8, 0.65);
        for (let i = 0; i < 2; i++) ps.spawn(P.FIRE, m[0] + 1, m[1] + R.range(-1, 1), R.range(100, 170), R.range(-20, 18), R.range(0.2, 0.36), 0, R.range(0.9, 1.6));
        if (R.chance(0.4)) ps.spawn(P.SPARK, m[0] + 2, m[1], R.range(120, 200), R.range(-50, 10), R.range(0.12, 0.25));
      }
      if (m && once("cough", COUGH)) for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, m[0] + 2, m[1], R.range(20, 40), -R.range(5, 15), R.range(0.6, 0.9), 0, R.range(1.6, 2.4), i * 0.06);
      if (cur && once("joy", JOY)) for (let i = 0; i < 6; i++) ps.spawn(P.STAR, cur.x + R.range(-12, 12), cur.y - 36 + R.range(-4, 6), 0, -10, R.range(0.3, 0.5), R.pick([F[6], WHITE]), 1.2);
      if (cur && t > FLY && R.chance(0.35 * f)) ps.spawn(P.EMBER, cur.x - 4, cur.y - 4, R.range(-10, 10), R.range(5, 20), Math.min(R.range(0.3, 0.6), D - 0.05 - t), 0, 1);
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p0) {
      const p = clip(p0, meta), fade = 1 - smooth(D - 1.6, D - 0.3, t);
      p.glow(0, -2, 42, F[3], 0.35 * fade);
      p.ellipse(0, 0, 21, 3.8, F[0], fade);
      for (const e of embers) if (e.back) ember(p, e, t, F, fade);
    },
    draw(p0) {
      const p = clip(p0, meta), fade = 1 - smooth(D - 1.6, D - 0.3, t), a = rock(), q = cur;
      const whole = t < POP;
      const egg = () =>
        p.shade(-ERX - 3, -EH - 3, ERX + 3, 1, (x, y, out) => {
          const u = x * Math.cos(-a) - y * Math.sin(-a), v = x * Math.sin(-a) + y * Math.cos(-a), w = halfW(v);
          if (v > 0 || v < -EH || Math.abs(u) > w + 0.6) return;
          if (!whole && v < crackY(u)) return;
          out.a = fade;
          if (Math.abs(u) > w - 0.4) return SH[0];
          // the cracks: white-hot lines racing round, then the rim glowing where it broke
          const cy = crackY(u), c1 = clamp((t - CRACK1) / 0.18) * 13, c2 = clamp((t - CRACK2) / 0.18) * 13;
          if (Math.abs(v - cy) < 0.75 && ((u < 0 && -u < c1) || (u >= 0 && u < c2))) return t < POP ? WHITE : F[5];
          if (!whole && v - cy < 1.5) {
            out.k = 0.4 * fade;
            return F[4];
          }
          const c = shellColor(u, v, t);
          return t > CRACK1 && t < POP && c === F[5] ? F[6] : c;
        });
      // inside the burst egg: dark, glowing deep orange at the bottom
      if (!whole) p.ellipse(0, -16, 9, 2.2, F[1], fade);
      const inside = q && q.y > -15 && t < TOPPLE;
      if (inside) {
        // its body behind the front of the shell, its hands over the rim in front of it
        doll.clear();
        drawDragon(doll, q, "body");
        doll.blit(p, q.x, q.y, RIM + 1.5);
      }
      egg();
      if (whole && t > ROCKS[0][0]) p.glow(0, -14, 20, F[4], 0.2 + 0.25 * smooth(ROCKS[0][0], POP, t));
      if (inside) {
        arms.clear();
        drawDragon(arms, q, "arms");
        arms.blit(p, q.x, q.y, q.gN > 0.35 ? Infinity : RIM + 1.5);
      }
      const k = (t - POP) / 0.35;
      if (k > 0 && k < 1) flare(p, 0, -20, 28 * (1 - k) + 4, 1 - k, F);
      // the top of the shell, tumbling away and lying on the nest
      if (t > POP) {
        const ca = Math.cos(-top.a), sa = Math.sin(-top.a);
        p.shade(top.x - 16, top.y - 16, top.x + 16, top.y + 16, (x, y, out) => {
          const lx = x - top.x, ly = y - top.y, u = lx * ca - ly * sa, v = lx * sa + ly * ca - 18;
          const w = halfW(v);
          if (v < -EH || Math.abs(u) > w + 0.4 || v > crackY(u)) return;
          out.a = fade;
          if (Math.abs(u) > w - 0.4 || crackY(u) - v < 0.8) return SH[0];
          return shellColor(u, v, t);
        });
      }
      for (const e of embers) if (!e.back) ember(p, e, t, F, fade);
      // out of the egg: the whole dragon in front of it
      if (q && !inside) {
        doll.clear();
        drawDragon(doll, q, "all");
        doll.blit(p, q.x, q.y);
        // breathing in, its chest glows; breathing fire, a white-hot core at its mouth
        const m = mouthAt(q);
        if (q.puff > 0.05) p.glow(q.x + 2, q.y - 12, 9, F[5], 0.45 * q.puff);
        if (t > BREATH + 0.04 && t < BREATH_END) {
          const kk = clamp((t - BREATH - 0.04) / 0.08) * (1 - clamp((t - BREATH_END + 0.12) / 0.12));
          for (let s = 0; s < 16 * kk; s++) {
            const w = 0.6 + s * 0.3;
            p.line(m[0] + s, m[1] - w, m[0] + s, m[1] + w, s < 3 ? WHITE : s < 8 ? F[6] : F[5]);
          }
          p.glow(m[0] + 8, m[1], 20, F[5], 0.6 * kk);
        }
        if (t > JOY && t < JOY + 0.5) sparkle(p, q.x - 6, q.y - 34, 2 + 2 * Math.sin((t - JOY) * 20) ** 2, WHITE, F[6], 0.8);
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };

  // where its mouth is in the world
  function mouthAt(q) {
    const tmp = scratch;
    tmp.clear();
    const r = drawDragon(tmp, { ...q, handN: null, handF: null }, "none");
    return [q.x + r.mouth[0], q.y + r.mouth[1]];
  }
}
const scratch = new Doll();

// one ember of the nest: a dark lump with a glowing crack, breathing
function ember(p, e, t, F, a) {
  const g = 0.5 + 0.5 * Math.sin(t * 3 + e.ph);
  p.circle(e.x, e.y - 1, e.r, F[0], a);
  p.circle(e.x - 0.5, e.y - 1.5, e.r * 0.6, g > 0.5 ? F[3] : F[2], a);
  p.dot(e.x - 1, e.y - 2, F[5], a * g);
  p.light(e.x, e.y - 1, F[4], 0.4 * g * a);
}
