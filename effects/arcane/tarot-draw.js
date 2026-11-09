import { FACES, NUM, CARDS } from "./_tarot.js";
import { Particles, Lights, P, Rng, fit, hex, mix, flare, sparkle, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.js";

// Tarot cards fan out of a point and spin round it in a tilted ring, backs to us; the ring slows, one card
// floats up and grows while the rest scatter into motes, and it flips to show its face in a burst of light,
// glows, then dissolves upward. The face is an option: the faces live in _tarot.js.
const CY = -36, RX = 60, RY = 14, N = 7, FAN = 0.35, PICK = 1.6, UP = 2.05, FLIP = 2.1, SHOWN = 2.45, FADE = 3.15, TOP = -66;
const S0 = 0.85, S1 = 1.8; // card scale in the ring, and once drawn (a card is 22 x 34 at scale 1)
const CW = 22, CH = 34;

export const meta = {
  name: "Tarot draw",
  desc: "Tarot cards fan out and spin round in a tilted ring; it slows, one card floats up and flips to reveal its face in a burst of light, then dissolves upward.",
  tags: ["arcane", "tarot", "card", "fortune", "divination", "magic", "reveal", "one-shot"],
  size: [232, 176],
  origin: [116, 148],
  duration: 3.7,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    card: "sun", // any of the 22 Major Arcana: fool magician priestess empress emperor hierophant lovers chariot strength hermit wheel justice hanged death temperance devil tower star moon sun judgement world
    palette: ["#0c0820", "#1e1446", "#33207a", "#4c32a8", "#7454d8", "#a888f4", "#dcccff", "#ffffff"],
    gold: ["#2e1a06", "#6e4612", "#b67e22", "#e8b840", "#fff0a0"],
    seed: 5,
  },
};

const INK = hex("#140c18"), PAPER = hex("#eadcb4"), PAPER2 = hex("#c8b48a");
// one card cell (x 0..21, y 0..33): the face or the back. Returns a colour or 0.
function cell(x, y, face, kind, C, G) {
  if (x === 0 || x === 21 || y === 0 || y === 33) return INK;
  if (x === 1 || x === 20 || y === 1 || y === 32) return x === 1 || y === 1 ? G[4] : G[2];
  if (x === 2 || x === 19 || y === 2 || y === 31) return INK;
  if (!face) {
    // the back: a violet field with a gold diamond and an eye, a lattice of dots, gold corners
    const dx = Math.abs(x + 0.5 - 11), dy = Math.abs(y + 0.5 - 17), dm = dx + dy * 0.62;
    if ((x === 3 || x === 18) && (y === 3 || y === 30)) return G[3];
    if (dm > 6.3 && dm < 7.3) return G[3];
    if (dm <= 6.3) {
      // an eye: a gold-rimmed almond, a violet iris, a dark pupil with a glint
      const e = Math.hypot(dx / 4, dy / 2.1), d = Math.hypot(dx, dy * 1.2);
      if (e < 1) return d < 0.9 ? (x === 10 && y === 16 ? WHITE : INK) : d < 2.1 ? C[4] : C[6];
      if (e < 1.3) return G[3];
      return C[3];
    }
    if ((x + y) % 4 === 0 && (x - y) % 4 === 0) return C[4];
    return y < 17 ? C[2] : C[1];
  }
  if (y <= 7 || y >= 28) return y === 7 || y === 28 ? PAPER2 : PAPER; // the plates for the number and title
  if (y === 8 || y === 27) return INK;
  return (FACES[kind] ?? FACES.sun)(x, y, G);
}

// a card centred at (cx, cy), scale s, width factor sx (1 face-on, 0 edge-on, < 0 the other side)
function card(p, cx, cy, s, sx, faceUp, kind, C, G, a = 1, dim = 0, wipe = -1) {
  const w = Math.abs(sx), hw = (CW / 2) * s * Math.max(w, 0.06), hh = (CH / 2) * s;
  const face = sx < 0 ? !faceUp : faceUp;
  p.shade(cx - hw - 1, cy - hh - 1, cx + hw + 1, cy + hh + 1, (x, y, o) => {
    let u = (x - cx) / (s * Math.max(w, 0.06)) + CW / 2;
    const v = (y - cy) / s + CH / 2;
    if (u < 0 || u >= CW || v < 0 || v >= CH) return;
    if (sx < 0) u = CW - u;
    if (w < 0.12) return mix(G[3], WHITE, 0.4);
    let c = cell(Math.floor(u), Math.floor(v), face, kind, C, G);
    if (!c) return;
    // the card turning away from us darkens; the far side of the ring is dimmer
    const k = dim + (1 - w) * 0.45;
    if (k > 0) c = mix(c, C[0], Math.min(0.85, k));
    // dissolving: a ragged line sweeping up the card, white-hot at its edge
    if (wipe >= 0) {
      const e = v / CH - (1 - wipe) + (rand(Math.floor(u), Math.floor(v), 7) - 0.5) * 0.18;
      if (e > 0) return;
      if (e > -0.05) c = WHITE;
      else if (e > -0.1) c = mix(c, G[4], 0.6);
    }
    o.a = a;
    return c;
  });
}

