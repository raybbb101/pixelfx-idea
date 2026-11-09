// A rigged baby fire dragon for spawn/dragon-hatch: shaded parts (head, snout, jaw, eye and lid, horns, neck,
// body and belly plates, arms with clawed hands, legs, tail with a flame tip, wings) posed every frame and drawn
// a pixel at a time into a small buffer, each part with a darker rim against the ones behind it, then laid on the
// screen with a 1 px outline round the whole silhouette. Facing right; (0, 0) is between its feet.
import { hex, mix, WHITE } from "../../core/index.js";

export const RAMPS = {
  body: ["#4a1008", "#a8280f", "#de4a1a", "#ff8a40"].map(hex),
  belly: ["#9a5212", "#e8a030", "#ffd060", "#fff0a8"].map(hex),
  horn: ["#8a6a4a", "#d8c090", "#fff4d8"].map(hex),
  wing: ["#9a3a10", "#e8742a", "#ffb060"].map(hex),
};
export const INK = hex("#2a0a06");
const W = 96, H = 80, OX = 48, OY = 64;

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

export class Doll {
  constructor() {
    this.c = new Uint32Array(W * H);
    this.id = new Uint16Array(W * H);
    this.n = 0;
  }
  clear() {
    this.c.fill(0);
    this.id.fill(0);
    this.n = 0;
  }
  // a filled ellipse at (cx, cy), radii rx, ry, turned by a; shade(nx, ny, edge) picks the colour
  ellipse(cx, cy, rx, ry, a, ramp, opts = {}) {
    const id = ++this.n, R = Math.max(rx, ry) + 1, light = opts.light ?? 0;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const ix = x + OX, iy = y + OY;
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
        const [u, v] = rot(x + 0.5 - cx, y + 0.5 - cy, -a), nx = u / rx, ny = v / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        const i = iy * W + ix;
        // the lit side faces up and left (in screen terms, so turn the normal back)
        const [sx, sy] = rot(nx, ny, a), lum = -sx * 0.55 - sy * 0.75 + light;
        let col = opts.flat ?? (lum > 0.45 ? ramp[3] ?? ramp[2] : lum > 0.0 ? ramp[2] : lum > -0.5 ? ramp[1] : ramp[0]);
        if (opts.fn) col = opts.fn(u, v, nx, ny, col) ?? col;
        // a darker rim where this part lies over another
        const over = this.id[i] && d > 0.8 && !opts.noRim;
        this.c[i] = over ? mix(ramp[0], ramp[1], 0.45) : col;
        this.id[i] = id;
      }
  }
  // a capsule from (x0, y0) to (x1, y1), radii r0 to r1
  capsule(x0, y0, x1, y1, r0, r1, ramp, opts = {}) {
    const id = ++this.n, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6, R = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
      for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        const ix = x + OX, iy = y + OY;
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
        const px = x + 0.5, py = y + 0.5, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
        const qx = x0 + dx * u - px, qy = y0 + dy * u - py, r = r0 + (r1 - r0) * u, d = Math.hypot(qx, qy) / r;
        if (d > 1) continue;
        const i = iy * W + ix, lum = (qx * 0.55 + qy * 0.75) / r;
        const col = opts.flat ?? (lum > 0.35 ? ramp[3] ?? ramp[2] : lum > -0.2 ? ramp[2] : ramp[1]);
        this.c[i] = this.id[i] && d > 0.78 && !opts.noRim ? mix(ramp[0], ramp[1], 0.45) : col;
        this.id[i] = id;
      }
  }
  dot(x, y, c) {
    const ix = Math.floor(x) + OX, iy = Math.floor(y) + OY;
    if (ix >= 0 && iy >= 0 && ix < W && iy < H) (this.c[iy * W + ix] = c), this.id[iy * W + ix] || (this.id[iy * W + ix] = ++this.n);
  }
  /** Lay it on the painter with its feet at (X, Y), a 1 px outline round it; skip rows at or below cutY (world). */
  blit(p, X, Y, cutY = Infinity, a = 1) {
    X = Math.round(X);
    Y = Math.round(Y);
    const has = (ix, iy) => ix >= 0 && iy >= 0 && ix < W && iy < H && this.c[iy * W + ix] && iy - OY + Y < cutY;
    for (let iy = 0; iy < H; iy++) {
      const wy = iy - OY + Y;
      if (wy >= cutY + 1) break;
      for (let ix = 0; ix < W; ix++) {
        const wx = ix - OX + X;
        if (has(ix, iy)) p.dot(wx, wy, this.c[iy * W + ix], a);
        else if (wy < cutY && (has(ix - 1, iy) || has(ix + 1, iy) || has(ix, iy - 1) || has(ix, iy + 1))) p.dot(wx, wy, INK, a);
      }
    }
  }
}

