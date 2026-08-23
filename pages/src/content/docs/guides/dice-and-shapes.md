---
title: Dice, shapes and colours
description: The helpers that are not numbers, but are built out of them.
---

## Dice

```ts
import { dice, d20, d6, coin } from "ransu/dice";

dice("3d6+2"); // 13
dice("d20"); // 17
d6(3); // three six-sided dice, summed
coin(); // 'heads' | 'tails'

dice.detail("4d6+2");
// { total: 17, dice: [5, 2, 6, 2], modifier: 2 }
```

The notation is the usual one: `NdM`, with the count and a `+K` or `-K`
modifier both optional. `dice.detail()` reports every die, which is what a game log
wants. Anything that is not dice notation throws rather than guessing.

## Shapes

```ts
import { onCircle, inCircle, onSphere, inSphere, inRect, unitVector } from "ransu/geometry";

onCircle(5); // [x, y] on the circumference
inCircle(5); // [x, y] inside the disc
onSphere(1); // [x, y, z] on the surface
inSphere(1); // [x, y, z] inside
inRect({ x: 0, y: 0, width: 800, height: 600 });
unitVector(4); // a uniform direction in four dimensions
```

Two of these are easy to get wrong by hand.

`inCircle` takes the square root of a uniform draw. Without it, points bunch up
at the centre, because the area available at radius *r* grows with *r*.
`inSphere` generalises that to a cube root, and the tests check both by counting
what fraction lands inside the half-area and half-volume radius.

`unitVector` normalises Gaussians rather than normalising a uniform cube point.
The cube version concentrates directions toward the corners, and the higher the
dimension the worse it gets.

## Colours

```ts
import { color, rgb, hsl } from "ransu/color";

color(); // '#3f7ac2'
rgb(); // [63, 122, 194, 1]
hsl(); // [214.2, 0.51, 0.5, 1]
color({ alpha: true }); // '#3f7ac2b3'
color({ format: "rgb" }); // 'rgb(63 122 194)'

color({ hue: [200, 260], saturation: [0.6, 0.9] });
```

Colours are drawn in HSL and converted, not by picking three bytes. A uniform
point in the RGB cube is usually a muddy brown, because most of the cube is
desaturated. The defaults keep saturation in `[0.45, 0.9]` and lightness in
`[0.35, 0.65]`; pass the full spans to get the whole gamut back.

Opacity is opt-in. Leave `alpha` out and colours are opaque with no alpha in
the output; pass `true` for a random one, a number to fix it, or a span to draw
from a band. `color({ format })` writes hex, `rgb()` or `hsl()` notation.
