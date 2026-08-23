import { globalSource } from "./global/instance";
import { assertFinite } from "./internal/assert";
import { raise } from "./internal/errors";

/** A fixed value, or an inclusive `[min, max]` to draw from. */
export type Span = number | readonly [number, number];

export interface ColorOptions {
  /** Hue in degrees, `[0, 360]`. Defaults to the whole wheel. */
  hue?: Span;
  /** Saturation in `[0, 1]`. Defaults to `[0.45, 0.9]`. */
  saturation?: Span;
  /** Lightness in `[0, 1]`. Defaults to `[0.35, 0.65]`. */
  lightness?: Span;
  /**
   * Opacity in `[0, 1]`.
   *
   * Left out, colours are opaque and no alpha appears in the output. Pass
   * `true` for a fully random opacity, a number to fix it, or a span to draw
   * from a band.
   */
  alpha?: Span | true;
  /** Which notation {@link color} returns. Defaults to hex. */
  format?: "hex" | "rgb" | "hsl";
}

// Drawn in HSL and converted, not by picking three bytes: a uniform point in
// the RGB cube is usually a muddy brown, because most of the cube is
// desaturated. Pass the full spans to get the whole gamut back.
const DEFAULT_HUE: Span = [0, 360];
const DEFAULT_SATURATION: Span = [0.45, 0.9];
const DEFAULT_LIGHTNESS: Span = [0.35, 0.65];

function draw(name: string, span: Span, limit: readonly [number, number]) {
  const [min, max] = typeof span === "number" ? [span, span] : span;
  assertFinite(min, `${name}[0]`);
  assertFinite(max, `${name}[1]`);
  if (min > max) {
    raise("INVALID_RANGE", `${name}: min (${min}) must be <= max (${max}).`);
  }
  if (min < limit[0] || max > limit[1]) {
    raise(
      "INVALID_ARGUMENT",
      `${name} must stay within [${limit[0]}, ${limit[1]}], got [${min}, ${max}].`
    );
  }
  return min === max ? min : min + globalSource().f64() * (max - min);
}

function alphaOf(options: ColorOptions): number {
  if (options.alpha === undefined) return 1;
  if (options.alpha === true) return globalSource().f64();
  return draw("alpha", options.alpha, [0, 1]);
}

/** `[hue, saturation, lightness, alpha]`, with hue in degrees. */
export function hsl(
  options: ColorOptions = {}
): [number, number, number, number] {
  return [
    draw("hue", options.hue ?? DEFAULT_HUE, [0, 360]),
    draw("saturation", options.saturation ?? DEFAULT_SATURATION, [0, 1]),
    draw("lightness", options.lightness ?? DEFAULT_LIGHTNESS, [0, 1]),
    alphaOf(options),
  ];
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (((h % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const base = l - chroma / 2;

  // Which two channels carry the chroma depends on the sixth of the wheel.
  const [r, g, b] =
    sector < 1
      ? [chroma, second, 0]
      : sector < 2
        ? [second, chroma, 0]
        : sector < 3
          ? [0, chroma, second]
          : sector < 4
            ? [0, second, chroma]
            : sector < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];

  return [
    Math.round((r + base) * 255),
    Math.round((g + base) * 255),
    Math.round((b + base) * 255),
  ];
}

/** `[red, green, blue, alpha]`, channels `0` to `255` and alpha `0` to `1`. */
export function rgb(
  options: ColorOptions = {}
): [number, number, number, number] {
  const [h, s, l, a] = hsl(options);
  const [r, g, b] = toRgb(h, s, l);
  return [r, g, b, a];
}

const hex2 = (value: number) => value.toString(16).padStart(2, "0");
/** Two decimals is enough for alpha, and reads better than the full float. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * A CSS colour string.
 *
 * Hex by default. Opacity only appears when `alpha` was asked for, so the
 * common case stays `#rrggbb`.
 */
export function color(options: ColorOptions = {}): string {
  const withAlpha = options.alpha !== undefined;

  if (options.format === "hsl") {
    const [h, s, l, a] = hsl(options);
    const body = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    return `hsl(${body}${withAlpha ? ` / ${round2(a)}` : ""})`;
  }

  const [r, g, b, a] = rgb(options);
  if (options.format === "rgb") {
    return `rgb(${r} ${g} ${b}${withAlpha ? ` / ${round2(a)}` : ""})`;
  }
  const alphaByte = withAlpha ? hex2(Math.round(a * 255)) : "";
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${alphaByte}`;
}
