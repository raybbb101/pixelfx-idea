// A rigged baby fire dragon for spawn/dragon-hatch, chibi and upright: a big round head on a short neck, huge
// glossy eyes, curved golden horns sweeping back and a crest of little spikes, a cream belly in segments from
// chin to tummy, a raised bat wing, chunky haunches and clawed feet, a tail curling round with spikes on it. Its
// shaded parts are posed every frame and drawn a pixel at a time into a buffer, each with a softer rim where it
// lies over another, then laid on the screen with a 1 px outline round the whole. Facing right; (0, 0) is
// between its feet.
import { hex, mix, noise2, WHITE } from "../../core/index.js";

const H_ = (a) => a.map(hex);
export const RAMPS = {
  body: H_(["#5a0e0a", "#b0201a", "#e2402a", "#ff7a4a", "#ffb070"]),
  belly: H_(["#b8702a", "#f0b048", "#ffd88a", "#fff2c8"]),
  horn: H_(["#7a3c0c", "#d0801a", "#ffc040", "#fff0a0"]),
  wing: H_(["#a02a12", "#e8642a", "#ffa048", "#ffd080"]),
  claw: H_(["#a88a6a", "#e8d8bc", "#fff8ea"]),
};
export const INK = hex("#3a0a06");
const IRIS = H_(["#1a0604", "#4a1406", "#a8380c", "#f08a20"]);
const MOUTH = H_(["#3a0606", "#7a1410", "#e0566a"]);
const W = 140, Hh = 110, OX = 64, OY = 94;

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const dark = (r, k) => r.map((c) => mix(c, r[0], k));

export class Doll {
  constructor() {
    this.c = new Uint32Array(W * Hh);
    this.id = new Uint16Array(W * Hh);
    this.n = 0;
  }
  clear() {
    this.c.fill(0);
    this.id.fill(0);
    this.n = 0;
  }
  put(x, y, c, id, d, ramp, noRim) {
    const ix = x + OX, iy = y + OY;
    if (ix < 0 || iy < 0 || ix >= W || iy >= Hh) return;
    const i = iy * W + ix;
    this.c[i] = this.id[i] && d > 0.82 && !noRim ? mix(ramp[0], ramp[1], 0.5) : c;
    this.id[i] = id;
  }
  // a filled ellipse at (cx, cy), radii rx, ry, turned by a, shaded from the top left in ramp
  ellipse(cx, cy, rx, ry, a, ramp, opts = {}) {
    const id = ++this.n, R = Math.max(rx, ry) + 1, light = opts.light ?? 0, n = ramp.length;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const [u, v] = rot(x + 0.5 - cx, y + 0.5 - cy, -a), nx = u / rx, ny = v / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        const [sx, sy] = rot(nx, ny, a), lum = -sx * 0.55 - sy * 0.75 + light + (1 - d) * 0.2 - 0.3;
        const k = Math.max(0, Math.min(n - 1, Math.floor(((lum + 0.75) * (n - 0.6)) / 1.5 + 0.5)));
        let col = opts.flat ?? ramp[k];
        if (opts.fn) col = opts.fn(u, v, nx, ny, col, x, y) ?? col;
        this.put(x, y, col, id, d, ramp, opts.noRim);
      }
  }
  // a capsule from (x0, y0) to (x1, y1), radii r0 to r1
  capsule(x0, y0, x1, y1, r0, r1, ramp, opts = {}) {
    const id = ++this.n, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6, R = Math.max(r0, r1) + 1, n = ramp.length;
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
      for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        const px = x + 0.5, py = y + 0.5, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
        const qx = x0 + dx * u - px, qy = y0 + dy * u - py, r = r0 + (r1 - r0) * u, d = Math.hypot(qx, qy) / r;
        if (d > 1) continue;
        const lum = (qx * 0.55 + qy * 0.75) / r + (1 - d) * 0.2 - 0.25, k = Math.max(0, Math.min(n - 1, Math.floor(((lum + 0.75) * (n - 0.6)) / 1.5 + 0.5)));
        this.put(x, y, opts.flat ?? ramp[k], id, d * d, ramp, opts.noRim);
      }
  }
  // a filled triangle (spikes, wing panels): a flat colour, or fn(x, y) for one
  tri(ax, ay, bx, by, cx, cy, c) {
    const id = ++this.n, x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx)), y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
    const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5, d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
        if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) continue;
        const col = typeof c === "function" ? c(px, py) : c;
        this.put(x, y, col, id, 0, [col, col], true);
      }
  }
  dot(x, y, c) {
    const ix = Math.floor(x) + OX, iy = Math.floor(y) + OY;
    if (ix >= 0 && iy >= 0 && ix < W && iy < Hh) (this.c[iy * W + ix] = c), this.id[iy * W + ix] || (this.id[iy * W + ix] = ++this.n);
  }
  /** Lay it on the painter with its feet at (X, Y), a 1 px outline round it; skip rows at or below cutY (world). */
  blit(p, X, Y, cutY = Infinity, a = 1) {
    X = Math.round(X);
    Y = Math.round(Y);
    const has = (ix, iy) => ix >= 0 && iy >= 0 && ix < W && iy < Hh && this.c[iy * W + ix] && iy - OY + Y < cutY;
    for (let iy = 0; iy < Hh; iy++) {
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

// a two-bone arm from shoulder S to hand H, upper a and forearm b long, the elbow bending out (bend 1) or in (-1)
export function reach(S, Hd, a, b, bend = 1) {
  let dx = Hd[0] - S[0], dy = Hd[1] - S[1], d = Math.hypot(dx, dy);
  if (d > a + b - 0.01) {
    const k = (a + b - 0.01) / d;
    (dx *= k), (dy *= k), (d = a + b - 0.01);
  }
  const ang = Math.atan2(dy, dx), A = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * Math.max(d, 0.01)))));
  return { elbow: [S[0] + Math.cos(ang + A * bend) * a, S[1] + Math.sin(ang + A * bend) * a], hand: [S[0] + dx, S[1] + dy] };
}

