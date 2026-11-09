import { fit, hex, mix, clamp, wrap, rand, noise, cycle, TAU, WHITE } from "../../core/index.js";
import { rows, clip, bayer } from "../weather/_lib.js";

// A quiet tea scene: sun through shoji screens, bamboo-leaf shadows swaying on the paper, dust turning in the
// light. On a dark wooden table, a hand in a kimono sleeve tilts a red clay kyusu and pours a bright arc of
// matcha into a raku bowl; the stream flows and wobbles, splashes and ripples on the frothy surface, steam curls
// up. A chasen and a plate of sakura wagashi wait beside it. A seamless loop for a background.
const L = 6, TABLE = -50;
const POT = { x: 64, y: -116, th: -0.62 };
const BOWL = { x: -14, rim: -66, base: -40, rx: 27, ry: 6.5 };
const SURF = { y: -62.5, rx: 23, ry: 5 };

export const meta = {
  name: "Matcha pour",
  desc: "A hand in a kimono sleeve pours a bright arc of matcha from a red clay kyusu into a raku bowl on a wooden table, sun through shoji, leaf shadows swaying, steam curling.",
  tags: ["water", "tea", "matcha", "pour", "japanese", "cozy", "scene", "background", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 180],
  duration: L,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    palette: ["#24400e", "#3f6c16", "#62992a", "#8fc444", "#c6e67c", "#eef8c8"], // the matcha, deep to froth
    clay: ["#2e140c", "#5a2616", "#8a3e22", "#b65c32", "#dc8a56", "#f4c49a"],
    sleeve: ["#141a36", "#22305e", "#34488a", "#5a72b8"],
    seed: 4,
  },
};

const SHOJI = ["#9a8460", "#c4ae86", "#e2d2ac", "#f4e8c8", "#fffaea"].map(hex);
const WOOD = ["#1a0e08", "#2e1a10", "#46281a", "#5e3824", "#7a4a30"].map(hex);
const RAKU = ["#121014", "#1e1a22", "#2e2834", "#443c4c", "#6a6072"].map(hex);
const SKIN = ["#a8644a", "#d08e6c", "#f0b894", "#ffd8bc"].map(hex);
const INK = hex("#0e0806");

// rotate (x, y) by a
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const ph = (t) => (TAU * t) / L;

// bamboo leaves outside the screen, their shadows swaying on the paper: stamped into a mask each frame
const LEAVES = Array.from({ length: 16 }, (_, i) => ({ x: -150 + rand(9, i, 1) * 170, y: -176 + rand(9, i, 2) * 90, a: -0.4 + rand(9, i, 3) * 1.4, l: 10 + rand(9, i, 4) * 9, k: 1 + (i % 2) }));
const SH = new Uint8Array(320 * 130);
function leafShadows(t) {
  SH.fill(0);
  const put = (x, y) => {
    const i = Math.floor(x + 160), j = Math.floor(y + 180);
    if (i >= 0 && i < 320 && j >= 0 && j < 130) SH[j * 320 + i] = 1;
  };
  for (const f of LEAVES) {
    const a = f.a + 0.12 * Math.sin(ph(t) * f.k + f.x), cx = f.x + 3 * Math.sin(ph(t) * f.k + f.y), ca = Math.cos(a), sa = Math.sin(a);
    for (let u = 0; u < f.l; u += 0.5) {
      const hw = 2.6 * Math.sin((Math.PI * u) / f.l) ** 0.7;
      for (let v = -hw; v <= hw; v += 0.5) put(cx + u * ca - v * sa, f.y + u * sa + v * ca);
    }
  }
  // a stem
  for (let y = -180; y < -95; y++) put(-60 - 0.08 * (y + 180) - 2 * Math.sin(ph(t)), y);
}

// the room that never moves (paper, lattice, wood), worked out once
let ROOM = null;
function room() {
  if (ROOM) return ROOM;
  ROOM = new Uint32Array(320 * 180);
  for (let j = 0; j < 180; j++)
    for (let i = 0; i < 320; i++) {
      const x = i - 160 + 0.5, y = j - 180 + 0.5;
      let c;
      if (y < TABLE) {
        const gx = ((x + 160) % 40 + 40) % 40, gy = ((y + 180) % 34 + 34) % 34, frame = x > 118 && x < 124;
        if (gx < 1.5 || gy < 1.5 || frame) c = gx < 0.75 || gy < 0.75 ? WOOD[2] : WOOD[3];
        else {
          const lit = clamp(1 - Math.hypot(x + 120, y + 170) / 300), f = 1 + lit * 3.2 + (bayer(x, y) - 0.5) * 0.9;
          c = x > 120 ? SHOJI[1] : SHOJI[Math.max(0, Math.min(4, Math.floor(f)))];
        }
      } else if (y < TABLE + 1.5) c = WOOD[4];
      else {
        const plank = Math.floor((y - TABLE) / 13), seam = (y - TABLE) % 13 < 1, gr = noise(x / 40 + plank * 7, y / 2.5 + plank * 3);
        const lit = clamp(0.6 - (x + 160) / 400);
        c = seam ? WOOD[0] : WOOD[Math.max(1, Math.min(4, Math.floor(1.6 + gr * 1.4 + lit * 1.2 + (bayer(x, y) - 0.5) * 0.6)))];
      }
      ROOM[j * 320 + i] = c;
    }
  return ROOM;
}
const LEAF_SHADE = new Map();
const shaded = (c) => LEAF_SHADE.get(c) ?? (LEAF_SHADE.set(c, mix(c, hex("#7a7050"), 0.38)), LEAF_SHADE.get(c));

