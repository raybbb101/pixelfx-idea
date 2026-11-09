// The tarot faces for arcane/tarot-draw: the 22 Major Arcana. Each face is fn(x, y, G) for one cell of the
// card's picture (x 3..18, y 9..26, centre (10.5, 17.5)) returning a colour; G is the gold ramp, dark to bright.
// Original pixel designs on the traditional motifs. To add a card, add a face here and its numeral to NUM.
import { hex, TAU, WHITE } from "../../core/index.js";

const memo = new Map();
const H = (s) => memo.get(s) ?? (memo.set(s, hex(s)), memo.get(s));

// helpers on cell centres
const D = (x, y, cx, cy) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
function seg(x, y, ax, ay, bx, by) {
  const px = x + 0.5, py = y + 0.5, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(ax + dx * u - px, ay + dy * u - py);
}
const onPath = (x, y, pts, w) => {
  for (let i = 1; i < pts.length; i++) if (seg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) < w) return true;
  return false;
};
// a heart centred at (cx, cy), r about its half width
const heart = (x, y, cx, cy, r) => {
  const X = (x + 0.5 - cx) / r, Y = -(y + 0.5 - cy) / r + 0.25;
  return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 < 0;
};
// a figure-eight (infinity) of half width a at (cx, cy)
const INF = Array.from({ length: 41 }, (_, i) => {
  const s = (i / 40) * TAU, k = 1 + Math.sin(s) ** 2;
  return [Math.cos(s) / k, (Math.sin(s) * Math.cos(s)) / k];
});
const infinity = (x, y, cx, cy, a, w = 0.6) => onPath(x, y, INF.map(([u, v]) => [cx + u * a, cy + v * a * 1.1]), w);
const dots = (x, y, list) => list.some(([sx, sy]) => x === sx && y === sy);
const skyV = (y, top, bot, split) => H(y < split ? top : bot);

export const NUM = {
  fool: "0", magician: "I", priestess: "II", empress: "III", emperor: "IV", hierophant: "V", lovers: "VI",
  chariot: "VII", strength: "VIII", hermit: "IX", wheel: "X", justice: "XI", hanged: "XII", death: "XIII",
  temperance: "XIV", devil: "XV", tower: "XVI", star: "XVII", moon: "XVIII", sun: "XIX", judgement: "XX", world: "XXI",
};
export const CARDS = Object.keys(NUM);