export function create(o) {
  const C = fit(o.palette, 8).map(hex), G = fit(o.gold, 5).map(hex), R = new Rng(o.seed), kind = FACES[o.card] ? o.card : "sun";
  const ps = new Particles({ rng: R, sparks: [WHITE, G[4], G[3], C[5]] }), lights = new Lights();
  const spin = (t) => 9 * (1 - Math.exp(-1.3 * t));
  // the card that is drawn: whichever is nearest the front when the ring slows
  let pick = 0, best = 9;
  for (let i = 0; i < N; i++) {
    const th = spin(PICK) + (i * TAU) / N, d = Math.abs(((th - Math.PI / 2) % TAU + TAU) % TAU - (((th - Math.PI / 2) % TAU + TAU) % TAU > Math.PI ? TAU : 0));
    if (d < best) (best = d), (pick = i);
  }
  const th0 = spin(PICK) + (pick * TAU) / N;
  let t = 0, fanned = false, flipped = false, scattered = false, gone = false;
  const ring = (i, t) => {
    const th = spin(t) + (i * TAU) / N, open = ease.outBack(clamp(t / FAN)), out = 1 + 0.9 * ease.inQuad(clamp((t - PICK) / 0.5));
    return { th, x: Math.cos(th) * RX * open * out, y: CY + Math.sin(th) * RY * open * out + Math.sin(t * 3 + i * 1.7) * 1.5, z: Math.sin(th) };
  };
  // the drawn card's flight: from its place in the ring up to the top, growing, settling with a bob
  const drawn = (t) => {
    const u = ease.inOutCubic ? ease.inOutCubic(clamp((t - PICK) / (UP - PICK))) : smooth(PICK, UP, t);
    const x0 = Math.cos(th0) * RX, y0 = CY + Math.sin(th0) * RY;
    return { x: x0 * (1 - u), y: y0 + (TOP - y0) * u + (t > UP ? Math.sin((t - UP) * 4) * 1.2 : 0), s: S0 + (S1 - S0) * u, u };
  };

  return {
    update(dt) {
      t += dt;
      if (!fanned) {
        fanned = true;
        lights.add(0, CY, 50, C[5], 0.7, 0.3);
        for (let i = 0; i < 16; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 110);
          ps.spawn(P.STAR, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, R.range(0.25, 0.5), R.pick([WHITE, G[4], C[6]]), R.range(0.8, 1.4));
        }
      }
      // glints shed off the spinning cards
      if (t < PICK + 0.3 && t > 0.2 && R.chance(0.5)) {
        const i = R.int(0, N - 1), c = ring(i, t);
        ps.spawn(P.MOTE, c.x + R.range(-4, 4), c.y + R.range(-7, 7), -Math.sin(c.th) * 30, R.range(-20, -5), R.range(0.2, 0.45), R.pick([G[4], C[6]]), 0.8);
      }
      if (!scattered && t >= PICK + 0.4) {
        // the cards left in the ring pop into motes
        scattered = true;
        for (let i = 0; i < N; i++) {
          if (i === pick) continue;
          const c = ring(i, t);
          lights.add(c.x, c.y, 18, C[5], 0.5, 0.2);
          for (let j = 0; j < 8; j++) {
            const a = R.range(0, TAU), sp = R.range(20, 70);
            ps.spawn(j % 3 ? P.MOTE : P.STAR, c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.3, 0.6), R.pick([WHITE, G[4], C[5], C[6]]), R.range(0.7, 1.3));
          }
        }
      }
      const mid = FLIP + (SHOWN - FLIP) / 2;
      if (!flipped && t >= mid) {
        flipped = true;
        const d = drawn(t);
        lights.add(d.x, d.y, 90, G[3], 0.5, 0.5);
        lights.add(d.x, d.y, 30, WHITE, 0.9, 0.1);
        for (let i = 0; i < 40; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 180);
          ps.spawn(R.chance(0.5) ? P.STAR : P.MOTE, d.x, d.y, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, R.range(0.3, 0.7), R.pick([WHITE, G[4], G[3], C[6]]), R.range(0.8, 1.6));
        }
      }
      // the face glows: glints rise off it; then it burns away upward into motes
      if (t > SHOWN && t < FADE && R.chance(0.35)) {
        const d = drawn(t);
        ps.spawn(P.STAR, d.x + R.range(-22, 22), d.y + R.range(-30, 30), R.range(-6, 6), -R.range(10, 30), R.range(0.3, 0.6), R.pick([WHITE, G[4]]), R.range(0.7, 1.2));
      }
      if (t >= FADE && t < FADE + 0.4) {
        const d = drawn(t), k = (t - FADE) / 0.4, ey = d.y + CH / 2 * d.s - CH * d.s * k;
        for (let i = 0; i < 4; i++) ps.spawn(R.chance(0.6) ? P.MOTE : P.STAR, d.x + R.range(-CW / 2, CW / 2) * d.s, ey, R.range(-12, 12), -R.range(30, 80), Math.min(R.range(0.3, 0.6), meta.duration - 0.05 - t), R.pick([WHITE, G[4], G[3]]), R.range(0.7, 1.3));
      }
      if (!gone && t >= FADE + 0.4) gone = true;
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // a rune ring on the floor while the cards spin
      const k = clamp(t / FAN) * (1 - smooth(PICK, PICK + 0.6, t));
      if (k > 0) {
        p.glow(0, -2, 56, C[4], 0.3 * k);
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * TAU;
          p.dot(Math.cos(a) * 52 * k, Math.sin(a) * 8 * k, C[3], k);
          if (i % 2) p.dot(Math.cos(a) * 40 * k, Math.sin(a) * 6 * k, C[2], k);
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU - t * 0.8;
          p.dot(Math.cos(a) * 46 * k, Math.sin(a) * 7 * k, i % 3 ? C[5] : G[3], k);
        }
      }
    },
    draw(p) {
      // the ring: far cards first, dimmer; the drawn card leaves it at PICK
      const order = [];
      for (let i = 0; i < N; i++) if (!(i === pick && t >= PICK) && !(scattered && i !== pick)) order.push([i, ring(i, t)]);
      order.sort((a, b) => a[1].z - b[1].z);
      for (const [i, c] of order) {
        const s = S0 * clamp(0.3 + t / FAN), fade = 1 - smooth(PICK + 0.1, PICK + 0.4, t);
        // backs face out at the front, faces glimpsed on the far side
        card(p, c.x, c.y, s, c.z, false, CARDS[(i * 5 + o.seed * 3) % CARDS.length], C, G, fade, c.z < 0 ? 0.35 : 0);
        if (c.z > 0.6 && t < PICK) p.glow(c.x, c.y, 12, C[5], 0.12);
      }
      if (t < FAN) {
        const k = t / FAN;
        p.circle(0, CY, 6 * (1 - k) + 1, WHITE);
        flare(p, 0, CY, 20 * (1 - k) + 3, 1 - k, C);
      }
      if (t >= PICK && t < FADE + 0.4) {
        const d = drawn(t);
        const f = clamp((t - FLIP) / (SHOWN - FLIP)), sx = Math.cos(f * Math.PI);
        const wipe = t >= FADE ? (t - FADE) / 0.4 : -1;
        // a halo behind it: soft, then rays once it is face up
        p.glow(d.x, d.y, 30 * d.s, C[4], 0.18 + 0.14 * d.u);
        if (t > SHOWN - 0.15 && wipe < 0) {
          const k = Math.min(1, (t - SHOWN + 0.15) / 0.2);
          for (let r = 0; r < 12; r++) {
            const a = (r / 12) * TAU + t * 0.6, L = (r % 2 ? 30 : 44) * k;
            p.line(d.x + Math.cos(a) * 26, d.y + Math.sin(a) * 34, d.x + Math.cos(a) * (26 + L), d.y + Math.sin(a) * (34 + L * 0.6), r % 2 ? C[5] : G[3], (u) => (1 - u) * 0.8 * k);
          }
          p.glow(d.x, d.y, 50, G[3], 0.18 * k);
        }
        card(p, d.x, d.y, d.s, sx, false, kind, C, G, 1, 0, wipe);
        // the number on the top plate, once it faces us
        if (sx < -0.92 && wipe < 0.15) p.text(NUM[kind], d.x, d.y - (CH / 2 - 3) * d.s, INK, { align: "center" });
        if (Math.abs(sx) < 0.3) p.glow(d.x, d.y, 26, WHITE, 0.6 * (1 - Math.abs(sx) / 0.3));
        if (t > SHOWN && wipe < 0) sparkle(p, d.x - 14, d.y - 24, 2 + 2 * (0.5 + 0.5 * Math.sin(t * 9)), WHITE, G[4], 0.7);
        if (t > SHOWN + 0.2 && wipe < 0) sparkle(p, d.x + 15, d.y + 20, 2 + 2 * (0.5 + 0.5 * Math.sin(t * 7 + 2)), WHITE, C[6], 0.6);
        const fl = clamp((t - (FLIP + (SHOWN - FLIP) / 2)) / 0.3);
        if (fl > 0 && fl < 1) {
          flare(p, d.x, d.y, 50 * (1 - fl) + 6, 1 - fl, G);
          p.ring(d.x, d.y, 8 + 50 * ease.outCubic(fl), Math.max(1, 3 * (1 - fl)), fl < 0.2 ? WHITE : G[3], 1 - fl);
        }
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
