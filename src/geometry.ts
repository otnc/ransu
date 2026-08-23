import { standardNormal } from "./distribution/ziggurat";
import { globalSource } from "./global/instance";
import { assertFinite, assertLength } from "./internal/assert";
import { raise } from "./internal/errors";

/** A point, as many coordinates as the dimension asked for. */
export type Point = number[];

/** A rectangle, in the shape most layout code already uses. */
export interface Rect {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

/**
 * A uniform direction in `dimensions` dimensions, as a unit vector.
 *
 * Normalised Gaussians, which is the only construction that stays uniform on
 * the sphere in every dimension. Picking each coordinate uniformly and
 * normalising concentrates points toward the corners of the cube.
 *
 * @example
 * ```ts
 * unitVector();  // [ -0.6018, 0.7986 ]   length 1
 * unitVector(3); // [ 0.2673, -0.5345, 0.8018 ]
 * ```
 */
export function unitVector(dimensions = 2): Point {
  assertLength(dimensions, "dimensions");
  if (dimensions === 0) {
    raise("INVALID_ARGUMENT", "unitVector(): dimensions must be at least 1.");
  }
  const src = globalSource();
  for (;;) {
    const out: Point = new Array<number>(dimensions);
    let sum = 0;
    for (let i = 0; i < dimensions; i++) {
      const value = standardNormal(src);
      out[i] = value;
      sum += value * value;
    }
    // Sum zero is astronomically unlikely, but dividing by it would not be.
    if (sum === 0) continue;
    const length = Math.sqrt(sum);
    for (let i = 0; i < dimensions; i++) out[i] /= length;
    return out;
  }
}

/**
 * A uniform point on the circumference of a circle.
 *
 * @example
 * ```ts
 * onCircle(100); // [ -70.7, 70.7 ]   always exactly 100 from the origin
 * ```
 */
export function onCircle(radius = 1): Point {
  assertFinite(radius, "radius");
  const angle = globalSource().f64() * 2 * Math.PI;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

/**
 * A uniform point inside a disc.
 *
 * The square root matters: without it, points bunch up at the centre, because
 * the area at radius `r` grows with `r`.
 *
 * @example
 * ```ts
 * inCircle(50); // [ 12.4, -31.8 ]   evenly spread over the disc
 * ```
 */
export function inCircle(radius = 1): Point {
  assertFinite(radius, "radius");
  const src = globalSource();
  const angle = src.f64() * 2 * Math.PI;
  const distance = radius * Math.sqrt(src.f64());
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
}

/**
 * A uniform point on the surface of a sphere.
 *
 * @example
 * ```ts
 * onSphere(1);    // [ 0.267, -0.534, 0.801 ]
 * onSphere(2, 4); // a point on a 4-dimensional sphere of radius 2
 * ```
 */
export function onSphere(radius = 1, dimensions = 3): Point {
  assertFinite(radius, "radius");
  const direction = unitVector(dimensions);
  return direction.map((value) => value * radius);
}

/**
 * A uniform point inside a ball, by volume.
 *
 * @example
 * ```ts
 * inSphere(10); // [ 3.1, -5.7, 1.2 ]
 * ```
 */
export function inSphere(radius = 1, dimensions = 3): Point {
  assertFinite(radius, "radius");
  const direction = unitVector(dimensions);
  // The exponent generalises the square root that `inCircle` uses in 2D.
  const distance = radius * globalSource().f64() ** (1 / dimensions);
  return direction.map((value) => value * distance);
}

/**
 * A uniform point inside a rectangle.
 *
 * @example
 * ```ts
 * inRect({ x: 0, y: 0, width: 1920, height: 1080 }); // [ 842.1, 219.7 ]
 * ```
 */
export function inRect(rect: Rect): Point {
  const { x = 0, y = 0, width, height } = rect;
  assertFinite(x, "x");
  assertFinite(y, "y");
  assertFinite(width, "width");
  assertFinite(height, "height");
  const src = globalSource();
  return [x + src.f64() * width, y + src.f64() * height];
}

/**
 * A uniform angle in radians, in `[0, 2pi)`.
 *
 * @example
 * ```ts
 * angle(); // 2.4913...
 * ```
 */
export function angle(): number {
  return globalSource().f64() * 2 * Math.PI;
}

/**
 * A uniform angle in degrees, in `[0, 360)`.
 *
 * @example
 * ```ts
 * angleDegrees(); // 142.74...
 * ```
 */
export function angleDegrees(): number {
  return globalSource().f64() * 360;
}
