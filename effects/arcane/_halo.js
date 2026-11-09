// Shared by the four back-halo skins (arcane/halo-moon, halo-water, halo-sun, halo-thunder): a ring of light
// floating behind a character's back, bobbing gently, each a seamless 4 s loop.
import { TAU, WHITE } from "../../core/index.js";

export const D = 4, CY = -39;
export const haloMeta = ({ name, desc, tags, options }) => ({
  name, desc, tags: ["arcane", "halo", "skin", "aura", "back", "float", ...tags, "actor", "loop"],
  size: [128, 124], origin: [64, 106], duration: D, loop: true, fps: 30, bg: "ground", actor: 2, options,
});
/** The halo's centre at t: it floats, bobbing once a loop. */
export const centre = (t) => [0, CY + Math.sin((TAU * t) / D) * 1.6];
export const ph = (t, n = 1) => (TAU * n * t) / D;

/** A comet of light running round a circle: a bright head at angle a, a tail len radians long fading behind it. */
export function arcTrail(p, cx, cy, r, a, len, cols, dir = 1, k = 1) {
  const n = Math.ceil(len * r * 1.3);
  for (let i = n; i >= 0; i--) {
    const u = i / n, ang = a - dir * u * len;
    p.dot(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, u < 0.12 ? WHITE : u < 0.45 ? cols[2] : cols[1], k * (1 - u) ** 0.7);
  }
  p.light(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cols[2], 0.8 * k);
}

/** Is local point (u, v) (in units of the disc's radius) inside a mitsudomoe (three commas) turned by rot? */
export function tomoe(u, v, rot) {
  const d = Math.hypot(u, v);
  if (d > 0.92) return false;
  const a = Math.atan2(v, u);
  for (let i = 0; i < 3; i++) {
    const h = rot + (i * TAU) / 3, hx = Math.cos(h) * 0.46, hy = Math.sin(h) * 0.46;
    if (Math.hypot(u - hx, v - hy) < 0.3) return true;
    // the tail: sweeping back round from the head along the rim, thinning to a point
    const back = ((h - a) % TAU + TAU) % TAU;
    if (back < 1.7 && d > 0.52 + back * 0.08 && d < 0.84) return true;
  }
  return false;
}
