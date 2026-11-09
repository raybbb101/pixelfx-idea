import { Particles, Bits, B, Lights, P, Rng, fit, hex, mix, flare, sparkle, clamp, smooth, ease, noise2, TAU, WHITE } from "../../core/index.js";
import { clip } from "../weather/_lib.js";
import * as Dg from "./_dragon.js";

// A fire dragon egg on a nest of embers: lava seams pulse in its scaled shell, it rocks harder and harder,
// white-hot cracks race round it and the top bursts off. A baby dragon peeks out and blinks, climbs onto the rim,
// hops down, takes a deep breath and puffs a little jet of fire, coughs smoke, then flaps its tiny wings and
// flutters away.
const ROCKS = [[0.5, 0.25, 0.35], [1.1, 0.35, 0.5], [1.55, 0.45, 0.6], [1.95, 0.5, 0.95]]; // [time, length, strength]
const CRACK1 = 2.35, CRACK2 = 2.75, POP = 3.2, PEEK = 3.4, BLINKT = 3.85, CLIMB = 4.15, HOP = 4.65, LAND = 5.0;
const INHALE = 5.3, BREATH = 5.8, BREATH_END = 6.4, COUGH = 6.45, JOY = 6.85, FLY = 7.15, D = 8.4;
const EH = 29, ERX = 12;

