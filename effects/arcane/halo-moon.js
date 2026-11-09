import { hex, mix, cycle, sparkle, clamp, TAU, WHITE } from "../../core/index.js";
import { D, haloMeta, centre, ph, arcTrail } from "./_halo.js";

// A moon halo: a great crescent floating behind the back, two thin arcs of moonlight circling opposite ways,
// two little moons showing their phases, stardust drifting down and sparkles twinkling all round.
export const meta = haloMeta({
  name: "Halo: moon",
  desc: "A great pale crescent floats behind the back, two thin arcs of moonlight circle opposite ways, two little moons show their phases, stardust drifts and sparkles twinkle.",
  tags: ["moon", "crescent", "stars", "sparkle", "night"],
  options: { palette: ["#141a4a", "#3a52b8", "#8aa8ff", "#d4e2ff", "#ffffff"], seed: 3 },
});

export function drawBack(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  p.glow(cx, cy, 44, C[1], 0.3);
  p.glow(cx, cy, 24, C[2], 0.18);
  // a faint inner ring of dots
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU + ph(t) / 4;
    p.dot(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19, C[1], i % 2 ? 0.9 : 0.4);
  }
  // the crescent: a disc with an offset bite out of it, swaying a little; pale at its belly, thin at its horns
  const sw = 0.5 + 0.22 * Math.sin(ph(t)), bx = cx + Math.cos(sw - 1.9) * 7, by = cy + Math.sin(sw - 1.9) * 7;
  p.shade(cx - 29, cy - 29, cx + 29, cy + 29, (x, y, out) => {
    const d = Math.hypot(x - cx, y - cy), d2 = Math.hypot(x - bx, y - by);
    if (d > 28 || d2 < 26.5) return;
    const th = clamp((d2 - 26.5) / 7), edge = d > 26.8 || d2 < 27.6;
    out.k = 0.25 * th;
    out.l = C[2];
    return edge ? C[4] : th > 0.75 ? C[4] : th > 0.5 ? C[3] : th > 0.25 ? mix(C[2], C[3], 0.5) : th > 0.1 ? C[2] : C[1];
  });
  // two arcs of moonlight circling opposite ways, each led by a star
  arcTrail(p, cx, cy, 32, ph(t) - 1, 2.6, C, 1);
  arcTrail(p, cx, cy, 34.5, -ph(t) + 2, 2.0, C, -1, 0.9);
  arcTrail(p, cx, cy, 32, ph(t) - 1 + Math.PI, 1.3, C, 1, 0.7);
  // two little moons on the lower sides: a half moon and a full one
  for (const [s, full] of [[-1, false], [1, true]]) {
    const mx = cx + s * 21, my = cy + 10 + Math.sin(ph(t, 2) + s) * 1.2;
    p.circle(mx, my, 3.6, C[0]);
    p.shade(mx - 3, my - 3, mx + 3, my + 3, (x, y) => {
      if (Math.hypot(x - mx, y - my) > 3) return;
      return full || x > mx ? (x - mx + (y - my) < -1.5 ? WHITE : C[3]) : C[1];
    });
    p.glow(mx, my, 9, C[2], 0.45);
  }
}

export function draw(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  // sparkles twinkling round the halo, in front and behind
  cycle(t, D, 16, o.seed, 0.9, (age, life, r) => {
    const a = r.range(0, TAU), d = r.range(12, 40), k = Math.sin((Math.PI * age) / life);
    sparkle(p, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 1 + 2.4 * k, WHITE, C[2], 0.6 * k);
  });
  // stardust sifting down
  cycle(t, D, 22, o.seed + 5, 2.2, (age, life, r) => {
    const x = cx + r.range(-36, 36) + Math.sin(age * 2 + r.range(0, 6)) * 2, y = cy - 24 + r.range(0, 30) + age * r.range(8, 16), k = 1 - age / life;
    p.dot(x, y, r.chance(0.4) ? WHITE : C[3], k);
    if (k > 0.6) p.light(x, y, C[2], 0.4 * k);
  });
}
