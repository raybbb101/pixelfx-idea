import { hex, mix, rng, bolt, cycle, clamp, TAU, WHITE } from "../../core/index.js";
import { D, haloMeta, centre, ph, tomoe } from "./_halo.js";

// A thunder halo: a ring of beads behind the back carrying five drums, each bearing a turning mitsudomoe (the
// thunder god's drums); light runs round the beads, lightning leaps between the drums and crackles off them.
export const meta = haloMeta({
  name: "Halo: thunder",
  desc: "A ring of beads floats behind the back carrying five drums with turning three-comma crests; light runs round the beads and lightning leaps between the drums.",
  tags: ["thunder", "lightning", "tomoe", "mitsudomoe", "drum", "japanese", "electric"],
  options: { palette: ["#160a3a", "#3a1a8a", "#7a3ce8", "#b88aff", "#ecd8ff", "#ffffff"], seed: 6 },
});

const R = 27, SLOT = 0.125;
const drumAt = (i, cx, cy, t) => {
  const a = -Math.PI / 2 + (i * TAU) / 5, bob = Math.sin(ph(t, 2) + i * 1.3) * 0.8;
  return [cx + Math.cos(a) * (R + bob), cy + Math.sin(a) * (R + bob), i === 0 ? 9 : 6.5];
};

export function drawBack(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  const slot = Math.floor(t / SLOT), g = rng(o.seed, slot), strike = g.next() < 0.4, flash = strike ? 1 - (t / SLOT - slot) : 0;
  p.glow(cx, cy, 46, C[1], 0.3 + 0.12 * flash);
  // the beads: light chasing round them
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU, k = 0.5 + 0.5 * Math.sin(a * 2 - ph(t, 2)), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    if (i % 2 === 0) p.circle(x, y, 1.3, k > 0.75 ? C[5] : k > 0.4 ? C[4] : C[3]);
    else p.dot(x, y, C[2]);
    if (k > 0.8) p.light(x, y, C[3], 0.6);
  }
  // lightning between two neighbouring drums on a strike, jagged afresh each time, forking a little
  if (strike) {
    const i = Math.floor(g.next() * 5), [x0, y0] = drumAt(i, cx, cy, t), [x1, y1] = drumAt((i + 1) % 5, cx, cy, t);
    const mid = [(x0 + x1) / 2 + (cx - (x0 + x1) / 2) * g.range(0.1, 0.5), (y0 + y1) / 2 + (cy - (y0 + y1) / 2) * g.range(0.1, 0.5)];
    for (const [a, b] of [[[x0, y0], mid], [mid, [x1, y1]]]) {
      const path = bolt(g, a[0], a[1], b[0], b[1], { jag: 0.3, depth: 3 });
      for (let k = 1; k < path.length; k++) {
        p.line(path[k - 1][0], path[k - 1][1], path[k][0], path[k][1], flash > 0.5 ? C[5] : C[4]);
        p.glowLine(path[k - 1][0], path[k - 1][1], path[k][0], path[k][1], 5, C[2], 0.5 * flash);
      }
    }
    const fk = bolt(g, mid[0], mid[1], mid[0] + g.range(-10, 10), mid[1] + g.range(4, 12), { jag: 0.35, depth: 2 });
    for (let k = 1; k < fk.length; k++) p.line(fk[k - 1][0], fk[k - 1][1], fk[k][0], fk[k][1], C[3], flash);
  }
  // the drums: dark faces with a lit rim, a three-comma crest turning on each
  for (let i = 0; i < 5; i++) {
    const [dx, dy, r] = drumAt(i, cx, cy, t), rot = ph(t) * (i % 2 ? -1 : 1) + i;
    p.circle(dx, dy, r + 1.6, C[0]);
    p.shade(dx - r - 1, dy - r - 1, dx + r + 1, dy + r + 1, (x, y, out) => {
      const u = (x - dx) / r, v = (y - dy) / r, d = Math.hypot(u, v);
      if (d > 1.12) return;
      if (d > 0.92) return u + v < 0 ? C[4] : C[2];
      if (tomoe(u, v, rot)) {
        out.k = 0.35;
        out.l = C[3];
        return C[5];
      }
      return d < 0.5 ? C[1] : C[0];
    });
    p.glow(dx, dy, r + 8, C[2], 0.35 + 0.25 * flash);
  }
}

export function draw(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  // crackles spitting off the drums: short jagged sparks that last a frame or two
  const slot = Math.floor(t / (SLOT / 2)), g = rng(o.seed + 11, slot);
  for (let n = 0; n < 2; n++) {
    if (g.next() > 0.55) continue;
    const [dx, dy, r] = drumAt(Math.floor(g.next() * 5), cx, cy, t), a = g.range(0, TAU), L = g.range(5, 11);
    const path = bolt(g, dx + Math.cos(a) * r, dy + Math.sin(a) * r, dx + Math.cos(a) * (r + L), dy + Math.sin(a) * (r + L), { jag: 0.45, depth: 2 });
    for (let k = 1; k < path.length; k++) p.line(path[k - 1][0], path[k - 1][1], path[k][0], path[k][1], k < 2 ? C[5] : C[4]);
    p.light(dx + Math.cos(a) * (r + L), dy + Math.sin(a) * (r + L), C[3], 0.8);
  }
  // charged motes drifting up round it
  cycle(t, D, 14, o.seed + 2, 1.2, (age, life, r) => {
    const x = cx + r.range(-36, 36), y = cy + r.range(-30, 30) - age * 10, k = Math.sin((Math.PI * age) / life);
    p.dot(x, y, r.chance(0.5) ? C[5] : C[3], k);
    p.light(x, y, C[2], 0.4 * k);
  });
}