export const FACES = {
  // 0: a wanderer at the cliff edge, bundle over the shoulder, a white rose in hand, a bright sun
  fool(x, y, G) {
    if (D(x, y, 15.5, 11.5) < 2.2) return D(x, y, 15.5, 11.5) < 1.3 ? WHITE : G[4];
    if (D(x, y, 8.5, 14.5) < 1.3) return H("#f0c8a0"); // head
    if (seg(x, y, 10, 17, 14, 12.5) < 0.6) return H("#7a4a24"); // staff
    if (D(x, y, 14.5, 12.5) < 1.4) return H("#c83c3c"); // bundle
    if (D(x, y, 5.5, 16.5) < 1.1) return x === 5 && y === 16 ? H("#f0a0b0") : WHITE; // rose
    if (x >= 7 && x <= 9 && y >= 16 && y <= 19) return x === 7 ? H("#c89a2a") : H("#e8c040"); // tunic
    if ((x === 7 || x === 9) && y >= 20 && y <= 21) return H("#3a2a3a"); // legs
    if (y >= 22 && x <= 13) return y === 22 ? H("#6aa84a") : (x + y) % 5 === 0 ? H("#6a4e34") : H("#8a6a48"); // cliff
    if (y >= 22) return H("#5a8ac8"); // the drop
    return skyV(y, "#7cc4f0", "#a8dcf8", 15);
  },
  // I: an infinity sign over a raised wand, the table set with cup and coin
  magician(x, y, G) {
    if (infinity(x, y, 10.5, 11, 3.6, 0.5)) return G[4];
    if ((x === 10 || x === 11) && y >= 13 && y <= 21) return y <= 14 ? WHITE : x === 10 ? H("#e8e4f0") : H("#b8b4c8");
    if (y >= 23) return y === 23 ? H("#a86c34") : H("#7a4a24");
    if (x >= 5 && x <= 7 && y >= 20 && y <= 22) return y === 20 ? G[4] : x === 6 || y === 22 ? G[3] : G[2]; // cup
    if (D(x, y, 15.5, 21.5) < 1.5) return D(x, y, 15.2, 21.2) < 0.8 ? G[4] : G[3]; // coin
    if ((x + y * 3) % 7 === 0 && y < 20) return H("#a83040");
    return skyV(y, "#8a1e2a", "#6a1622", 17);
  },
  // II: a dark and a light pillar, a veil of pomegranates between, a crescent moon at the foot
  priestess(x, y) {
    const pil = (px, light) => {
      if (x < px || x > px + 2) return 0;
      if (y === 9 || y === 10) return H(light ? "#ffffff" : "#4a4458");
      return H(light ? (x === px ? "#ffffff" : "#d8d4cc") : x === px ? "#3a3448" : "#1e1a28");
    };
    const c = pil(3, false) || pil(16, true);
    if (c) return c;
    const d1 = D(x, y, 10.5, 24.2), d2 = D(x, y, 10.5, 23.2);
    if (d1 < 2.8 && d2 >= 2.4) return H("#f4f0e0");
    if (D(x, y, 10.5, 11) < 1.4) return WHITE;
    if (x >= 6 && x <= 15 && y >= 13 && y <= 21) return (x + y) % 3 === 0 && x % 2 === 0 ? H("#c03040") : (x + y) % 2 ? H("#3a5a9a") : H("#34528e");
    return skyV(y, "#1a2450", "#141c40", 18);
  },
  // III: a heart shield with the venus sign, a crown of stars, a ripe wheat field
  empress(x, y, G) {
    if (dots(x, y, [[6, 10], [10, 9], [11, 9], [15, 10]])) return G[4];
    const dv = D(x, y, 10.5, 15.3);
    if (heart(x, y, 10.5, 16.6, 4.2)) {
      if ((dv > 0.9 && dv < 1.9) || ((x === 10 || x === 11) && y >= 17 && y <= 19) || (y === 18 && x >= 9 && x <= 12)) return WHITE;
      return x < 10 ? H("#f08aa6") : H("#d8587a");
    }
    if (y >= 22) return x % 2 === 0 ? (y === 22 ? G[4] : G[3]) : y % 2 ? G[2] : G[3];
    if (y >= 20) return H("#4a8a3a");
    return skyV(y, "#9ad0e0", "#b8e0e8", 14);
  },
  // IV: a stone throne with ram's horns, an orb held at its heart, red mountains behind
  emperor(x, y, G) {
    if (D(x, y, 10.5, 19) < 2) return D(x, y, 10, 18.5) < 1 ? G[4] : G[3];
    if ((x === 10 || x === 11) && (y === 16 || y === 15)) return G[4];
    if (D(x, y, 6, 13.5) < 1.8 && D(x, y, 6.5, 13.5) > 0.7) return G[3];
    if (D(x, y, 15, 13.5) < 1.8 && D(x, y, 14.5, 13.5) > 0.7) return G[3];
    if (x >= 6 && x <= 15 && y >= 14) return x === 6 || y === 14 ? H("#b8b8c4") : x === 15 ? H("#5a5a68") : H("#8a8a98");
    const ridge = 15 + Math.abs(((x * 7) % 9) - 4) * 0.8;
    if (y > ridge) return H("#6a3a2a");
    return skyV(y, "#e8783a", "#c8502a", 13);
  },
  // V: crossed keys of gold and silver beneath a triple cross
  hierophant(x, y, G) {
    if ((x === 10 || x === 11) && y >= 9 && y <= 14) return G[4];
    if ((y === 10 || y === 12) && x >= 8 && x <= 13) return G[4];
    if (D(x, y, 5.5, 24.5) < 1.8 && D(x, y, 5.5, 24.5) > 0.7) return G[3];
    if (D(x, y, 15.5, 24.5) < 1.8 && D(x, y, 15.5, 24.5) > 0.7) return H("#d8dce8");
    if (seg(x, y, 6.5, 23.5, 16, 15) < 0.7) return G[3];
    if (seg(x, y, 14.5, 23.5, 5, 15) < 0.7) return H("#d8dce8");
    if (dots(x, y, [[16, 16], [15, 14], [17, 15]])) return G[3];
    if (dots(x, y, [[5, 16], [6, 14], [4, 15]])) return H("#d8dce8");
    return (x + y) % 4 === 0 ? H("#8a2a2a") : H("#6a1a1e");
  },
  // VI: two hearts entwined beneath a radiant sun
  lovers(x, y, G) {
    const ds = D(x, y, 10.5, 12);
    if (ds < 2.4) return ds < 1.4 ? WHITE : G[4];
    const ang = Math.atan2(y + 0.5 - 12, x + 0.5 - 10.5);
    if (ds < 4.6 && Math.floor((ang / TAU + 1) * 12) % 2 === 0) return G[3];
    const a = heart(x, y, 8.5, 20.5, 3.3), b = heart(x, y, 12.5, 20.5, 3.3);
    if (a && b) return H("#a8203a");
    if (a) return H("#e03850");
    if (b) return H("#f878a8");
    return skyV(y, "#f0c8a0", "#e8a080", 17);
  },
  // VII: a crowned rider in a stone chariot under a starry canopy, wheels below
  chariot(x, y, G) {
    if (y <= 10) return (x + y) % 3 === 0 ? G[4] : H("#2a4aa0");
    if ((x === 4 || x === 17) && y >= 11 && y <= 19) return G[3];
    if (dots(x, y, [[10, 12], [11, 12]])) return G[4];
    if (D(x, y, 10.5, 14) < 1.3) return H("#f0c8a0");
    if (x >= 9 && x <= 12 && y >= 15 && y <= 18) return x === 9 ? H("#e8ecf4") : H("#a8b0c4");
    if (D(x, y, 6.5, 24.5) < 2 || D(x, y, 14.5, 24.5) < 2) return D(x, y, 6.5, 24.5) < 0.7 || D(x, y, 14.5, 24.5) < 0.7 ? G[3] : H("#3a3440");
    if (x >= 4 && x <= 17 && y >= 19 && y <= 23) return y === 21 && x >= 8 && x <= 13 ? G[4] : y === 19 ? H("#c8c8d4") : H("#9a9aa8");
    return skyV(y, "#1a2048", "#22285a", 18);
  },
  // VIII: a lion's maned head, calm, under an infinity sign
  strength(x, y, G) {
    if (infinity(x, y, 10.5, 10.6, 3.2, 0.55)) return H("#8a3a1a");
    const d = D(x, y, 10.5, 19), a = Math.atan2(y + 0.5 - 19, x + 0.5 - 10.5);
    if (d < 3.7) {
      if (dots(x, y, [[9, 18], [12, 18]])) return H("#2a1408");
      if (dots(x, y, [[10, 20], [11, 20]])) return H("#6a2a1a");
      if (y === 21 && (x === 9 || x === 12)) return H("#6a2a1a");
      return x < 10 ? H("#f8c058") : H("#f0a83a");
    }
    if (d < 5.6 + (Math.floor((a / TAU + 1) * 14) % 2) * 0.9) return d < 4.6 ? H("#a8481a") : H("#c8641c");
    return skyV(y, "#f0dc80", "#e8d070", 15);
  },
  // IX: a hooded hermit with a staff, holding out a lantern with a star in it, on a snowy peak at night
  hermit(x, y, G) {
    if (x >= 13 && x <= 16 && y >= 15 && y <= 19) {
      if (x === 13 || x === 16 || y === 15 || y === 19) return G[2];
      return dots(x, y, [[14, 17], [15, 17], [14, 16], [15, 18]]) ? WHITE : G[4];
    }
    if (dots(x, y, [[14, 14], [15, 14]])) return G[2];
    if (seg(x, y, 8.5, 16.5, 13, 16.5) < 0.6) return H("#6a6a78");
    if (x === 4 && y >= 11) return H("#8a6a3a");
    if (D(x, y, 7.5, 12.5) < 1.6) return x >= 8 && y >= 12 ? H("#f0c8a0") : H("#4a4a58");
    if (y >= 13 && y <= 25 && Math.abs(x + 0.5 - 7.5) < (y - 12) * 0.25 + 1) return x < 7 ? H("#8a8a98") : H("#6a6a7a");
    if (y >= 24 - Math.abs(x - 10) * 0.3) return H("#d8e0f0");
    if (dots(x, y, [[16, 10], [6, 9], [12, 11]])) return H("#b8c8f0");
    return skyV(y, "#10142a", "#1c2444", 16);
  },
  // X: the great wheel turning in a blue sky, clouds at the corners
  wheel(x, y, G) {
    const d = D(x, y, 10.5, 17.5), a = Math.atan2(y + 0.5 - 17.5, x + 0.5 - 10.5);
    if (d < 1.4) return WHITE;
    if (d >= 5.4 && d < 6.6) return a < -1.5 && a > -3 ? H("#f8b04a") : H("#e0782a");
    if (d >= 3.2 && d < 4) return H("#f0c050");
    if (d < 5.4) {
      const k = (a / (Math.PI / 4)) % 1, off = Math.min(Math.abs(k), 1 - Math.abs(k)) * (Math.PI / 4) * d;
      if (off < 0.55) return G[3];
      return H("#3a6ab0");
    }
    for (const [cx, cy] of [[4.5, 10.5], [17, 10.5], [4.5, 25.5], [17, 25.5]]) if (D(x, y, cx, cy) < 2.4) return WHITE;
    return skyV(y, "#4a8ad0", "#5a9ae0", 17);
  },
  // XI: an upright sword and a balanced pair of scales
  justice(x, y, G) {
    if ((x === 10 || x === 11) && y >= 9 && y <= 21) return y === 9 ? WHITE : x === 10 ? H("#eef0f8") : H("#a8acc0");
    if (y === 22 && x >= 7 && x <= 14) return G[3];
    if ((x === 10 || x === 11) && y >= 23 && y <= 25) return H("#6a3a1a");
    if ((x === 10 || x === 11) && y === 26) return G[4];
    if (y === 13 && x >= 4 && x <= 17) return G[3];
    if (seg(x, y, 4.5, 13.5, 3.5, 18) < 0.45 || seg(x, y, 4.5, 13.5, 7, 18) < 0.45) return G[2];
    if (seg(x, y, 16.5, 13.5, 14, 18) < 0.45 || seg(x, y, 16.5, 13.5, 18, 18) < 0.45) return G[2];
    if (y >= 18 && y <= 19 && ((x >= 3 && x <= 7) || (x >= 14 && x <= 18))) return y === 18 ? G[4] : G[3];
    return (x === 3 || x === 18) && y > 19 ? H("#5a1a28") : skyV(y, "#7a2a3a", "#6a2232", 16);
  },
  // XII: hanging upside down by one foot from a living tree, a halo round his head
  hanged(x, y, G) {
    if (y <= 10 && x >= 4 && x <= 17) return y === 9 && x % 3 === 0 ? H("#5aa84a") : H("#6a4a2a");
    if (x === 10 && y >= 11 && y <= 12) return H("#c8b080");
    if ((x === 10 && y >= 13 && y <= 17) || (y === 15 && x >= 11 && x <= 12) || (x === 12 && y >= 15 && y <= 17)) return H("#c03a3a");
    if (x >= 9 && x <= 12 && y >= 18 && y <= 21) return x === 9 ? H("#5a7ad0") : H("#3a5ab0");
    const dh = D(x, y, 10.5, 23.5);
    if (dh < 1.5) return H("#f0c8a0");
    if (dh < 3.2 && dh > 2.3) return G[4];
    return skyV(y, "#5a8a6a", "#4a7a5a", 18);
  },
  // XIII: a pale skull before a sun rising between two towers
  death(x, y, G) {
    const ds = D(x, y, 10.5, 26.5);
    if (y >= 23 && (x <= 5 || x >= 16)) return H("#3a3040");
    if (ds < 3.4 && y <= 26) return ds < 2.2 ? G[4] : G[3];
    const dc = D(x, y, 10.5, 16);
    if (dots(x, y, [[8, 16], [9, 16], [12, 16], [13, 16], [8, 17], [13, 17]])) return H("#1a1418");
    if (dots(x, y, [[10, 18], [11, 18]])) return H("#3a2e30");
    if (dc < 4.3 && y <= 18) return x >= 13 ? H("#b8b09c") : H("#ece4d0");
    if (x >= 8 && x <= 13 && y >= 19 && y <= 21) return y === 20 && x % 2 ? H("#3a2e30") : x >= 13 ? H("#b8b09c") : H("#ece4d0");
    return skyV(y, "#1a1418", "#2a1e24", 17);
  },
  // XIV: water poured in a bright arc from a gold cup into a silver one, a dawn sun, a pool below
  temperance(x, y, G) {
    if (y >= 24) return (x + y) % 4 === 0 ? H("#8ad0f8") : y === 24 ? H("#5aa8e8") : H("#3a8ad0");
    const ds = D(x, y, 16, 11);
    if (ds < 1.8) return ds < 1 ? WHITE : G[4];
    if (x >= 3 && x <= 7 && y >= 11 && y <= 15) {
      if (y === 15 && (x === 3 || x === 7)) return H("#a8c8e8");
      return y === 11 ? G[4] : x === 3 ? G[4] : x === 7 || y === 14 ? G[2] : G[3];
    }
    if (x >= 14 && x <= 18 && y >= 19 && y <= 23) {
      if (y === 23 && (x === 14 || x === 18)) return H("#c0d8f0");
      return y === 19 ? WHITE : x === 14 ? WHITE : x === 18 || y === 22 ? H("#8a8ea0") : H("#c0c4d4");
    }
    const arc = (u) => 11.5 + u * 8 - 5 * Math.sin(Math.PI * u);
    if (x >= 6 && x <= 16) {
      const u = (x + 0.5 - 6.5) / 9.5, ay = arc(u), dy = y + 0.5 - ay;
      if (Math.abs(dy) < 1.1) return dy < -0.3 ? WHITE : H("#4ab0f0");
    }
    if (dots(x, y, [[9, 20], [12, 22], [5, 19]])) return H("#f0e070");
    return skyV(y, "#a8c8e8", "#c0d8f0", 16);
  },
  // XV: a horned head with burning eyes under an inverted star, chains below
  devil(x, y) {
    const P = Array.from({ length: 5 }, (_, i) => {
      const a = Math.PI / 2 + (i * TAU) / 5;
      return [10.5 + Math.cos(a) * 2.6, 11.6 + Math.sin(a) * 2.6];
    });
    if (onPath(x, y, [P[0], P[2], P[4], P[1], P[3], P[0]], 0.45)) return H("#e8c040");
    if (seg(x, y, 8, 16, 5, 12.5) < 0.7 || seg(x, y, 13, 16, 16, 12.5) < 0.7) return H("#d8c8a8");
    if (dots(x, y, [[9, 18], [12, 18]])) return H("#ffe040");
    const dh = D(x, y, 10.5, 18.5);
    if (dh < 3.5) return x < 10 ? H("#8a2a2a") : H("#6a1a1a");
    if (y >= 23 && y <= 25) {
      const lx = (x + (y === 24 ? 1 : 0)) % 3;
      if ((y === 24 && lx === 0) || (y !== 24 && lx !== 2)) return H("#8a8a98");
    }
    return y >= 20 ? H("#4a1010") : skyV(y, "#140808", "#200c0c", 14);
  },
  // XVI: a stone tower split by lightning, its crown knocked off, fire from the windows
  tower(x, y, G) {
    if (onPath(x, y, [[18.5, 9], [15.5, 11], [17, 12], [13, 14.5]], 0.6)) return x >= 16 ? WHITE : G[4];
    if (dots(x, y, [[15, 9], [16, 10], [5, 11]])) return G[3];
    if (x >= 8 && x <= 13 && y >= 11 && y <= 12) return (x + y) % 2 ? G[3] : G[2];
    if (dots(x, y, [[9, 16], [12, 19], [9, 21]])) return H("#f8c040");
    if (dots(x, y, [[9, 15], [12, 18], [9, 20], [10, 14]])) return H("#e8602a");
    if (x >= 7 && x <= 14 && y >= 13 && y <= 25) return x === 7 || (y - 13) % 4 === 0 ? H("#a8a090") : x === 14 ? H("#5a5448") : H("#8a8478");
    if (y >= 25) return H("#2a2420");
    return skyV(y, "#1a1a30", "#2a2238", 18);
  },
  star: starFace,
  moon: moonFace,
  sun: sunFace,
  // XX: a trumpet sounding from the clouds, a banner with a cross, figures rising from below
  judgement(x, y, G) {
    if (y <= 11 && (D(x, y, 6, 10) < 3 || D(x, y, 11, 9.5) < 2.8 || D(x, y, 16, 10.5) < 2.6)) return y <= 9 ? WHITE : H("#d8dcec");
    if (seg(x, y, 7, 12.5, 15, 17) < 0.6) return G[3];
    if (D(x, y, 15.8, 17.5) < 1.6) return G[4];
    if (x >= 9 && x <= 13 && y >= 15 && y <= 19 && y - 15 >= (x - 9) * 0.5 - 0.5) return (x === 11 || y === 17) && y > 15 ? H("#c83030") : WHITE;
    if (y >= 23 && ((x >= 4 && x <= 7) || (x >= 14 && x <= 17))) return y === 23 ? H("#a8a8b4") : H("#7a7a88");
    if (dots(x, y, [[5, 21], [6, 21], [15, 21], [16, 21]])) return H("#d8b8a8");
    if (dots(x, y, [[5, 22], [6, 22], [15, 22], [16, 22]])) return H("#b8a8b8");
    if (y >= 25) return H("#3a6ab0");
    return skyV(y, "#7ab0e0", "#8ac0e8", 16);
  },
  // XXI: a laurel wreath tied with red ribbon round a star, a creature's sign in each corner
  world(x, y, G) {
    const u = (x + 0.5 - 10.5) / 5.4, v = (y + 0.5 - 17.5) / 7.4, e = Math.hypot(u, v);
    if (e > 0.82 && e < 1.05) {
      if ((x === 10 || x === 11) && (y === 10 || y === 25)) return H("#d03a4a");
      return (x + y) % 2 ? H("#3a9a4a") : H("#6ac85a");
    }
    const dx = Math.abs(x + 0.5 - 10.5), dy = Math.abs(y + 0.5 - 17.5);
    if ((dx < 0.8 && dy < 4.2) || (dy < 0.8 && dx < 2.8) || dx + dy < 2) return dx + dy < 1.2 ? WHITE : G[4];
    const cs = [[4.5, 10.5, "#e8c040"], [16.5, 10.5, "#d8dcec"], [4.5, 24.5, "#c87a3a"], [16.5, 24.5, "#a85ad0"]];
    for (const [cx, cy, c] of cs) if (D(x, y, cx, cy) < 1.4) return H(c);
    return e < 0.82 ? H("#3a6ab8") : skyV(y, "#2a5a9a", "#24508a", 17);
  },
};