export const meta = {
  name: "Dragon hatch",
  desc: "A fire dragon egg rocks on its embers, cracks white-hot and bursts open; a baby dragon peeks out, climbs down, puffs a little jet of fire, coughs and flutters away.",
  tags: ["spawn", "dragon", "egg", "hatch", "fire", "baby", "pet", "summon", "cute", "ground", "one-shot"],
  size: [232, 150],
  origin: [96, 126],
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

// the egg's half width at height v (0 at the base, -EH at the top): rounder below, a narrower top
const halfW = (v) => {
  const c = -12.5, r = v < c ? EH + c : -c;
  return ERX * Math.sqrt(Math.max(0, 1 - ((v - c) / r) ** 2));
};
// the crack line round the egg: a zigzag a little above its middle
const crackY = (u) => -15.8 + 1.8 * Math.abs(((u / 3.2) % 2 + 2) % 2 - 1) * 2 - 1.8;

export function create(o) {
  const F = fit(o.palette, 8).map(hex), SH = fit(o.shell, 5).map(hex), R = new Rng(o.seed), S = o.seed;
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, F[6], F[5], F[4]] });
  const bits = new Bits({ ground: () => 0 }), lights = new Lights();
  const top = { x: 0, y: -16, vx: -38, vy: -150, a: 0, va: -7, rest: false };
  const embers = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * TAU + R.range(-0.2, 0.2);
    return { x: Math.cos(a) * R.range(14, 19), y: Math.sin(a) * 3, r: R.range(1.8, 3), ph: R.range(0, TAU), back: Math.sin(a) < 0 };
  });
  const done = new Set();
  const once = (k, tt) => (t >= tt && !done.has(k) ? (done.add(k), true) : false);
  let t = 0;

  // the egg's rocking: bursts of wobble, harder each time, then a shudder before it cracks
  const rock = () => {
    let a = 0;
    for (const [t0, len, k] of ROCKS) if (t > t0 && t < t0 + len) a += Math.sin(((t - t0) / len) * Math.PI * 4) * k * 0.22 * Math.sin(((t - t0) / len) * Math.PI);
    if (t > CRACK1 - 0.1 && t < POP) a += Math.sin(t * 60) * 0.04;
    return a;
  };
  // where the dragon is: [x of the sprite's left, y of its top, pose, wings]
  const dragon = () => {
    if (t < PEEK) return null;
    if (t < CLIMB) {
      const k = ease.outBack(clamp((t - PEEK) / 0.25));
      return { x: -13, y: -15 - 11 * k, body: t > BLINKT && t < BLINKT + 0.12 ? Dg.BLINK : Dg.SIT, inside: true, flip: t > BLINKT + 0.25 && t < CLIMB - 0.05 };
    }
    if (t < HOP) {
      const k = ease.inOutSine(clamp((t - CLIMB) / (HOP - CLIMB - 0.05)));
      return { x: -13, y: -26 - 9 * k + Math.round(Math.sin(t * 30) * (1 - k)), body: Dg.SIT, inside: k < 0.85 };
    }
    if (t < LAND) {
      const k = (t - HOP) / (LAND - HOP);
      return { x: -13 + 29 * k, y: -35 + 13 * k - 16 * Math.sin(Math.PI * k), body: Dg.SIT, wing: Dg.WING_UP };
    }
    const base = { x: 16, y: -22, body: Dg.SIT };
    if (t < INHALE) return { ...base, y: t < LAND + 0.08 ? -21 : -22 };
    if (t < BREATH) return { ...base, y: -22 - Math.round(1.5 * smooth(INHALE, BREATH - 0.1, t)), x: 16 - Math.round(smooth(INHALE, BREATH, t)), puff: smooth(INHALE, BREATH, t) };
    if (t < BREATH_END) return { ...base, x: 17, body: Dg.OPEN };
    if (t < JOY) return { ...base, body: t > COUGH && t < COUGH + 0.25 ? Dg.BLINK : Dg.SIT, y: t > COUGH && t < COUGH + 0.25 ? -21 : -22 };
    if (t < FLY) {
      const k = (t - JOY) / (FLY - JOY);
      return { ...base, y: -22 - Math.round(8 * Math.sin(Math.PI * k)), wing: k > 0.2 && k < 0.8 ? Dg.WING_UP : Dg.WING_DOWN };
    }
    const k = (t - FLY) / (D - 0.3 - FLY), flap = Math.floor(t * 14) % 2;
    return { x: 16 + 160 * ease.inQuad(k), y: -22 - 90 * ease.inOutSine(k) + (flap ? -1 : 0), body: Dg.SIT, wing: flap ? Dg.WING_UP : Dg.WING_DOWN, fly: true };
  };
  const mouth = (d) => [d.x + 22, d.y + 9];

  // a sprite drawn a pixel at a time, cut off below cutY (inside the shell), mirrored if flip
  const sprite = (p, rows, x, y, cutY = Infinity, flip = false) => {
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < w; i++) {
        const ch = rows[j][flip ? w - 1 - i : i];
        if (ch === "." || y + j >= cutY) continue;
        p.px(x + i, y + j, PALC[ch]);
      }
  };
  const PALC = Object.fromEntries(Object.entries(Dg.PAL).map(([k, v]) => [k, hex(v)]));

  // the shell: scales in rows, lava seams pulsing in the cracks between them, lit top left
  const shellColor = (u, v, tt) => {
    const w = halfW(v), nx = u / Math.max(1, w), lit = -nx * 0.6 + (v < -16 ? 0.4 : 0);
    const row = Math.floor((v + 40) / 3.2), sx = (u + (row % 2) * 1.6) / 3.2, inScale = Math.abs((sx % 1 + 1) % 1 - 0.5) < 0.42 && ((v + 40) % 3.2) > 0.7;
    const seam = noise2(u / 3 + 9, v / 4, S) > 0.42;
    if (seam) {
      const pulse = 0.5 + 0.5 * Math.sin(tt * 4 + v * 0.3);
      return pulse > 0.6 ? F[5] : F[4];
    }
    if (Math.abs(nx) > 0.88) return SH[0];
    return inScale ? SH[Math.max(1, Math.min(4, Math.round(2.4 + lit * 1.6)))] : SH[1];
  };

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      // heat off the nest: embers drifting up
      if (t < D - 1.2 && R.chance(0.09 * f)) ps.spawn(P.EMBER, R.range(-16, 16), -R.range(0, 3), R.range(-6, 6), -R.range(18, 40), R.range(0.6, 1.1), 0, 1);
      // sparks from the seams while it rocks
      for (const [t0] of ROCKS) if (once("rock" + t0, t0)) for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, R.range(-8, 8), -R.range(4, 20), R.range(-60, 60), -R.range(40, 100), R.range(0.15, 0.3));
      if (once("c1", CRACK1) || once("c2", CRACK2)) {
        lights.add(0, -14, 40, F[5], 0.7, 0.2);
        for (let i = 0; i < 8; i++) ps.spawn(P.SPARK, R.range(-9, 9), -14, R.range(-80, 80), -R.range(60, 140), R.range(0.15, 0.3));
      }
      if (once("pop", POP)) {
        lights.add(0, -16, 80, F[5], 0.9, 0.4);
        lights.add(0, -16, 20, WHITE, 0.9, 0.06);
        for (let i = 0; i < 24; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(60, 170);
          ps.spawn(i % 2 ? P.SPARK : P.EMBER, R.range(-6, 6), -16, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.6), 0, 1);
        }
        for (let i = 0; i < 8; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(50, 120);
          bits.add({ kind: B.CHUNK, x: R.range(-6, 6), y: -16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(1, 1.8), ramp: [o.shell[0], o.shell[1], o.shell[2], o.shell[3], o.shell[4]], bounce: 0.3, life: D - POP - 0.4 });
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, R.range(-5, 5), -18, R.range(-10, 10), -R.range(15, 30), R.range(0.8, 1.2), 0, R.range(3, 4.5));
      }
      // the top of the shell: thrown up and off, tumbling, landing and lying on the nest
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
      const d = dragon();
      if (d && once("land", LAND)) for (let i = 0; i < 5; i++) ps.spawn(P.DUST, d.x + 12 + R.range(-6, 6), -1, R.sign() * R.range(10, 30), -R.range(4, 10), R.range(0.4, 0.6), SH[3], R.range(1.5, 2.5));
      // breathing in: a glow gathers in its chest, sparks pulled to the mouth
      if (d && t > INHALE && t < BREATH && R.chance(0.4 * f)) {
        const [mx, my] = mouth(d), a = R.range(-1.2, 1.2), r = R.range(12, 20);
        ps.spawn(P.STREAK, mx + Math.cos(a) * r, my + Math.sin(a) * r, -Math.cos(a) * r * 4, -Math.sin(a) * r * 4, 0.22, F[5]);
      }
      // the fire: a jet of little flames from its mouth, curling up as they cool
      if (d && t > BREATH && t < BREATH_END) {
        const [mx, my] = mouth(d);
        if (once("breath", BREATH)) lights.add(mx + 16, my, 50, F[5], 0.8, 0.6);
        for (let i = 0; i < 2; i++) ps.spawn(P.FIRE, mx + 1, my + R.range(-1, 1), R.range(100, 170), R.range(-25, 12), R.range(0.2, 0.36), 0, R.range(0.9, 1.6));
        if (R.chance(0.4)) ps.spawn(P.SPARK, mx + 2, my, R.range(120, 200), R.range(-50, 10), R.range(0.12, 0.25));
      }
      if (d && once("cough", COUGH)) {
        const [mx, my] = mouth(d);
        for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, mx + 2, my, R.range(20, 40), -R.range(5, 15), R.range(0.6, 0.9), 0, R.range(1.6, 2.4), i * 0.06);
      }
      if (d && once("joy", JOY)) for (let i = 0; i < 6; i++) ps.spawn(P.STAR, d.x + 12 + R.range(-10, 10), d.y + R.range(-4, 6), 0, -10, R.range(0.3, 0.5), R.pick([F[6], WHITE]), 1.2);
      if (d && d.fly && R.chance(0.35 * f)) ps.spawn(P.EMBER, d.x + 2, d.y + 18, R.range(-10, 10), R.range(5, 20), Math.min(R.range(0.3, 0.6), D - 0.05 - t), 0, 1);
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p0) {
      const p = clip(p0, meta), fade = 1 - smooth(D - 1.3, D - 0.25, t);
      // the nest's heat on the floor, and its back row of embers
      p.glow(0, -2, 40, F[3], 0.35 * fade);
      p.ellipse(0, 0, 19, 3.5, F[0], fade);
      for (const e of embers) if (e.back) ember(p, e, t, F, fade);
    },
    draw(p0) {
      const p = clip(p0, meta), fade = 1 - smooth(D - 1.3, D - 0.25, t), d = dragon(), a = rock();
      // the egg (the bottom cup once it has burst), rocking on its base
      const rimCut = (u) => crackY(u);
      const egg = (whole) =>
        p.shade(-ERX - 3, -EH - 3, ERX + 3, 1, (x, y, out) => {
          // undo the rock about the base
          const u = x * Math.cos(-a) - y * Math.sin(-a), v = x * Math.sin(-a) + y * Math.cos(-a), w = halfW(v);
          if (v > 0 || v < -EH || Math.abs(u) > w + 0.6) return;
          if (!whole && v < rimCut(u)) return;
          out.a = fade;
          if (Math.abs(u) > w - 0.4) return SH[0];
          // the cracks: white-hot lines racing round, then the rim glowing where it broke
          const cy = crackY(u), c1 = clamp((t - CRACK1) / 0.18) * 11, c2 = clamp((t - CRACK2) / 0.18) * 11;
          if (Math.abs(v - cy) < 0.75 && ((u < 0 && -u < c1) || (u >= 0 && u < c2))) return t < POP ? WHITE : F[5];
          if (!whole && v - cy < 1.5) {
            out.k = 0.4 * fade;
            return F[4];
          }
          // a burst of light through the seams before it pops
          const c = shellColor(u, v, t);
          return t > CRACK1 && t < POP && c === F[5] ? F[6] : c;
        });
      const whole = t < POP;
      // inside the burst egg: dark, glowing deep orange at the bottom
      if (!whole) p.ellipse(0, -14, 8, 2, F[1], fade);
      // the dragon behind the front of the shell while it is in it
      if (d && d.inside) {
        if (d.wing) sprite(p, d.wing, d.x + 2, d.y + 10, -14);
        sprite(p, d.body, d.x, d.y, crackY(0) + 0.5, d.flip);
      }
      egg(whole);
      if (whole && t > ROCKS[0][0]) p.glow(0, -12, 18, F[4], 0.2 + 0.25 * smooth(ROCKS[0][0], POP, t));
      // the burst: a flare out of the top
      const q = (t - POP) / 0.35;
      if (q > 0 && q < 1) flare(p, 0, -18, 28 * (1 - q) + 4, 1 - q, F);
      // the top of the shell, tumbling away and lying on the nest
      if (t > POP) {
        const ca = Math.cos(-top.a), sa = Math.sin(-top.a);
        p.shade(top.x - 14, top.y - 14, top.x + 14, top.y + 14, (x, y, out) => {
          const lx = x - top.x, ly = y - top.y, u = lx * ca - ly * sa, v = lx * sa + ly * ca - 16;
          const w = halfW(v);
          if (v < -EH || Math.abs(u) > w + 0.4 || v > crackY(u)) return;
          out.a = fade;
          if (Math.abs(u) > w - 0.4 || crackY(u) - v < 0.8) return SH[0];
          return shellColor(u, v, t);
        });
      }
      // the front row of embers
      for (const e of embers) if (!e.back) ember(p, e, t, F, fade);
      // the dragon out of the shell
      if (d && !d.inside) {
        const puff = d.puff ?? 0;
        if (d.wing) sprite(p, d.wing, d.x + 2, d.y + (d.wing === Dg.WING_UP ? 7 : 10));
        else sprite(p, Dg.WING_DOWN, d.x + 2, d.y + 10);
        sprite(p, d.body, d.x, d.y);
        // breathing in: its chest glows and its cheeks puff
        if (puff > 0) {
          p.glow(d.x + 12, d.y + 14, 8, F[5], 0.5 * puff);
          p.dot(d.x + 18, d.y + 10, F[5], puff);
        }
        // the flame in its mouth while it breathes fire
        if (t > BREATH && t < BREATH_END) {
          const [mx, my] = mouth(d), k = clamp((t - BREATH) / 0.08) * (1 - clamp((t - BREATH_END + 0.12) / 0.12));
          for (let s = 0; s < 14 * k; s++) {
            const w = 0.6 + s * 0.28;
            p.line(mx + s, my - w, mx + s, my + w, s < 3 ? WHITE : s < 7 ? F[6] : F[5]);
          }
          p.glow(mx + 8, my, 18, F[5], 0.6 * k);
        }
        if (t > JOY && t < JOY + 0.4) sparkle(p, d.x + 4, d.y + 1, 2 + 2 * Math.sin((t - JOY) * 20) ** 2, WHITE, F[6], 0.8);
      }
      bits.draw(p);
      ps.draw(p);
      lights.draw(p);
    },
  };
}

// one ember of the nest: a dark lump with a glowing crack, breathing
function ember(p, e, t, F, a) {
  const g = 0.5 + 0.5 * Math.sin(t * 3 + e.ph);
  p.circle(e.x, e.y - 1, e.r, F[0], a);
  p.circle(e.x - 0.5, e.y - 1.5, e.r * 0.6, g > 0.5 ? F[3] : F[2], a);
  p.dot(e.x - 1, e.y - 2, F[5], a * g);
  p.light(e.x, e.y - 1, F[4], 0.4 * g * a);
}