// a convex polygon filled a row at a time (much faster than p.poly for big shapes)
function fill(p, pts, c) {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  for (let y = Math.ceil(y0 - 0.5); y <= Math.floor(y1 - 0.5); y++) {
    const yc = y + 0.5;
    let xl = Infinity, xr = -Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > yc === yj > yc) continue;
      const x = xi + ((yc - yi) * (xj - xi)) / (yj - yi);
      (xl = Math.min(xl, x)), (xr = Math.max(xr, x));
    }
    const a = Math.ceil(xl - 0.5), b = Math.min(160, Math.floor(xr - 0.5));
    if (b >= a) p.rect(a, y, b - a + 1, 1, c);
  }
}

// the stream: from the spout tip, an arc that falls faster and faster into the bowl
function stream(t, tip) {
  const [x0, y0] = tip, x1 = BOWL.x + 9, y1 = SURF.y, wob = Math.sin(ph(t) * 3) * 0.8;
  return (u) => [x0 + (x1 - x0) * (1 - (1 - u) ** 1.7) + wob * u * (1 - u) * 4, y0 + (y1 - y0) * u ** 1.5];
}

export function draw(p0, t, o) {
  const p = clip(p0, meta), C = fit(o.palette, 6).map(hex), K = fit(o.clay, 6).map(hex), SL = fit(o.sleeve, 4).map(hex);
  const pot = { ...POT, th: POT.th + 0.025 * Math.sin(ph(t)), y: POT.y + 0.6 * Math.sin(ph(t) * 2) };
  const P = (x, y) => {
    const [rx, ry] = rot(x, y, pot.th);
    return [pot.x + rx, pot.y + ry];
  };
  const tip = P(-34, -9), S = stream(t, tip);

  // ---- the room: the cached screens and table, leaf shadows laid over the paper
  const RM = room();
  leafShadows(t);
  rows(p0, meta, -180, 0, (y, R) => {
    const j = Math.floor(y + 180), row = j * 320;
    for (let i = 0; i < 320; i++) {
      const c = RM[row + i];
      R.c[i] = j < 130 && SH[row + i] && i < 280 && c !== WOOD[2] && c !== WOOD[3] ? shaded(c) : c;
    }
  });
  // dust turning in the light
  cycle(t, L, 30, o.seed, L, (age, life, r) => {
    const x = -150 + r.range(0, 200) + Math.sin(ph(age) + r.range(0, 6)) * 6, y = -175 + r.range(0, 110) + wrap(age * r.range(2, 6), 20) - 10;
    p.dot(x, y, hex("#fff4d0"), 0.4 + 0.4 * Math.sin(ph(age) * 2 + r.range(0, 6)));
  });

  // ---- shadows on the table
  p.ellipse(BOWL.x + 6, BOWL.base + 2, BOWL.rx + 4, 4, WOOD[0], 0.7);
  p.ellipse(-102, -38, 16, 3, WOOD[0], 0.6);
  p.ellipse(-62, -38, 7, 2, WOOD[0], 0.6);

  // ---- the plate of wagashi: a pale glazed dish, two pink sakura mochi with a leaf
  p.ellipse(-104, -42, 17, 4, hex("#d8d4c8"));
  p.ellipse(-104, -43, 14, 3, hex("#f2eee4"));
  for (const [mx, my] of [[-110, -47], [-98, -48]]) {
    p.ellipse(mx, my, 6, 4, hex("#e88aa4"));
    p.ellipse(mx - 1, my - 1, 4, 2.5, hex("#ffc4d4"));
    p.dot(mx - 2, my - 2, WHITE);
  }
  p.ellipse(-104, -44, 4, 1.2, hex("#5a8a3a"));

  // ---- the chasen: a bamboo handle and a fan of fine tines
  for (let k = -5; k <= 5; k++) p.line(-62, -54, -62 + k * 0.9, -40, k % 2 ? hex("#e8d29a") : hex("#c8ac6a"));
  p.rect(-64, -66, 4, 13, hex("#d4b878"));
  p.rect(-64, -66, 1, 13, hex("#f0dca6"));
  p.rect(-61, -66, 1, 13, hex("#a88a50"));
  p.rect(-64, -59, 4, 1, hex("#8a6a3a"));

  // ---- the bowl: dark raku, a cream glaze dripping down from the rim, a lit edge on the left
  p.shade(BOWL.x - BOWL.rx - 1, BOWL.rim - 1, BOWL.x + BOWL.rx + 1, BOWL.base + 1, (x, y) => {
    const v = (y - BOWL.rim) / (BOWL.base - BOWL.rim), w = BOWL.rx * (1 - 0.32 * v ** 2.2), dx = x - BOWL.x;
    if (v < 0 || v > 1 || Math.abs(dx) > w) return;
    if (v > 0.9 && Math.abs(dx) > w - 6) return;
    if (v > 0.9) return RAKU[1];
    const n = dx / w, drip = v < 0.18 + 0.12 * Math.abs(Math.sin(dx * 0.7)) + 0.08 * noise(dx * 0.4, 3);
    if (drip) return n < -0.5 ? hex("#f4ecd8") : hex("#d8ccb0");
    return n < -0.75 ? RAKU[3] : n < -0.4 ? RAKU[2] : n > 0.7 ? RAKU[0] : RAKU[1];
  });
  // the rim and the tea inside it
  p.ellipse(BOWL.x, BOWL.rim, BOWL.rx, BOWL.ry, hex("#e8dcc0"));
  p.ellipse(BOWL.x, BOWL.rim + 0.5, BOWL.rx - 1.5, BOWL.ry - 1, RAKU[2]);
  // the matcha: a bright frothy surface, darker where it meets the bowl, swirling round
  p.shade(BOWL.x - SURF.rx, SURF.y - SURF.ry, BOWL.x + SURF.rx, SURF.y + SURF.ry, (x, y) => {
    const u = (x - BOWL.x) / SURF.rx, v = (y - SURF.y) / SURF.ry, d = u * u + v * v;
    if (d > 1) return;
    const a = Math.atan2(v, u) - ph(t), sw = Math.sin(a * 3 + Math.sqrt(d) * 7);
    if (d > 0.72) return C[1];
    const foam = noise(x * 0.55 + Math.cos(ph(t)) * 3, y * 1.4 + Math.sin(ph(t)) * 3);
    return foam > 0.35 ? C[5] : foam > 0.05 || sw > 0.6 ? C[4] : C[3];
  });
  // ripples spreading from where the stream lands, and froth bubbles popping
  const [hx, hy] = S(1);
  cycle(t, L, 4, o.seed + 1, 1.2, (age, life) => {
    const k = age / life;
    p.ellipse(hx, hy, 2 + 12 * k, 0.7 + 2.6 * k, 0, 0);
    p.arc(hx, hy, 2 + 12 * k, 1, 0, TAU, C[5], (u) => (1 - k) * 0.8);
  });
  cycle(t, L, 10, o.seed + 2, 0.6, (age, life, r) => {
    const x = BOWL.x + r.range(-17, 17), y = SURF.y + r.range(-2.5, 2.5);
    if (age / life < 0.8) p.dot(x, y, WHITE, 1 - age / life);
  });

  // ---- the stream: a bright rope of tea, light running down it, wobbling as it falls
  for (let k = 0; k < 40; k++) {
    const u0 = k / 40, u1 = (k + 1) / 40, [x0, y0] = S(u0), [x1, y1] = S(u1), w = 4.6 - 1.6 * u0;
    const band = Math.sin((u0 * 9 - t * (L / 1.5) * 1.5) * TAU / 2.25);
    p.beam(x0, y0, x1, y1, w + 1, C[1]);
    p.beam(x0, y0, x1, y1, w, band > 0.55 ? C[3] : C[2]);
    p.line(x0 - w * 0.22, y0, x1 - w * 0.22, y1, band > 0.2 ? C[5] : C[4]);
  }
  // splashes where it lands
  cycle(t, L, 14, o.seed + 3, 0.32, (age, life, r) => {
    const vx = r.range(-28, 28), vy = -r.range(20, 50), x = hx + vx * age, y = hy + vy * age + 240 * age * age;
    if (y < hy + 1) p.dot(x, y, r.chance(0.5) ? C[4] : C[5]);
  });

  // ---- steam curling up out of the bowl
  cycle(t, L, 7, o.seed + 4, 3, (age, life, r) => {
    const k = age / life, x0 = BOWL.x + r.range(-16, 4);
    for (let j = 0; j < 5; j++) {
      const a = age - j * 0.12;
      if (a < 0) continue;
      const x = x0 + Math.sin(a * 2.2 + r.range(0, 6)) * 5 * a, y = SURF.y - 4 - a * 16;
      p.disc(x, y, 2.5 + a * 2.4, WHITE, 0.3 * Math.min(1, a * 3) * (1 - k));
    }
  });

  // ---- the kyusu: a round red clay body, a lid and knob, a spout pouring, the side handle up to the hand
  const lx = -0.6, ly = -0.8;
  const body = (x, y) => {
    // local coordinates of a screen pixel, undoing the tilt
    const [u, v] = rot(x - pot.x, y - pot.y, -pot.th);
    return [u, v];
  };
  // the handle: a straight clay rod off the back of the body
  const h0 = P(16, -5), h1 = P(38, -15);
  p.beam(h0[0], h0[1], h1[0], h1[1], 7, K[1]);
  p.beam(h0[0], h0[1] - 1, h1[0], h1[1] - 1, 4, K[3]);
  p.circle(h1[0], h1[1], 3.4, K[2]);
  // the spout: a tapering tube
  const s0 = P(-16, 3), s1 = P(-34, -9);
  for (let k = 0; k <= 10; k++) {
    const u = k / 10, x = s0[0] + (s1[0] - s0[0]) * u, y = s0[1] + (s1[1] - s0[1]) * u, r = 4.2 - 2 * u;
    p.circle(x, y, r + 0.8, K[0]);
    p.circle(x, y, r, K[2]);
    p.circle(x - r * 0.3, y - r * 0.4, r * 0.45, K[4]);
  }
  p.shade(pot.x - 30, pot.y - 30, pot.x + 30, pot.y + 30, (x, y) => {
    const [u, v] = body(x, y), d = (u / 20) ** 2 + (v / 15.5) ** 2;
    if (d > 1.1) return;
    if (d > 1) return K[0];
    // shading on the ball: lit from the window, a specular glint, a band of carved rings
    const nx = u / 20, ny = v / 15.5, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), [sx, sy] = rot(nx, ny, pot.th);
    const lum = -(sx * lx + sy * ly) * 0.8 + nz * 0.5 + (bayer(x, y) - 0.5) * 0.25;
    if (Math.abs(v - 4) < 0.6 && d < 0.9) return K[1];
    if ((sx + 0.45) ** 2 + (sy + 0.5) ** 2 < 0.03) return K[5];
    return K[Math.max(1, Math.min(4, Math.floor(1.8 + lum * 2.6)))];
  });
  // the lid and its knob
  const l0 = P(0, -15), kb = P(0, -19.5);
  p.shade(pot.x - 16, pot.y - 30, pot.x + 16, pot.y - 2, (x, y) => {
    const [u, v] = body(x, y), d = (u / 11) ** 2 + ((v + 15) / 3.2) ** 2;
    if (d > 1) return;
    return d > 0.7 ? K[1] : u < -2 ? K[4] : K[3];
  });
  p.circle(kb[0], kb[1], 2.8, K[1]);
  p.circle(kb[0] - 0.5, kb[1] - 0.6, 1.8, K[3]);
  p.dot(kb[0] - 1, kb[1] - 1.5, K[5]);

  // ---- the hand round the handle, the sleeve running off the right edge
  const [hx2, hy2] = h1;
  fill(p, [[hx2 + 4, hy2 - 9], [175, -186], [175, -118], [hx2 + 9, hy2 + 7]], SL[1]);
  fill(p, [[hx2 + 5, hy2 - 9], [175, -186], [175, -178], [hx2 + 8, hy2 - 6]], SL[3]);
  for (let k = 0; k < 3; k++) p.line(hx2 + 14 + k * 14, hy2 - 8 - k * 4, hx2 + 30 + k * 18, hy2 + 14 + k * 4, SL[0]);
  fill(p, [[hx2 + 3, hy2 - 8], [hx2 + 6, hy2 - 9], [hx2 + 10, hy2 + 7], [hx2 + 7, hy2 + 8]], hex("#f2ecdc"));
  p.ellipse(hx2 + 1, hy2 - 1, 6, 5, SKIN[1]);
  p.ellipse(hx2, hy2 - 2.5, 4, 2.6, SKIN[2]);
  for (let k = 0; k < 3; k++) p.line(hx2 - 5, hy2 + k * 1.8 - 1, hx2 - 1, hy2 + k * 1.8 + 1, SKIN[0]);
  p.line(hx2 - 2, hy2 - 5, hx2 - 6, hy2 - 2, SKIN[3]);

  // warm light pooling on the bowl and the stream
  p.glow(BOWL.x, BOWL.rim, 40, C[3], 0.12);
}
