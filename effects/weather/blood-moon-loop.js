import { clip } from "./_lib.js";
import { scene, L } from "./_blood-moon.js";

// The crimson moon after weather/blood-moon: a red sky, the moon beating like a heart, ripples of red off its
// rim, red mist and embers along the ridge, the wolf's eye burning. Its first frame is the turn's last.
export const meta = {
  name: "Blood moon loop",
  desc: "A crimson moon beating like a heart over a red sky, ripples of red off its rim, mist and embers along the pine ridge, a wolf on a crag with a burning eye.",
  tags: ["weather", "moon", "blood", "crimson", "night", "sky", "werewolf", "scene", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 180],
  duration: L,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { moon: "silver", seed: 3 },
};

export function draw(p, t, o) {
  scene(clip(p, meta), t, o, { sweep: 1, sky: 1, mist: 1, tremble: 0, burst: -1, beat: 1 }, p, meta);
}
