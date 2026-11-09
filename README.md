# pixelfx-idea

Original pixel magic effects made with [pixelfx](https://github.com/patch-gg/pixelfx).

## Prism Nova (`arcane/prism-nova`)

![Prism Nova](renders/prism-nova/anim.gif)

A crystal prism forms in the air, catches a shaft of light and rakes a rainbow fan across the floor,
then overloads, cracks and bursts into spectral shards. One-shot, 2.9 s, 30 fps, 280 x 160 px.

- `effects/arcane/prism-nova.js`: the effect source. Copy it to `src/fx/arcane/` in a pixelfx checkout.
- `renders/prism-nova/prism-nova.png` + `.json`: sprite sheet (88 frames, 8 columns, Aseprite-style JSON).
  Pivot `[112, 134]` (the floor under the prism), 30 fps, no loop. Use nearest filtering.
- `renders/prism-nova/contact.png`: frames at a glance.

Options: `palette` (crystal ramp, dark to bright), `spectrum` (the 7 rainbow colors), `seed`.

```sh
node tools/render.mjs arcane/prism-nova --gif
node tools/render.mjs arcane/prism-nova --sheet --opts '{"spectrum":["#ff2a6a","#ff6ad0","#c06aff","#7a6aff","#4aa0ff","#4affe0","#ffffff"]}'
```

## Inferno Rise (`transitions/inferno-rise`)

![Inferno Rise](renders/inferno-rise/anim.gif)

A screen transition. A roaring wall of flame climbs the screen from the bottom, leaving black char.
The char smoulders with glowing cracks, then crumbles away from the top down in falling ash and
the picture returns. One-shot, 3.4 s, 30 fps, 320 x 180 (full screen).

The screen is fully covered from about 1.1 s to 1.7 s, so swap your scene in that window.

- `effects/transitions/inferno-rise.js`: copy to `src/fx/transitions/` in a pixelfx checkout
  (it uses that folder's `_lib.js`).
- `renders/inferno-rise/inferno-rise.png` + `.json`: sprite sheet, 103 frames, transparent where the
  picture shows through. Pivot `[0, 0]` (top-left), 30 fps, no loop.

Options: `palette` (fire ramp, dark to bright), `color` (the cover, default near-black), `seed`.

## Tarot Draw (`arcane/tarot-draw`): all 22 Major Arcana

![The deck](renders/tarot-deck.png)

| The Sun (XIX) | The Moon (XVIII) | The Star (XVII) |
|---|---|---|
| ![Sun](renders/tarot-sun/anim.gif) | ![Moon](renders/tarot-moon/anim.gif) | ![Star](renders/tarot-star/anim.gif) |

Seven tarot cards fan out and spin round in a tilted ring, backs to us, over a rune ring on the floor.
The ring slows, one card floats up and grows while the rest pop into motes, and it flips to reveal its
face in a burst of light, glows, then dissolves upward. One-shot, 3.7 s, 30 fps, 232 x 176 px,
pivot `[116, 148]` (the floor under the ring).

Pick the card with the `card` option:

| | | | | | |
|---|---|---|---|---|---|
| 0 `fool` | I `magician` | II `priestess` | III `empress` | IV `emperor` | V `hierophant` |
| VI `lovers` | VII `chariot` | VIII `strength` | IX `hermit` | X `wheel` | XI `justice` |
| XII `hanged` | XIII `death` | XIV `temperance` | XV `devil` | XVI `tower` | XVII `star` |
| XVIII `moon` | XIX `sun` | XX `judgement` | XXI `world` | | |

- `effects/arcane/tarot-draw.js`: the effect. `effects/arcane/_tarot.js`: the 22 card faces.
  Copy both to `src/fx/arcane/` in a pixelfx checkout.
- `renders/tarot-<card>/`: a sprite sheet + JSON, contact sheet and GIF for every card.

```sh
node tools/render.mjs arcane/tarot-draw --opts '{"card":"tower"}' --gif --sheet
```

**Adding more cards:** each face in `_tarot.js` is a small function that returns a colour for each cell
of the card's picture area (x 3..18, y 9..26 on a 22 x 34 card). Add one and its numeral to `NUM`.
Other options: `palette` (the card back and magic, dark to bright), `gold` (the frames), `seed`.