// a two-bone arm from shoulder S to hand H, upper a and forearm b long, elbow bending down (bend 1) or up (-1)
export function reach(S, Hd, a, b, bend = 1) {
  let dx = Hd[0] - S[0], dy = Hd[1] - S[1], d = Math.hypot(dx, dy);
  if (d > a + b - 0.01) {
    const k = (a + b - 0.01) / d;
    (dx *= k), (dy *= k), (d = a + b - 0.01);
  }
  const ang = Math.atan2(dy, dx), cosA = (a * a + d * d - b * b) / (2 * a * d), A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const e = [S[0] + Math.cos(ang + A * bend) * a, S[1] + Math.sin(ang + A * bend) * a];
  return { elbow: e, hand: [S[0] + dx, S[1] + dy] };
}

/**
 * Draw the dragon into doll D in pose P (relative to its feet): tilt (body lean about the hips, + forward),
 * head (head turn about the neck, + nods down), jaw (0..1 open), eye (1 open .. 0 shut, -1 a happy arc),
 * look (pupil -1..1), puff (chest swell 0..1), squash (y scale), wing (0 folded .. 1 up), tail (sway),
 * legLift (the near foot raised), handN / handF ([x, y] relative targets, or null for the resting pose).
 * parts: "all", "body" (no arms), "arms", or "none" (only work out where things are).
 */