// red scales: lighter speckles on the lit side, a few darker ones in the shade
function scales(nx, ny, col, x, y, ramp) {
  const s = noise2(x * 0.62 + 3, y * 0.62, 7), i = ramp.indexOf(col);
  if (i < 0) return;
  if (s > 0.5 && nx + ny < 0.4) return ramp[Math.min(ramp.length - 1, i + 1)];
  if (s < -0.55 && nx + ny > 0) return ramp[Math.max(0, i - 1)];
}

/**
 * Draw the dragon into doll D in pose P (relative to its feet): tilt (lean about the hips, + forward), head
 * (nod about the neck, + down), jaw (0..1 open), eye (1 open .. 0 shut, -1 a happy arc), look (pupil -1..1),
 * puff (chest swell 0..1), squash (y scale on landing), wing (0 folded, 0.5 spread, 1 raised high), tail (sway), lift
 * (the near foot raised), handN / handF ([x, y] targets, or null for resting). parts: "all", "body" (no arms),
 * "arms", or "none" (only work out where things are). Returns { mouth, chest }.
 */
export function drawDragon(D, P, parts = "all") {
  const R = RAMPS, sq = P.squash ?? 1, tilt = P.tilt ?? 0, jaw = P.jaw ?? 0;
  const body = parts === "all" || parts === "body", arms = parts === "all" || parts === "arms";
  // body space: about the hips, leaning by tilt, squashed on landing
  const T = (x, y) => {
    const [rx, ry] = rot(x, y + 8, tilt);
    return [rx, -8 * sq + ry * sq];
  };
  const neck = T(4, -30), headA = tilt + (P.head ?? 0);
  const Hd = (x, y) => {
    const [rx, ry] = rot(x, y, headA);
    return [neck[0] + rx, neck[1] + ry];
  };
  const shN = T(6, -24), shF = T(1, -25);
  const armN = reach(shN, P.handN ?? T(11, -15), 6.5, 7, 1), armF = reach(shF, P.handF ?? T(7, -16), 6.5, 7, 1);
  const B = R.body, Bd = dark(B, 0.35), sc = (u, v, nx, ny, col, x, y) => scales(nx, ny, col, x, y, B);
  const arm = (A, S, far) => {
    const rp = far ? Bd : B;
    D.capsule(S[0], S[1], A.elbow[0], A.elbow[1], 2.8, 2.3, rp);
    D.capsule(A.elbow[0], A.elbow[1], A.hand[0], A.hand[1], 2.3, 2, rp);
    D.ellipse(A.hand[0], A.hand[1], 2.6, 2.2, 0, rp);
    const ang = Math.atan2(A.hand[1] - A.elbow[1], A.hand[0] - A.elbow[0]);
    for (const s of [-0.75, 0, 0.75]) {
      const cx = A.hand[0] + Math.cos(ang + s) * 2.6, cy = A.hand[1] + Math.sin(ang + s) * 2.6;
      D.dot(cx, cy, R.claw[1]);
      D.dot(cx + Math.cos(ang + s), cy + Math.sin(ang + s), R.claw[2]);
    }
  };
  if (body) {
    // the wing, raised behind its back: an arm bone, three fingers, a membrane between them
    // folded (0): small and tucked back along the body; spread (0.5) up and back; raised high (1)
    const wg = P.wing ?? 0.5, ea = ((165 + 90 * wg) * Math.PI) / 180 + tilt, sz = 0.5 + 0.5 * Math.min(1, wg * 1.6), w0 = T(-3, -26), L1 = 13 * sz;
    const elb = [w0[0] + Math.cos(ea) * L1, w0[1] + Math.sin(ea) * L1];
    const tips = [0.5, 1.15, 1.75].map((s, i) => {
      const a = ea - s * (0.6 + 0.4 * sz), l = [16, 15, 12][i] * sz;
      return [elb[0] + Math.cos(a) * l, elb[1] + Math.sin(a) * l];
    });
    const mem = (x, y) => (noise2(x * 0.3, y * 0.3, 3) > 0.25 ? R.wing[3] : ((x + y) % 7 + 7) % 7 < 3.5 ? R.wing[2] : R.wing[1]);
    let prev = null;
    for (const tp of tips) {
      const q = prev ?? w0;
      D.tri(elb[0], elb[1], tp[0], tp[1], q[0], q[1], mem);
      prev = tp;
    }
    D.tri(elb[0], elb[1], tips[2][0], tips[2][1], w0[0] + 2, w0[1] + 6, mem);
    D.capsule(w0[0], w0[1], elb[0], elb[1], 2, 1.4, [B[0], B[1], B[2]]);
    for (const tp of tips) D.capsule(elb[0], elb[1], tp[0], tp[1], 1.2, 0.5, [B[0], B[1], B[2]]);
    D.dot(elb[0], elb[1] - 1, R.claw[1]);
    // the far arm, the tail curling round with spikes along it, the far foot
    if (arms) arm(armF, shF, true);
    const tw = P.tail ?? 0, tailPts = [T(-7, -5)];
    for (let k = 1; k <= 7; k++) {
      const u = k / 7, a = Math.PI + 0.15 - u * 1.9 + tw * u * 0.8, pr = tailPts[k - 1];
      tailPts.push([pr[0] + Math.cos(a) * 3.6, pr[1] + Math.sin(a) * 2.4 - 0.5 + u * 0.6]);
    }
    for (let k = 1; k < tailPts.length; k++) {
      const u = k / 7, a0 = tailPts[k - 1], a1 = tailPts[k];
      D.capsule(a0[0], a0[1], a1[0], a1[1], 4.8 - u * 3.2, 4.4 - u * 3.4, B);
      if (k % 2 === 0 && k < 7) {
        const nx = a1[0] - a0[0], ny = a1[1] - a0[1], l = Math.hypot(nx, ny) || 1, px = ny / l, py = -nx / l, r = 4.4 - u * 3.4;
        D.tri(a1[0] + px * r - (nx / l) * 1.5, a1[1] + py * r - (ny / l) * 1.5, a1[0] + px * r + (nx / l) * 1.5, a1[1] + py * r + (ny / l) * 1.5, a1[0] + px * (r + 3) - (nx / l) * 1.2, a1[1] + py * (r + 3) - (ny / l) * 1.2, R.horn[2]);
      }
    }
    const tt = tailPts[7];
    D.tri(tt[0] - 2, tt[1] - 1, tt[0] + 2, tt[1] + 1, tt[0] + 3.5, tt[1] - 4, R.horn[2]);
    D.ellipse(...T(-2, -2), 4.6, 2.4, 0, Bd);
    // the body, its cream belly in segments, the near haunch and foot with its claws
    const puff = 1 + 0.1 * (P.puff ?? 0);
    D.ellipse(...T(1, -17), 9.4 * puff, 12.6, 0.1, B, { fn: sc });
    D.ellipse(...T(-3, -8), 8.6, 7.6, 0.15, B, { fn: sc });
    D.ellipse(...T(5.6, -16.5), 5 * puff, 11.5, 0.16, R.belly, {
      fn: (u, v, nx, ny, col) => (Math.abs((((v + 30) % 3.2) + 3.2) % 3.2 - 1.6) < 0.5 ? R.belly[Math.max(0, R.belly.indexOf(col) - 1)] : col),
    });
    const lift = P.lift ?? 0;
    D.ellipse(...T(5, -2.6 - lift * 4), 6.4, 2.8, 0, B, { fn: sc });
    for (const s of [0, 1, 2]) {
      const [cx, cy] = T(10.2, -1 - lift * 4 - s * 1.4);
      D.dot(cx, cy, R.claw[1]);
      D.dot(cx + 1, cy, R.claw[2]);
    }
    // the neck and its belly stripe
    D.capsule(...T(3, -24), ...Hd(1, -2), 6, 5.4, B);
    D.capsule(...T(6.5, -24), ...Hd(4.5, 1), 3, 2.8, R.belly);
    // the head: horns sweeping back, spikes at the jaw and on top, a round skull, a snout, a jaw that drops
    const horn = (bx, by, far) => {
      const rp = far ? dark(R.horn, 0.3) : R.horn, p0 = Hd(bx, by), p1 = Hd(bx - 6, by - 7), p2 = Hd(bx - 7, by - 13);
      D.capsule(p0[0], p0[1], p1[0], p1[1], 3, 2, rp);
      D.capsule(p1[0], p1[1], p2[0], p2[1], 2, 0.6, rp);
    };
    horn(3, -15, true);
    for (const [x, y, l] of [[-9, -6, 3.5], [-10, -1, 3], [-9, 4, 2.6]]) {
      const a = Hd(x, y - 1.5), b = Hd(x, y + 1.5), c = Hd(x - l, y - 0.5);
      D.tri(a[0], a[1], b[0], b[1], c[0], c[1], R.horn[2]);
    }
    for (const [x, y] of [[-3, -15], [1, -16], [5, -15]]) {
      const a = Hd(x - 1.4, y + 1), b = Hd(x + 1.4, y + 1), c = Hd(x - 0.5, y - 3);
      D.tri(a[0], a[1], b[0], b[1], c[0], c[1], R.horn[2]);
    }
    // the crest down its back
    for (const [x, y] of [[-6, -27], [-8, -21], [-9, -15], [-9, -9]]) {
      const a = T(x + 0.5, y - 1.8), b = T(x + 0.5, y + 1.8), c = T(x - 3.2, y - 0.5);
      D.tri(a[0], a[1], b[0], b[1], c[0], c[1], R.horn[2]);
    }
    D.ellipse(...Hd(0, -6), 12.4, 11.2, headA, B, { fn: sc });
    if (jaw > 0.1) {
      // the open mouth: dark inside, a pink tongue
      const m = Hd(9, 2 + jaw * 1.5);
      D.ellipse(m[0], m[1], 5.5, 2.4 + jaw * 2.2, headA + 0.2 + jaw * 0.25, MOUTH, { flat: MOUTH[0], noRim: true });
      const tg = Hd(8, 3.5 + jaw * 2.4);
      D.ellipse(tg[0], tg[1], 3.6, 1.4 + jaw * 0.6, headA + 0.25, MOUTH, { flat: MOUTH[2], noRim: true });
    }
    // the lower jaw, cream underneath, swinging down
    D.ellipse(...Hd(8.5 + jaw, 1.8 + jaw * 4), 5.6, 2.1, headA + 0.1 + jaw * 0.5, R.belly);
    D.ellipse(...Hd(10, -3), 7.6, 5.4, headA - 0.1, B, { light: 0.15 });
    D.dot(...Hd(16, -5), INK);
    D.dot(...Hd(15.5, -4.4), B[1]);
    // little fangs when it opens up; a smile when it doesn't
    if (jaw > 0.3) for (const fx of [6, 13]) D.dot(...Hd(fx, 1.2), WHITE);
    if (jaw <= 0.1) for (let s = 0; s < 6; s++) D.dot(...Hd(7 + s, 1.6 + (s > 3 ? -0.6 * (s - 3) : 0)), B[0]);
    horn(-3, -11, false);
    // the cheek, and the eye: big and glossy (or shut, or a happy arc)
    D.ellipse(...Hd(3, -0.5), 2.4, 1.3, 0, [hex("#ff9a86")], { flat: hex("#ff9a86"), noRim: true });
    const e = Hd(3.6, -6.8), eye = P.eye ?? 1, look = P.look ?? 0;
    if (eye > 0.1) {
      D.ellipse(e[0], e[1], 5.6, 6.4 * eye, headA, [INK], { flat: INK, noRim: true });
      D.ellipse(e[0], e[1], 4.9, 5.7 * eye, headA, [WHITE], { flat: WHITE, noRim: true });
      const ix = e[0] + 0.5 + look * 0.9, iy = e[1] + 0.4 * eye;
      D.ellipse(ix, iy, 4, 5 * eye, headA, IRIS, { noRim: true, fn: (u, v, nx, ny) => (ny > 0.35 ? IRIS[3] : ny > 0 ? IRIS[2] : Math.hypot(nx, ny) < 0.55 ? IRIS[0] : IRIS[1]) });
      D.ellipse(ix - 1.4, iy - 2 * eye, 1.5, 1.5 * eye, 0, [WHITE], { flat: WHITE, noRim: true });
      D.dot(ix + 1.6, iy + 2 * eye, WHITE);
      // the lid and a lash
      D.capsule(e[0] - 5, e[1] - 5.8 * eye, e[0] + 4.6, e[1] - 6.2 * eye, 0.9, 0.8, [INK], { flat: INK, noRim: true });
      D.dot(e[0] + 5.4, e[1] - 7 * eye, INK);
    } else if (eye < 0) for (let s = -3; s <= 3; s += 0.5) (D.dot(e[0] + s, e[1] + Math.abs(s) * 0.6 - 1, INK), D.dot(e[0] + s, e[1] + Math.abs(s) * 0.6, INK));
    else for (let s = -3.5; s <= 3.5; s += 0.5) (D.dot(e[0] + s, e[1] + 0.5 + Math.abs(s) * 0.15, INK), D.dot(e[0] + s, e[1] + 1.5 + Math.abs(s) * 0.15, B[1]));
  }
  if (arms) {
    if (!body) arm(armF, shF, true);
    arm(armN, shN, false);
  }
  return { mouth: Hd(13.5 + jaw, 2 + jaw * 2.5), chest: T(4, -17) };
}
