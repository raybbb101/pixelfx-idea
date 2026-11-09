import { clamp, smooth, ease } from "../../core/index.js";
import { clip } from "./_lib.js";
import { scene, L } from "./_blood-moon.js";

// The moon turns to blood: a calm night, the moon trembles, a red tide sweeps across its face behind a burning
// copper edge, it pulses out a shock of red over a reddening sky, and the heart of it starts to beat. Ends on
// exactly the first frame of weather/blood-moon-loop, so play that after it to hold the crimson moon.
export const meta = {
  name: "Blood moon",
  desc: "A night sky over a wolf on a crag: the moon trembles, a red tide sweeps across it behind a copper edge, it pulses red over a bleeding sky and starts to beat.",
  tags: ["weather", "moon", "blood", "crimson", "night", "sky", "werewolf", "scene", "transform", "one-shot"],
  size: [320, 180],
  origin: [160, 180],
  duration: 6,
  loop: false,
  fps: 30,
  bg: "sky",
  options: { moon: "silver", seed: 3 }, // moon: silver | yellow | a ramp of 5 colours, dark to bright
};

const D = meta.duration, SHAKE = 1.3, SWEEP0 = 1.9, SWEEP1 = 3.6;

export function draw(p, t, o) {
  const q = clip(p, meta);
  const shk = t > SHAKE && t < SWEEP1 + 0.3 ? Math.round(Math.sin(t * 47) * (t < SWEEP0 ? (t - SHAKE) / (SWEEP0 - SHAKE) : 1) * 0.9) : 0;
  scene(q, t - D, o, {
    sweep: ease.inOutSine(clamp((t - SWEEP0) / (SWEEP1 - SWEEP0))),
    sky: smooth(2.6, 4.3, t),
    mist: smooth(3.6, 5.2, t),
    tremble: shk,
    burst: t >= SWEEP1 ? t - SWEEP1 : -1,
    beat: smooth(4.2, 4.9, t),
  }, p, meta);
}