export function drawDragon(D, P, parts = "all") {
  const R = RAMPS, sq = P.squash ?? 1, hip = [0, -6 * sq];
  const T = (x, y) => {
    const [rx, ry] = rot(x, (y + 6) * sq - 6 * (1 - sq) * 0, P.tilt ?? 0);
    return [hip[0] + rx, hip[1] + ry];
  };
  const neck = T(3, -20), headA = (P.tilt ?? 0) + (P.head ?? 0);
  const Hd = (x, y) => {
    const [rx, ry] = rot(x, y, headA);
    return [neck[0] + rx, neck[1] + ry];
  };
  const shN = T(4, -16), shF = T(-1, -17);
  const restN = T(8, -7), restF = T(4, -8);
  const armN = reach(shN, P.handN ?? restN, 6, 6.5, 1), armF = reach(shF, P.handF ?? restF, 6, 6.5, 1);
  const body = parts === "all" || parts === "body", arms = parts === "all" || parts === "arms", jaw = P.jaw ?? 0;
  const arm = (A, S, far) => {
    const rp = far ? R.body.map((c) => mix(c, R.body[0], 0.35)) : R.body;
    D.capsule(S[0], S[1], A.elbow[0], A.elbow[1], 2.1, 1.8, rp);
    D.capsule(A.elbow[0], A.elbow[1], A.hand[0], A.hand[1], 1.8, 1.5, rp);
    D.ellipse(A.hand[0], A.hand[1], 2, 1.7, 0, rp);
    // three claws hooked forward
    const ang = Math.atan2(A.hand[1] - A.elbow[1], A.hand[0] - A.elbow[0]);
    for (const s of [-0.7, 0, 0.7]) D.dot(A.hand[0] + Math.cos(ang + s) * 2.6, A.hand[1] + Math.sin(ang + s) * 2.6, R.horn[1]);
  };
  if (body) {
    // the far wing, folded back or raised
    const wa = -0.6 - 1.4 * (P.wing ?? 0), w0 = T(-3, -18);
    const wing = (o, dark) => {
      const tip = [w0[0] + Math.cos(Math.PI + wa) * 11, w0[1] + Math.sin(Math.PI + wa) * 11], mid = [w0[0] + Math.cos(Math.PI + wa + 0.7) * 8, w0[1] + Math.sin(Math.PI + wa + 0.7) * 8];
      const rp = dark ? R.wing.map((c) => mix(c, R.wing[0], 0.25)) : R.wing;
      D.capsule(w0[0] + o, w0[1], tip[0] + o, tip[1], 1.6, 0.8, [rp[0], rp[1], rp[2], rp[2]]);
      D.capsule(tip[0] + o, tip[1], mid[0] + o, mid[1] + 2, 1.6, 2.2, [rp[0], rp[1], rp[1], rp[2]]);
      D.capsule(mid[0] + o, mid[1] + 2, w0[0] + o + 1, w0[1] + 4, 2.2, 2.6, [rp[0], rp[1], rp[1], rp[2]]);
    };
    wing(-2, true);
    if (arms) arm(armF, shF, true);
    // the tail: a tapering chain curling back, a little flame on the tip
    const tw = P.tail ?? 0;
    let prev = T(-4, -5);
    for (let k = 1; k <= 6; k++) {
      const u = k / 6, a = Math.PI - 0.5 + u * 1.2 + tw * u, pt = [prev[0] + Math.cos(a) * 3.2, prev[1] - Math.sin(a) * 2.2 - 0.6];
      D.capsule(prev[0], prev[1], pt[0], pt[1], 3.8 - u * 2.4, 3.6 - u * 2.6, R.body);
      prev = pt;
    }
    D.ellipse(prev[0] - 1, prev[1] - 2, 1.6, 2.6, -0.4, ["#c8501a", "#ffa040", "#ffe080", "#fff8d0"].map(hex), { noRim: true });
    // the far leg, then the body with its belly plates, then the near leg
    const lift = P.legLift ?? 0;
    D.ellipse(...T(-3, -5), 4.2, 3.6, 0, R.body.map((c) => mix(c, R.body[0], 0.35)));
    D.ellipse(...T(-1, -1.2), 3.6, 1.8, 0, R.body.map((c) => mix(c, R.body[0], 0.35)));
    const puff = 1 + 0.12 * (P.puff ?? 0);
    D.ellipse(...T(0, -12), 7.6 * puff, 9.2, 0.08, R.body);
    D.ellipse(...T(3, -12.5), 5.2 * puff, 7.6, 0.12, R.belly, {
      fn: (u, v, nx, ny, col) => (Math.abs(((v + 20) % 2.6) - 1.3) < 0.45 ? R.belly[1] : col),
    });
    D.ellipse(...T(1.5, -4.2 - lift * 3), 4, 3.4, 0, R.body);
    D.ellipse(...T(4, -1.2 - lift * 5), 4, 1.9, 0, R.body);
    for (const s of [0, 1.6, 3.2]) D.dot(...T(6.5 + s * 0.4, -0.6 - lift * 5 + s * 0.2), R.horn[1]);
    // the neck and the head: a round skull, a snout, a jaw that drops, two horns, a big eye with a lid
    D.capsule(...T(1, -16), ...Hd(1, -2), 3.6, 3.4, R.body);
    D.capsule(...Hd(-3, -6), ...Hd(-8, -13), 1.6, 0.9, R.horn);
    D.capsule(...Hd(1, -8), ...Hd(-2, -15), 1.6, 0.9, R.horn);
    D.ellipse(...Hd(0, -6), 8.4, 7.6, headA, R.body);
    D.ellipse(...Hd(7.5 + jaw * 0.6, -2 + jaw * 2.4), 5.4, 2.4, headA + 0.15 + jaw * 0.55, R.body, { light: -0.2 });
    if (jaw > 0.15) {
      const m = Hd(8, -3 + jaw * 1.2);
      D.ellipse(m[0], m[1], 3.6 * jaw + 1, 1.2 + jaw * 1.4, headA + jaw * 0.3, [INK, hex("#6a1008"), hex("#ff8a40"), hex("#ffe080")], { flat: hex("#5a0c06"), noRim: true });
    }
    D.ellipse(...Hd(7.5, -5.2), 5.6, 3.4, headA - 0.12, R.body);
    D.dot(...Hd(12.4, -6.2), INK);
    // the cheek, the eye (open, shut, or a happy arc) and its glint
    D.ellipse(...Hd(4, -1.6), 1.8, 1.1, 0, [hex("#ff8a8a")], { flat: hex("#ff8a7a"), noRim: true });
    const e = Hd(3.4, -7.4), eye = P.eye ?? 1;
    if (eye > 0.12) {
      const look = P.look ?? 0;
      D.ellipse(e[0], e[1], 2.9, 3.4 * eye, headA, [INK, WHITE, WHITE, WHITE], { flat: WHITE });
      D.ellipse(e[0] + 0.6 + look * 0.8, e[1] + 0.4 * eye, 1.6, 2.5 * eye, headA, [INK], { flat: INK, noRim: true });
      D.dot(e[0] + look * 0.8, e[1] - 0.8 * eye, WHITE);
      // the lid's edge across the top
      D.capsule(e[0] - 2.8, e[1] - 3.4 * eye, e[0] + 2.8, e[1] - 3.2 * eye, 0.6, 0.6, [INK], { flat: R.body[0], noRim: true });
    } else if (eye < 0) {
      // happy: an upturned arc
      for (let s = -2.5; s <= 2.5; s += 0.5) (D.dot(e[0] + s, e[1] + Math.abs(s) * 0.7 - 1, INK), D.dot(e[0] + s, e[1] + Math.abs(s) * 0.7, INK));
    } else for (let s = -2; s <= 2; s++) D.dot(e[0] + s, e[1] + 0.5, INK);
  }
  if (arms) {
    if (!body) arm(armF, shF, true);
    arm(armN, shN, false);
  }
  return { mouth: Hd(13 + jaw * 1, -2 + jaw * 2), chest: T(2, -12), hands: [armN.hand, armF.hand] };
}
