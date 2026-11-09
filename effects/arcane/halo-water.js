import { hex, mix, cycle, clamp, TAU, WHITE } from "../../core/index.js";
import { D, haloMeta, centre, ph } from "./_halo.js";

// A water halo in the Japanese manner: a ring of flowing water behind the back, wobbling as waves run round it,
// white crests curling off its top like a woodblock wave; two streams trail from it and sway like a scarf,
// bubbles wobble up, drops fall and spread rings on the floor.
export const meta = haloMeta({
  name: "Halo: water",
  desc: "A ring of flowing water wobbles behind the back, white crests curling off it like a woodblock wave; two streams trail and sway, bubbles wobble up, drops fall into ripples.",
  tags: ["water", "wave", "japanese", "bubbles", "ribbon", "flow"],
  options: { palette: ["#081a52", "#1238a8", "#2a6ae8", "#5aa8ff", "#b4e0ff", "#ffffff"], seed: 5 },
});

// the ring's radius and thickness at angle a: waves running round it, thicker along the top
const ringR = (a, t) => 26 + 1.6 * Math.sin(3 * a - ph(t, 2)) + 0.9 * Math.sin(5 * a + ph(t, 3));
const ringW = (a, t) => 3.2 + 2.2 * (0.5 - 0.5 * Math.sin(a)) + 0.8 * Math.sin(4 * a - ph(t, 2));

export function drawBack(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  p.glow(cx, cy, 46, C[1], 0.32);
  // the trailing streams: from the ring's lower sides, hanging down and out, swaying like a scarf's ends
  for (const s of [-1, 1]) {
    let px = cx + s * 24, py = cy + 9;
    for (let i = 1; i <= 14; i++) {
      const u = i / 14, x = cx + s * (24 + 17 * u + Math.sin(ph(t, 2) - u * 4 + s) * 4 * u), y = Math.min(-2, cy + 9 + u * 19), w = 7 * (1 - u) + 1.5;
      p.beam(px, py, x, y, w + 2, C[0], u > 0.85 ? 0.6 : 1);
      p.beam(px, py, x, y, w, Math.sin(u * 9 - ph(t, 3)) > 0.3 ? C[3] : C[2], u > 0.9 ? 0.7 : 1);
      p.dot(x - s * w * 0.3, y - 1, i % 2 ? C[4] : C[5]);
      (px = x), (py = y);
    }
  }
  // the ring of water: deep inside, lit bands flowing round it, a bright skin on its outer edge
  p.shade(cx - 34, cy - 34, cx + 34, cy + 34, (x, y, out) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), r = ringR(a, t), w = ringW(a, t), e = (d - r) / w;
    if (Math.abs(e) > 1) return;
    const flow = Math.sin(6 * a - ph(t, 4) + e * 2);
    out.k = 0.18;
    out.l = C[2];
    if (e > 0.72) return dy < 4 ? C[5] : C[4];
    if (e < -0.7) return C[0];
    return flow > 0.55 ? C[4] : flow > -0.1 ? C[3] : e < -0.2 ? C[1] : C[2];
  });
  // crests curling off the top: little claws of foam, like a woodblock wave
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.33 + 0.12 * Math.sin(ph(t, 2) + i), r = ringR(a, t) + ringW(a, t), k = 0.5 + 0.5 * Math.sin(ph(t, 2) - i * 0.9);
    const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r, h = 2 + 3 * k;
    for (let j = 0; j <= h; j++) p.dot(bx + j * 0.7, by - j + (j > h - 1 ? 1 : 0), j > h - 1.5 ? C[5] : C[4]);
    p.dot(bx + h * 0.7 + 1, by - h + 2, C[5], k);
  }
}

export function draw(p, t, o) {
  const C = o.palette.map(hex), [cx, cy] = centre(t);
  // bubbles wobbling up: a thin skin, a glint, squashing and stretching as they rise
  cycle(t, D, 14, o.seed, 2.4, (age, life, r) => {
    const k = age / life, x = cx + r.range(-34, 34) + Math.sin(age * 3 + r.range(0, 6)) * 2.5, y = cy + 30 - age * r.range(14, 24), R = r.range(1.5, 3.2);
    const wob = Math.sin(age * 9 + r.range(0, 6)) * 0.25, a = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, age * 4);
    p.ellipse(x, y, R * (1 + wob) + 0.7, R * (1 - wob) + 0.7, C[3], a * 0.9);
    p.ellipse(x, y, R * (1 + wob) - 0.2, R * (1 - wob) - 0.2, C[1], a * 0.55);
    p.dot(x - R * 0.4, y - R * 0.4, WHITE, a);
  });
  // drops falling from the ring's foot, spreading rings on the floor
  cycle(t, D, 5, o.seed + 3, 1.3, (age, life, r) => {
    const x = cx + r.range(-14, 14), fall = 0.5, y0 = cy + 27;
    if (age < fall) {
      const y = y0 + (0 - y0) * (age / fall) ** 2;
      p.dot(x, y, C[5]);
      p.dot(x, y - 1, C[3]);
    } else {
      const k = (age - fall) / (life - fall);
      p.arc(x, 0.5, 2 + 9 * k, 1, 0, TAU, C[4], 1 - k);
      p.ellipse(x, 0.5, 2 + 9 * k, 0.4 + 1.6 * k, 0, 0);
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * TAU;
        p.dot(x + Math.cos(a) * (2 + 9 * k), 0.5 + Math.sin(a) * (0.5 + 2 * k), C[4], 1 - k);
      }
    }
  });
  // beads of spray thrown off the crest
  cycle(t, D, 10, o.seed + 7, 0.7, (age, life, r) => {
    const a = -Math.PI / 2 + r.range(-0.9, 0.9), sp = r.range(14, 30), x = cx + Math.cos(a) * 30 + Math.cos(a) * sp * age, y = cy + Math.sin(a) * 30 + Math.sin(a) * sp * age + 40 * age * age;
    p.dot(x, y, age < 0.3 ? C[5] : C[4], 1 - age / life);
  });
}