function sunFace(x, y, G) {
  const dx = x + 0.5 - 10.5, dy = y + 0.5 - 16, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  if (y >= 24) return (y === 24 && (x & 3) !== 1) || y === 25 ? H("#4f9a3c") : H("#2c6230");
  if (d < 3.3) return d < 2 ? H("#fffbe0") : H("#fff2b0");
  if (d < 4.6) return G[4];
  if (d < 5.5) return H("#d0581c");
  const ray = Math.floor((a / TAU + 1) * 16 + 0.5) % 2;
  return ray ? (d < 9 ? G[3] : H("#f0a83a")) : y < 13 ? H("#f2843a") : H("#e8662e");
}
function moonFace(x, y) {
  const cx = x + 0.5;
  if (y >= 23) {
    // water, with the moon's broken reflection down the middle
    if (Math.abs(cx - 10.5) < 2.2 - (y - 23) * 0.3 && (y & 1) === 0) return H("#d8e0f0");
    return (x * 3 + y * 5) % 7 === 0 ? H("#5a86c8") : y < 25 ? H("#24467e") : H("#1a3466");
  }
  const d1 = D(x, y, 10.5, 15.5), d2 = D(x, y, 12.6, 14.2);
  if (d1 < 5.6 && d2 >= 4.6) return d2 < 5.6 || d1 > 4.7 ? H("#c8c098") : H("#f8f2d4");
  for (const [sx, sy] of [[5, 11], [16, 12], [6, 20], [15, 20], [8, 10]])
    if ((x === sx && Math.abs(y - sy) <= 1) || (y === sy && Math.abs(x - sx) <= 1)) return x === sx && y === sy ? WHITE : H("#8aa0e0");
  return y < 15 ? H("#141c48") : H("#22306c");
}
function starFace(x, y, G) {
  const dx = x + 0.5 - 10.5, dy = y + 0.5 - 15.5, ax = Math.abs(dx), ay = Math.abs(dy);
  if (y >= 24) return Math.abs(x + 0.5 - 10.5) < 4 - (y - 24) && y < 26 ? H("#4a3c9a") : H("#100a22");
  if ((ax < 0.8 && ay < 7) || (ay < 0.8 && ax < 7)) return ax + ay < 2.2 ? WHITE : ax + ay < 4.5 ? G[4] : G[3];
  if (Math.abs(ax - ay) < 0.8 && ax < 3.2) return G[3];
  if (dots(x, y, [[5, 11], [16, 10], [4, 19], [17, 19], [7, 22], [14, 22], [10, 9]])) return G[4];
  return y < 14 ? H("#1a1040") : H("#2a1a5a");
}
