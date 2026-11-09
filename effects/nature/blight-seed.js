import { Particles, Lights, P, Rng, fit, hex, mix, flare, sparkle, band, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { drawLeaf, Gas } from "./_lib.js";
import { glyph } from "../arcane/_lib.js";

// A trap: a rune draws itself in the sky and drops a seed; it sprouts, grows into a tree, then a poison mist
// creeps round it, the leaves wither, and the tree wakes as a monster: eyes open, a maw tears open in the trunk,
// the branches curl into claws, the roots rip up and it roars. It sways, menacing, then sinks into the mist.
const RY = -158, DRAWN = 0.75, DROP = 1.15, SPROUT = 1.85, TREE = 2.75, GROWN = 4.2, MIST = 4.4, ROT0 = 4.8, ROT1 = 5.9;
const WAKE = 5.9, EYES = 6.1, RIP = 6.4, ROAR = 6.85, MENACE = 7.3, SINK = 8.0, D = 9.2, TH = 96;

export const meta = {
  name: "Blight seed",
  desc: "A rune in the sky drops a seed that sprouts into a tree; a poison mist rots it, and it wakes as a monster with burning eyes, a maw and clawed branches, roars, then sinks.",
  tags: ["nature", "poison", "trap", "tree", "plant", "monster", "summon", "rune", "growth", "ground", "one-shot"],
  size: [272, 236],
  origin: [136, 206],
  duration: D,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a", "#f8ffd8"],
    leaf: ["#0e2414", "#1e4a22", "#357a34", "#62b04a", "#a8e070"],
    blight: ["#1a0e22", "#341a3e", "#56285a", "#7e3e74", "#a86a90"],
    bark: ["#1e120a", "#3a2414", "#5c3c20", "#86603a"],
    rot: ["#120a16", "#24182c", "#3a2a40", "#56425a"],
    seed: 6,
  },
};

