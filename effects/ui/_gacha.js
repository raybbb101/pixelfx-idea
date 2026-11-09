// Gacha cards, shared by ui/gacha-ur and ui/gacha-star-rain: a 36 x 52 card with a back, and a face in five
// rarities. N, R, SR and SSR have a frame in their colour, a star of their colour on pale art and 1 to 4 rarity
// stars; UR is the candy holographic card: a frame of candy stripes, a rainbow candy star and five candy stars.
import { hex, mix, TAU, WHITE } from "../../core/index.js";

export const CW = 36, CH = 52;
export const INK = hex("#2a0c34");
const BACK = ["#120c30", "#1e1650", "#2e2478", "#5a4cc0", "#a898ff"].map(hex);
const UR_ART = ["#ffe0f4", "#f8cdf2", "#e8c0ff", "#d0b6ff"].map(hex);

// each rarity's frame ramp (deep, mid, light, white-hot), its pale art, and how many stars it gets
const RARITY = {
  N: { label: "N", stars: 1, ramp: ["#4a5068", "#8a92b0", "#c8cee4", "#f4f6ff"], art: ["#e8ecf6", "#dde2f0", "#d2d8ea", "#c8cee4"] },
  R: { label: "R", stars: 2, ramp: ["#10307a", "#2a68e8", "#6ab4ff", "#dcf2ff"], art: ["#dceeff", "#cce4ff", "#bcd8fc", "#aecdf8"] },
  SR: { label: "SR", stars: 3, ramp: ["#381270", "#7a34d8", "#ba7cff", "#f2e0ff"], art: ["#f0e2ff", "#e6d4ff", "#dac6fc", "#ceb8f8"] },
  SSR: { label: "SSR", stars: 4, ramp: ["#6a3a08", "#d08a18", "#ffd040", "#fff6c4"], art: ["#fff6d8", "#ffefc4", "#fbe4ae", "#f6d898"] },
};
const LETTER = { W: "N", B: "R", P: "SR", G: "SSR", C: "UR" };

/** The card style for a rarity: "N" "R" "SR" "SSR" "UR", or a star letter W B P G C. K is the candy ramp, used for UR. */
export function cardStyle(rarity, K) {
  const name = LETTER[rarity] ?? rarity;
  if (name === "UR") return { name, label: "UR", stars: 5, holo: K, art: UR_ART, badge: K[6], glow: K[6] };
  const r = RARITY[name] ?? RARITY.N, ramp = r.ramp.map(hex);
  return { name, label: r.label, stars: r.stars, holo: null, ramp, art: r.art.map(hex), badge: ramp[1], glow: ramp[2] };
}

/** A 5-point star test at (x, y) from its centre, r its outer radius: 0..1 inside (centre to edge), -1 outside. */
export function inStar(x, y, r) {
  const a = Math.atan2(y, x) + Math.PI / 2, d = Math.hypot(x, y), k = (((a / TAU) * 5) % 1 + 1) % 1;
  const edge = r * (0.48 + 0.52 * Math.abs(k - 0.5) * 2);
  return d < edge ? d / edge : -1;
}

