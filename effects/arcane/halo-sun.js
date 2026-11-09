import { hex, mix, cycle, clamp, TAU, WHITE } from "../../core/index.js";
import { D, haloMeta, centre, ph } from "./_halo.js";

// A sun halo: a golden ring behind the back with eight blades of light, long and short in turn, turning slowly;
// flames lick along the ring, embers rise off it, and the whole thing pulses with heat.
export const meta = haloMeta({
  name: "Halo: sun",
  desc: "A golden ring floats behind the back with eight blades of light, long and short, turning slowly; flames lick along it, embers rise and it pulses with heat.",
  tags: ["sun", "fire", "flame", "gold", "rays"],
  options: { palette: ["#5a2406", "#b8580c", "#f09a1c", "#ffd04a", "#fff3b0", "#ffffff"], seed: 4 },
});

export function drawBack(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t), R = 23, turn = ph(t) / 4, pulse = 0.5 + 0.5 * Math.sin(ph(t, 2));
  p.glow(cx, cy, 46, C[1], 0.3 + 0.1 * pulse);
  p.glow(cx, cy, 26, C[2], 0.2 + 0.1 * pulse);
  // the blades: long on four, short on four, each a lit and a shaded half, a gem at its root
  for (let i = 0; i < 8; i++) {
    const a = turn + (i * TAU) / 8, L = i % 2 ? 8 : 15, w = i % 2 ? 0.16 : 0.2, c = Math.cos(a), s = Math.sin(a);
    const tipx = cx + c * (R + L), tipy = cy + s * (R + L), b0x = cx + Math.cos(a - w) * (R + 1), b0y = cy + Math.sin(a - w) * (R + 1), b1x = cx + Math.cos(a + w) * (R + 1), b1y = cy + Math.sin(a + w) * (R + 1);
    const mx = cx + c * (R + 1), my = cy + s * (R + 1);
    p.tri(b0x, b0y, tipx, tipy, mx, my, C[3]);
    p.tri(mx, my, tipx, tipy, b1x, b1y, C[1]);
    p.line(b0x, b0y, tipx, tipy, C[4]);
    p.line(b1x, b1y, tipx, tipy, C[0]);
    p.dot(tipx, tipy, C[5]);
    p.circle(cx + c * (R - 0.5), cy + s * (R - 0.5), i % 2 ? 1.6 : 2.2, i % 2 ? C[4] : C[5]);
    p.light(tipx, tipy, C[3], 0.5);
  }
  // the ring itself: gold, lit on its upper left, a thin inner ring inside it
  p.shade(cx - R - 3, cy - R - 3, cx + R + 3, cy + R + 3, (x, y) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (Math.abs(d - 18) < 0.55) return C[1];
    if (Math.abs(d - R) > 1.6) return;
    const lit = (-dx - dy) / d;
    return Math.abs(d - R) > 1.1 ? C[0] : lit > 0.5 ? C[4] : lit > -0.3 ? C[3] : C[2];
  });
  // flames licking along the ring, leaning the way they rise
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + 0.2, bx = cx + Math.cos(a) * R, by = cy + Math.sin(a) * R;
    const h = 3.5 + 3.5 * (0.5 + 0.5 * Math.sin(ph(t, 3 + (i % 3)) + i * 2.4)) * (Math.sin(a) < 0.4 ? 1 : 0.6);
    for (let k = 0; k <= h; k++) {
      const u = k / h, w = (1 - u) * 1.6, x = bx + Math.cos(a) * k * 0.35 + Math.sin(ph(t, 4) + i + k * 0.6) * u * 1.2, y = by - k;
      p.line(x - w, y, x + w, y, u < 0.3 ? C[4] : u < 0.65 ? C[3] : C[2], u > 0.8 ? 0.6 : 1);
    }
    p.light(bx, by - h * 0.5, C[2], 0.5);
  }
}

export function draw(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  // embers rising off the ring, wandering, cooling as they go
  cycle(t, D, 26, o.seed, 1.6, (age, life, r) => {
    const a = r.range(0, TAU), k = age / life, x = cx + Math.cos(a) * 24 + Math.sin(age * 3 + r.range(0, 6)) * 3, y = cy + Math.sin(a) * 24 - age * r.range(14, 26);
    p.dot(x, y, k < 0.3 ? C[5] : k < 0.6 ? C[3] : C[1], 1 - k);
    p.light(x, y, C[2], 0.5 * (1 - k));
  });
  // glints on the blades' tips
  cycle(t, D, 6, o.seed + 9, 0.5, (age, life, r) => {
    const a = r.range(0, TAU), k = Math.sin((Math.PI * age) / life), d = 34;
    p.dot(cx + Math.cos(a) * d, cy + Math.sin(a) * d, WHITE, k);
    p.dot(cx + Math.cos(a) * d + 1, cy + Math.sin(a) * d, C[4], k * 0.8);
    p.dot(cx + Math.cos(a) * d, cy + Math.sin(a) * d + 1, C[4], k * 0.8);
  });
}