export function create(o) {
  const C = fit(o.palette, 8).map(hex), LF = fit(o.leaf, 5).map(hex), BL = fit(o.blight, 5).map(hex);
  const BK = fit(o.bark, 4).map(hex), RT = fit(o.rot, 4).map(hex), R = new Rng(o.seed);
  const VIOLET = hex("#6a3a8a"), EYE = hex("#f0ff70");
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), gas = new Gas();

  // the tree: a trunk, five boughs off it, two twigs off each; each starts growing at its own share of g
  const B = [{ parent: -1, u: 0, off: 0, L: TH, s0: 0, depth: 0, side: 0 }];
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 1 : -1, u = 0.4 + i * 0.12;
    B.push({ parent: 0, u, off: side * R.range(0.7, 1.0), L: R.range(32, 40) * (1.15 - u * 0.45), s0: 0.22 + u * 0.35, depth: 1, side });
  }
  for (let i = 1; i <= 5; i++)
    for (let k = 0; k < 2; k++) {
      const pb = B[i], sd = k ? 1 : -1;
      B.push({ parent: i, u: R.range(0.5, 0.8), off: sd * R.range(0.45, 0.8), L: pb.L * R.range(0.42, 0.58), s0: pb.s0 + 0.18, depth: 2, side: pb.side });
    }
  // leaf clusters on the twig tips, bough tips and the crown
  const clusters = [];
  for (let i = 1; i < B.length; i++)
    clusters.push({ b: i, r: B[i].depth === 2 ? 7 : 8, leaves: Array.from({ length: 5 }, () => ({ a: R.range(0, TAU), d: R.range(2, 8), ang: R.range(-2.6, -0.5), len: R.range(5, 7), drop: WAKE + R.range(0, 1.2), fell: false })) });
  clusters.push({ b: 0, r: 10, leaves: Array.from({ length: 6 }, () => ({ a: R.range(0, TAU), d: R.range(2, 10), ang: R.range(-2.6, -0.5), len: R.range(5, 7), drop: WAKE + R.range(0, 1.2), fell: false })) });
  // roots that tear up out of the floor
  const roots = [-1, 1, -1, 1].map((s, i) => ({ s, L: [40, 46, 26, 28][i], h: [10, 12, 7, 7][i], at: RIP + i * 0.07 }));

  let t = 0, dropped = false, landed = false, ripped = false, roared = false, sunk = false;
  const seed = { y: RY + 4, vy: 0 };
  const g = () => (t < SPROUT ? 0 : t < TREE ? 0.3 * ease.outCubic((t - SPROUT) / (TREE - SPROUT)) : 0.3 + 0.7 * ease.inOutSine(clamp((t - TREE) / (GROWN - TREE))));
  const rot = () => smooth(ROT0, ROT1, t);
  const mon = () => ease.inOutCubic(clamp((t - WAKE) / (ROAR - WAKE)));
  const fade = () => 1 - smooth(SINK + 0.3, D - 0.35, t);
  const shake = () => {
    const k = t > WAKE && t < ROAR + 0.5 ? (t < ROAR ? 0.6 * smooth(WAKE, ROAR, t) : 1.6 * (1 - (t - ROAR) / 0.5)) : 0;
    return k > 0 ? Math.round(Math.sin(t * 61) * k) : 0;
  };

  // the tree's geometry this frame: each branch a polyline of points with a width at each
  let gT = -1, gC = null;
  const geo = () => (gT === t ? gC : ((gT = t), (gC = build())));
  const build = () => {
    const G = g(), M = mon(), out = [], sink = smooth(SINK, D - 0.2, t) * 14, sx = shake(), breathe = M * Math.sin(t * 2.4) * 0.04;
    for (let i = 0; i < B.length; i++) {
      const b = B[i], gb = clamp((G - b.s0) / (1 - b.s0));
      if (gb <= 0) {
        out.push(null);
        continue;
      }
      const n = b.depth ? 6 : 9, L = b.L * ease.outCubic(gb) * (b.depth ? 1 + 0.25 * M : 1 + 0.28 * M + breathe), pts = [];
      let x, y, a, w0, w1;
      if (b.parent < 0) {
        x = sx;
        y = sink;
        a = -Math.PI / 2;
        w0 = 1.5 + 9 * G + 13 * M;
        w1 = 1 + 1.5 * G + 1.5 * M;
      } else {
        const P = out[b.parent];
        if (!P) {
          out.push(null);
          continue;
        }
        const f = b.u * (P.pts.length - 1), j = Math.min(P.pts.length - 2, Math.floor(f)), k = f - j;
        x = P.pts[j][0] + (P.pts[j + 1][0] - P.pts[j][0]) * k;
        y = P.pts[j][1] + (P.pts[j + 1][1] - P.pts[j][1]) * k;
        a = Math.atan2(P.pts[j + 1][1] - P.pts[j][1], P.pts[j + 1][0] - P.pts[j][0]);
        w0 = Math.max(1, (P.w[j] + (P.w[j + 1] - P.w[j]) * k) * 0.6);
        w1 = 1;
        // the boughs swing out level into arms as it wakes
        const target = b.depth === 1 ? b.side * (1.25 + 0.1 * Math.sin(i)) : b.off * 1.3;
        a += b.off + (target - b.off) * M;
      }
      // healthy boughs reach up at the tips; the monster's curl down into claws and writhe
      const curl = b.depth === 0 ? 0 : b.side * (-0.35 + M * (b.depth === 1 ? 1.7 : 2.2));
      const sway = Math.sin(t * 1.5 + i * 1.3) * 0.06 * smooth(TREE, GROWN, t) + M * Math.sin(t * 3.1 + i * 2.1) * 0.22;
      const seg = L / n;
      pts.push([x, y]);
      const w = [w0];
      for (let s = 1; s <= n; s++) {
        const u = s / n;
        let da = (curl * u * u) / n * 3 + sway * u;
        if (b.depth === 0) {
          // the trunk: a gentle S, a slow sway at the crown, hunching forward as it wakes
          x = pts[0][0] + Math.sin(u * 3.2) * 2.2 * u * (1 - M) + Math.sin(t * 1.2) * 1.5 * u * u + M * (Math.sin(t * 1.7) * 3 + 4) * u * u;
          y = pts[0][1] - L * u;
        } else {
          a += da;
          x += Math.cos(a) * seg;
          y += Math.sin(a) * seg;
        }
        pts.push([x, y]);
        w.push(b.depth ? w0 + (w1 - w0) * Math.pow(u, 0.8) : w1 + (w0 - w1) * Math.pow(1 - u, 1.1));
      }
      out.push({ pts, w, gb, b });
    }
    return out;
  };
  const tip = (q) => q.pts[q.pts.length - 1];

  return {
    update(dt) {
      t += dt;
      const f = Math.min(1, dt * 120);
      // the rune gathers motes while it draws itself
      if (t < DROP && R.chance(0.5 * f)) {
        const a = R.range(0, TAU), d = R.range(34, 50), x = Math.cos(a) * d, y = RY + Math.sin(a) * d * 0.4;
        ps.spawn(P.STREAK, x, y, -x * 3, (RY - y) * 3, R.range(0.2, 0.3), R.chance(0.5) ? C[6] : C[5]);
      }
      if (!dropped && t >= DROP) {
        dropped = true;
        lights.add(0, RY, 60, C[5], 0.8, 0.4);
        lights.add(0, RY, 16, WHITE, 0.8, 0.08);
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 120);
          ps.spawn(R.chance(0.5) ? P.MOTE : P.STAR, 0, RY, Math.cos(a) * sp, Math.sin(a) * sp * 0.4, R.range(0.3, 0.6), R.pick([C[6], C[5], WHITE]), R.range(0.8, 1.4));
        }
      }
      if (dropped && !landed) {
        seed.vy += 700 * dt;
        seed.y += seed.vy * dt;
        if (R.chance(0.6)) ps.spawn(P.MOTE, R.range(-1, 1), seed.y - 2, R.range(-8, 8), -R.range(5, 20), R.range(0.2, 0.4), C[6], 0.7);
        if (seed.y >= -2) {
          landed = true;
          lights.add(0, -3, 40, C[5], 0.8, 0.35);
          for (let i = 0; i < 10; i++) ps.spawn(P.GRIT, R.range(-3, 3), -1, R.range(-50, 50), -R.range(50, 120), R.range(0.5, 0.8), R.pick([BK[1], BK[2]]), 1);
          for (let i = 0; i < 4; i++) ps.spawn(P.DUST, R.range(-4, 4), -2, R.sign() * R.range(15, 35), -R.range(4, 12), R.range(0.4, 0.7), BK[2], R.range(2, 3));
          for (let i = 0; i < 12; i++) ps.spawn(P.SPARK, 0, -2, R.range(-120, 120), -R.range(60, 180), R.range(0.15, 0.35));
        }
      }
      // the tree growing: motes of life spiral up round it
      if (t > SPROUT && t < GROWN && R.chance(0.35 * f)) ps.spawn(P.EMBER, R.range(-24, 24), -R.range(0, 10), R.range(-6, 6), -R.range(25, 50), R.range(0.6, 1), R.chance(0.6) ? C[6] : LF[4], 1);
      // the mist creeps in from the sides and wells up round the roots
      if (t > MIST && t < SINK + 0.4 && R.chance((t < WAKE ? 0.07 : 0.08) * f)) {
        const sd = R.sign(), x = t < WAKE ? sd * R.range(30, 90) : R.range(-50, 50);
        gas.add(t, x, -R.range(2, 8), -sd * R.range(10, 30), -R.range(1, 4), R.range(4, 6), R.range(9, 14), Math.min(t + R.range(1.6, 2.4), D - 0.05), R.range(1, 4));
      }
      if (t > ROT0 && t < SINK && R.chance(0.25 * f)) ps.spawn(P.EMBER, R.range(-40, 40), -R.range(0, 30), R.range(-6, 6), -R.range(10, 30), Math.min(R.range(0.6, 1.1), D - 0.05 - t), R.chance(0.5) ? C[5] : VIOLET, 1);
      if (!ripped && t >= RIP) {
        ripped = true;
        for (const r of roots) {
          for (let i = 0; i < 8; i++) ps.spawn(P.GRIT, r.s * R.range(6, r.L), -1, r.s * R.range(10, 70), -R.range(60, 160), R.range(0.5, 0.9), R.pick([BK[1], BK[2], RT[2]]), R.chance(0.3) ? 2 : 1);
          for (let i = 0; i < 3; i++) ps.spawn(P.DUST, r.s * R.range(8, r.L), -2, r.s * R.range(10, 30), -R.range(6, 16), R.range(0.6, 0.9), RT[2], R.range(2.5, 4));
        }
      }
      if (!roared && t >= ROAR) {
        roared = true;
        lights.add(0, -46, 120, C[4], 0.45, 0.7);
        lights.add(0, -46, 24, C[6], 0.3, 0.1);
        for (let i = 0; i < 7; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 90);
          gas.add(t, Math.cos(a) * 8, -40 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 - 10, R.range(4, 6), R.range(10, 16), Math.min(t + R.range(1.5, 2.1), D - 0.05), R.range(2, 5));
        }
        for (let i = 0; i < 30; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(60, 180);
          ps.spawn(R.chance(0.6) ? P.MOTE : P.SPARK, 0, -46, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.6), R.pick([C[6], C[5], EYE]), 1);
        }
      }
      // the last leaves let go as it wakes, and drift down withered
      if (t > WAKE) {
        const G = geo();
        for (const c of clusters) {
          const q = G[c.b];
          if (!q) continue;
          const [tx, ty] = tip(q);
          for (const l of c.leaves)
            if (!l.fell && t >= l.drop) {
              l.fell = true;
              ps.spawn(P.FLAKE, tx + Math.cos(l.a) * l.d, ty + Math.sin(l.a) * l.d * 0.8, R.range(-20, 20), R.range(-10, 10), Math.min(R.range(0.8, 1.4), D - 0.05 - t), R.pick([BL[2], BL[3], BL[4]]), R.range(1, 1.6));
            }
        }
      }
      if (!sunk && t >= SINK + 0.2) {
        sunk = true;
        for (let i = 0; i < 8; i++) gas.add(t, R.range(-30, 30), -R.range(10, 70), R.range(-20, 20), -R.range(0, 10), R.range(6, 10), R.range(14, 22), Math.min(t + R.range(0.9, 1.0), D - 0.05), R.range(2, 6));
      }
      gas.prune(t);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the rune in the sky: a ring drawn round, runes lit one by one, a turning star inside, a flash as it lets go
      const rk = t < DROP ? 1 : 1 - smooth(DROP, DROP + 0.5, t);
      if (rk > 0) {
        const dr = clamp(t / DRAWN), spin = t * 1.4, sy = 0.38;
        p.glow(0, RY, 50, C[4], 0.3 * rk * dr);
        for (let i = 0; i < 90 * dr; i++) {
          const a = (i / 90) * TAU - Math.PI / 2;
          p.dot(Math.cos(a) * 36, RY + Math.sin(a) * 36 * sy, i > 90 * dr - 3 ? WHITE : C[5], rk);
          if (i % 2 === 0) p.dot(Math.cos(a) * 28, RY + Math.sin(a) * 28 * sy, C[3], rk);
        }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + spin, on = clamp((dr - i / 8) * 6);
          if (on > 0) glyph(p, i, Math.cos(a) * 32, RY + Math.sin(a) * 32 * sy + 2, Math.sin(a) > 0 ? C[6] : C[4], rk * on, C[1]);
        }
        if (t > DRAWN * 0.5) {
          const pts = Array.from({ length: 6 }, (_, i) => {
            const a = -spin * 1.3 + (i * 2 * TAU) / 5;
            return [Math.cos(a) * 22, RY + Math.sin(a) * 22 * sy];
          });
          p.polyline(pts, C[4], rk * smooth(DRAWN * 0.5, DRAWN, t));
        }
        const fl = (t - DROP) / 0.3;
        if (fl > 0 && fl < 1) flare(p, 0, RY, 30 * (1 - fl) + 4, 1 - fl, C);
      }
      // the trap mark on the floor where the seed lands, glowing until the tree swallows it
      const mk = landed ? smooth(SPROUT - 0.6, SPROUT, t) * (1 - smooth(ROAR, SINK, t)) : 0;
      if (mk > 0) {
        p.glow(0, -1, 40, C[4], 0.25 * mk);
        for (let i = 0; i < 6; i++) glyph(p, i + 2, (i - 2.5) * 9, 1, C[4], mk * 0.9, C[1]);
      }
      const lk = clamp((t - SPROUT + 0.15) / 0.55);
      if (landed && lk > 0 && lk < 1) band(p, 0, 0.5, 4 + 40 * ease.outCubic(lk), 0.18, Math.max(1, 3 * (1 - lk)), 1.1 - lk, [C[3], C[5], C[6], WHITE], (a) => Math.sin(a) < 0);
      // poison light pooling on the floor
      const pk = smooth(MIST, WAKE, t) * fade();
      if (pk > 0) p.glow(0, -2, 56, C[4], 0.12 * pk);
      gas.draw(p, t, VIOLET, mix(C[2], VIOLET, 0.4), C[3], C[4], 0.36 * Math.min(1, smooth(MIST, MIST + 1, t) + 0.5), 0);
    },
    draw(p) {
      const A = fade(), M = mon(), Rk = rot(), G = geo();
      // the seed falling
      if (dropped && !landed) {
        p.glowLine(0, seed.y - 14, 0, seed.y, 4, C[5], 0.5);
        p.circle(0, seed.y, 2, C[3]);
        p.px(-1, seed.y - 1, C[6]);
        p.glow(0, seed.y, 10, C[5], 0.6);
      }
      if (landed && t < SPROUT + 0.1) {
        // it lies pulsing on the floor before it splits
        const k = 0.5 + 0.5 * Math.sin(t * 18);
        p.circle(0, -1.5, 1.8, k > 0.5 ? C[5] : C[3]);
        p.glow(0, -2, 12, C[5], 0.3 + 0.3 * k);
      }
      const bark = (i) => mix(BK[i], RT[i], Rk);
      // roots ripping up out of the floor as humps of bark
      for (const r of roots) {
        const k = ease.outBack(clamp((t - r.at) / 0.3));
        if (k <= 0) continue;
        const pts = [];
        for (let s = 0; s <= 8; s++) {
          const u = s / 8;
          pts.push([r.s * (3 + u * r.L), -Math.sin(Math.PI * Math.min(1, u * 1.15)) * r.h * k + Math.sin(t * 3 + u * 5) * M * 0.6 * u]);
        }
        for (let s = 1; s < pts.length; s++) {
          const w = (1 - s / 9) * 8 + 1;
          p.beam(pts[s - 1][0], pts[s - 1][1], pts[s][0], pts[s][1], w, bark(1), A);
          p.beam(pts[s - 1][0] - 0.5, pts[s - 1][1] - w * 0.25, pts[s][0] - 0.5, pts[s][1] - w * 0.25, w * 0.45, bark(2), A);
        }
      }
      // branches, then the trunk over them: a dark body, a lit stripe up its left side
      const order = [...G.keys()].filter((i) => G[i]).sort((a, b) => B[b].depth - B[a].depth);
      for (const i of order) {
        const q = G[i];
        if (B[i].depth === 0) {
          // row by row, flat on the floor: a dark edge each side, the body, a lit band up the left
          const c0 = bark(0), c1 = bark(1), c2 = bark(2), c3 = bark(3);
          for (let j = 1; j < q.pts.length; j++) {
            const [xa, ya] = q.pts[j - 1], [xb, yb] = q.pts[j], wa = q.w[j - 1], wb = q.w[j];
            for (let y = Math.floor(ya); y > Math.floor(yb); y--) {
              const k = (ya - y) / Math.max(1e-6, ya - yb), x = xa + (xb - xa) * k, w = Math.max(1, wa + (wb - wa) * k), l = Math.round(x - w / 2), r = Math.round(x + w / 2);
              p.rect(l, y, r - l, 1, c1, A);
              if (w > 3) {
                const s0 = Math.round(x - w * 0.36), s1 = Math.round(x - w * 0.08);
                if (s1 > s0) p.rect(s0, y, s1 - s0, 1, c2, A);
                p.dot(Math.round(x - w * 0.3), y, c3, A);
              }
              p.dot(l, y, c0, A);
              p.dot(r - 1, y, c0, A);
            }
          }
          continue;
        }
        for (let s = 1; s < q.pts.length; s++) {
          const [x0, y0] = q.pts[s - 1], [x1, y1] = q.pts[s], w0 = q.w[s - 1];
          p.beam(x0, y0, x1, y1, w0 + 1, bark(0), A);
          p.beam(x0, y0, x1, y1, w0, bark(1), A);
          if (w0 > 2) p.beam(x0 - w0 * 0.22, y0, x1 - q.w[s] * 0.22, y1, w0 * 0.4, bark(2), A);
          if (w0 > 5) p.beam(x0 - w0 * 0.3, y0, x1 - q.w[s] * 0.3, y1, 1, bark(3), A);
        }
        // the monster's claws: a pale hooked tip on every bough and twig
        if (M > 0.3 && B[i].depth) {
          const [tx, ty] = tip(q), [px, py] = q.pts[q.pts.length - 2];
          p.line(px, py, tx, ty, RT[3], A * clamp((M - 0.3) * 3));
          p.dot(tx, ty, mix(RT[3], WHITE, 0.4), A * clamp((M - 0.3) * 3));
        }
      }
      const T = G[0];
      if (T && T.w[0] > 5)
        for (let j = 1; j < T.pts.length - 1; j++) {
          const [x, y] = T.pts[j], w = T.w[j] * 0.5, k = ((j * 37) % 7) / 7;
          p.line(x - w + 1, y + k * 3, x - w * 0.2, y + k * 3 - 1, bark(0), A);
          p.line(x + w * 0.3, y + 4 - k * 2, x + w - 1, y + 3 - k * 2, bark(0), A);
          if (j % 3 === 1) p.circle(x + w * 0.35, y + 2, 1.2, bark(0), A);
        }
      // bark cracks glowing with poison as it rots
      if (T && Rk > 0.2) {
        for (let k = 0; k < 4; k++) {
          const j = 1 + k * 2;
          if (j + 1 >= T.pts.length) break;
          const [x0, y0] = T.pts[j], [x1, y1] = T.pts[j + 1], off = (k % 2 ? 1 : -1) * T.w[j] * 0.25;
          p.line(x0 + off, y0, x1 + off * 0.5, y1, C[4], A * clamp((Rk - 0.2) * 2));
          p.glowLine(x0 + off, y0, x1 + off * 0.5, y1, 4, C[4], 0.3 * A * Rk);
        }
      }
      // the face: brows, eyes that crack open and burn, a maw that tears open across the trunk
      if (T && M > 0) {
        const at = (u) => {
          const f = u * (T.pts.length - 1), j = Math.min(T.pts.length - 2, Math.floor(f)), k = f - j;
          return [T.pts[j][0] + (T.pts[j + 1][0] - T.pts[j][0]) * k, T.pts[j][1] + (T.pts[j + 1][1] - T.pts[j][1]) * k, T.w[j]];
        };
        const [ex, ey, ew] = at(0.52), [mx, my, mwid] = at(0.3);
        const eo = clamp((t - EYES) / 0.25), blink = t > MENACE && Math.sin(t * 2.3) > 0.97 ? 0.2 : 1, pulse = 0.75 + 0.25 * Math.sin(t * 7);
        for (const s of [-1, 1]) {
          const x = ex + s * ew * 0.27, h = 2.8 * eo * blink;
          p.beam(x - 4 * s, ey - 5, x + 3 * s, ey - 2.5, 2.2, RT[0], A * M);
          p.line(x - 4 * s, ey - 6, x + 2 * s, ey - 4, RT[3], A * M);
          if (h > 0.3) {
            p.ellipse(x, ey, 3.6, h + 0.6, RT[0], A);
            p.ellipse(x, ey, 2.8, Math.max(0.6, h - 0.3), EYE, A);
            p.dot(x, ey, WHITE, A);
            p.dot(x + s, ey, WHITE, A);
            p.glow(x, ey, 9, C[5], 0.7 * A * eo * pulse);
          } else if (M > 0.2) p.line(x - 2, ey, x + 2, ey, RT[0], A);
        }
        const roarK = t < ROAR ? 0 : t < ROAR + 0.5 ? 1 : 0.55 + 0.1 * Math.sin(t * 5);
        const mw = mwid * 0.44 * M + 0.5, mh = 2 + 4 * M + 4 * roarK;
        if (M > 0.15) {
          p.shade(mx - mw - 1, my - mh - 1, mx + mw + 1, my + mh + 1, (x, y, out) => {
            const u = (x - mx) / mw, v = (y - my) / mh;
            if (u * u + v * v > 1) return u * u + v * v < 1.45 ? (out.a = A, RT[0]) : undefined;
            out.a = A;
            // teeth: jagged points down from the lip and up from the jaw
                        const rim = Math.sqrt(u * u + v * v);
            if (rim > 0.86) return RT[0];
            // the throat: dark, a green glow deep inside that flares when it roars
            const hot = roarK, core = 1 - rim;
            out.k = (0.15 + 0.4 * hot) * core * A;
            out.l = C[4];
            return core > 0.65 - 0.3 * hot ? (hot > 0.6 ? C[6] : C[4]) : core > 0.45 - 0.3 * hot ? (hot > 0.6 ? C[4] : C[2]) : RT[0];
          });
          // fangs: two long ones down from the lip, two short ones up from the jaw
          const fang = mix(RT[3], WHITE, 0.55);
          for (const s of [-1, 1]) {
            const ux = mx + s * mw * 0.42, lx = mx + s * mw * 0.2, top = my - mh * 0.85, bot = my + mh * 0.85;
            p.tri(ux - 1.2, top, ux + 1.2, top, ux, top + mh * 0.85, fang, A);
            p.tri(lx - 1, bot, lx + 1, bot, lx, bot - mh * 0.6, fang, A);
          }
          p.glow(mx, my, 10 + 14 * roarK, C[4], (0.15 + 0.3 * roarK) * A);
        }
      }
      // leaves: clusters of them on every tip, withering to purple, falling as it wakes
      const lf = (i) => mix(LF[i], BL[i], Rk);
      const pal = [lf(0), lf(1), lf(3), lf(4)];
      for (const c of clusters) {
        const q = G[c.b];
        if (!q || q.gb < 0.5) continue;
        const [tx, ty] = tip(q), sc = ease.outBack(clamp((q.gb - 0.5) * 2.5));
        const left = c.leaves.filter((l) => !l.fell).length / c.leaves.length;
        if (left > 0.3) {
          p.circle(tx, ty, c.r * sc * left, pal[1], A);
          p.circle(tx - c.r * 0.25, ty - c.r * 0.3, c.r * 0.62 * sc * left, pal[2], A);
        }
        for (const l of c.leaves) {
          if (l.fell) continue;
          drawLeaf(p, tx + Math.cos(l.a) * l.d * sc, ty + Math.sin(l.a) * l.d * sc * 0.8, l.len * sc, 2, l.ang + Math.sin(t * 2 + l.a) * 0.15, 0, pal, A);
        }
      }
      // the sapling's first two leaves, until boughs take over
      if (T && g() < 0.72 && g() > 0.02) {
        const [tx, ty] = tip(T), k = ease.outBack(clamp(g() / 0.15)) * (1 - smooth(0.58, 0.72, g()));
        if (k > 0) {
          drawLeaf(p, tx - 4 * k, ty + 1, 8 * k, 2.6, -2.6 + Math.sin(t * 3) * 0.1, 0, [LF[0], LF[1], LF[3], LF[4]]);
          drawLeaf(p, tx + 4 * k, ty, 8 * k, 2.6, -0.5 + Math.sin(t * 3 + 1) * 0.1, 0, [LF[0], LF[1], LF[3], LF[4]]);
        }
      }
      
      ps.draw(p);
      lights.draw(p);
    },
  };
}