/** One card cell (u 0..35, v 0..51): the face in style st, or the back. sh: holo shift; sw: shine position or null. */
export function cardCell(u, v, face, st, sh, sw) {
  if (u === 0 || u === CW - 1 || v === 0 || v === CH - 1) return INK;
  const ring = Math.min(u, v, CW - 1 - u, CH - 1 - v);
  if (!face) {
    if (ring === 1) return hex("#ff8ad8");
    if (ring === 2) return BACK[3];
    const dx = u + 0.5 - CW / 2, dy = v + 0.5 - CH / 2, dm = Math.abs(dx) + Math.abs(dy) * 0.7;
    if (dm > 9.5 && dm < 10.6) return BACK[4];
    if (dm <= 9.5) return dm < 7 ? BACK[2] : BACK[1];
    return (u + v) % 4 === 0 && (u - v) % 4 === 0 ? BACK[2] : v < CH / 2 ? BACK[1] : BACK[0];
  }
  const K = st.holo, R = st.ramp;
  // the colour of a rainbow or rarity accent i
  const acc = (i) => (K ? K[((i % K.length) + K.length) % K.length] : R[2]);
  let c;
  if (ring <= 3) {
    if (K) {
      // the holo frame: candy stripes running diagonally, lit on the outside, deep on the inside
      const n = K.length, h = Math.floor(((u + v) / 3 + sh) % n + n) % n;
      c = ring === 1 ? mix(K[h], WHITE, 0.45) : ring === 2 ? K[h] : mix(K[h], INK, 0.3);
    } else c = ring === 1 ? R[3] : ring === 2 ? R[2] : R[1];
  } else if (ring === 4) c = K ? hex("#fff4fb") : mix(R[3], WHITE, 0.5);
  else if (v >= 39 && v <= 46) {
    // the rarity plate: its stars on white
    if (v === 39 || v === 46) c = K ? hex("#f0c8e8") : mix(R[2], WHITE, 0.6);
    else {
      c = hex("#fffafd");
      for (let s = 0; s < st.stars; s++) {
        const sx = 18.5 + (s - (st.stars - 1) / 2) * 5, s0 = inStar(u + 0.5 - sx, v + 0.5 - 42.8, 2.6), a = K ? acc(s * 2) : R[st.name === "SSR" ? 2 : 1];
        if (s0 >= 0) c = s0 < 0.45 ? mix(a, WHITE, 0.5) : a;
      }
    }
  } else if (v === 38) c = INK;
  else {
    // the art: pale sky with light stripes, a big star in the middle (rainbow for UR), four sparkles
    const ax = u + 0.5 - CW / 2, ay = v + 0.5 - 21.5, s0 = inStar(ax, ay, 12.5), s1 = inStar(ax, ay, 14);
    if (s0 >= 0) {
      if (K) {
        const a = Math.atan2(ay, ax), h = Math.floor(((a / TAU + 1) * K.length + sh * 0.5) % K.length);
        c = s0 < 0.3 ? WHITE : s0 < 0.55 ? mix(K[h], WHITE, 0.55) : K[h];
      } else c = s0 < 0.3 ? WHITE : s0 < 0.55 ? R[3] : s0 < 0.8 ? R[2] : R[1];
      if (ax + ay < -6 && s0 > 0.55) c = mix(c, WHITE, 0.3);
    } else if (s1 >= 0) c = INK;
    else {
      const A = st.art;
      c = A[Math.min(3, Math.floor((v - 5) / 8.5))];
      if (((u - v) & 7) === 0) c = mix(c, WHITE, 0.5);
      for (const [px, py] of [[8, 9], [28, 11], [9, 32], [27, 31]])
        if ((u === px && Math.abs(v - py) <= 1) || (v === py && Math.abs(u - px) <= 1)) c = u === px && v === py ? WHITE : acc(px + py);
    }
  }
  // the shine sweeping across
  if (sw !== null && sw !== undefined) {
    const d = Math.abs(u - v * 0.55 - sw);
    if (d < 1.2) c = mix(c, WHITE, 0.85);
    else if (d < 2.6) c = mix(c, WHITE, 0.35);
  }
  return c;
}

/** The card centred on (cx, cy), scale s, width factor sx (1 face-on, < 0 the other side), white 0..1, alpha a. */
export function drawCard(p, cx, cy, s, sx, faceUp, st, sh, sw, white = 0, a = 1) {
  const w = Math.max(Math.abs(sx), 0.06), hw = (CW / 2) * s * w, hh = (CH / 2) * s, face = sx < 0 ? !faceUp : faceUp;
  p.shade(cx - hw - 1, cy - hh - 1, cx + hw + 1, cy + hh + 1, (x, y, o) => {
    let u = (x - cx) / (s * w) + CW / 2;
    const v = (y - cy) / s + CH / 2;
    if (u < 0 || u >= CW || v < 0 || v >= CH) return;
    if (sx < 0) u = CW - u;
    if (w < 0.1) return WHITE;
    let c = cardCell(Math.floor(u), Math.floor(v), face, st, sh, sw);
    if (white > 0) c = mix(c, WHITE, white);
    // turning away from us darkens it a little
    if (w < 0.9) c = mix(c, INK, (0.9 - w) * 0.4);
    o.a = a;
    return c;
  });
}

/** The rarity badge on the card's top-left corner (card centred on cx, cy at scale s). */
export function drawBadge(p, cx, cy, s, st, a = 1) {
  const label = st.label, w = label.length * 4 + 1 + 2, bx = Math.round(cx - (CW / 2) * s + 2), by = Math.round(cy - (CH / 2) * s + 2);
  p.rect(bx, by, w + 2, 8, INK, a);
  p.rect(bx + 1, by + 1, w, 6, st.badge, a);
  p.text(label, bx + 1 + w / 2, by + 2, WHITE, { align: "center", a });
}
