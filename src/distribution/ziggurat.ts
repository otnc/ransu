import type { Source } from "../internal/source";
import { open } from "./sampler";

// Marsaglia & Tsang's 128-level ziggurat. The tables are built numerically at
// load rather than pasted in, so the construction is auditable.

const LEVELS = 128;
const M1 = 2147483648;
const R = 3.442619855899;
const R_INV = 1 / R;
const AREA = 9.91256303526217e-3;

const KN = new Uint32Array(LEVELS);
const WN = new Float64Array(LEVELS);
const FN = new Float64Array(LEVELS);

{
  let dn = R;
  let tn = dn;
  const q = AREA / Math.exp(-0.5 * dn * dn);

  KN[0] = Math.floor((dn / q) * M1);
  KN[1] = 0;
  WN[0] = q / M1;
  WN[LEVELS - 1] = dn / M1;
  FN[0] = 1;
  FN[LEVELS - 1] = Math.exp(-0.5 * dn * dn);

  for (let i = LEVELS - 2; i >= 1; i--) {
    dn = Math.sqrt(-2 * Math.log(AREA / dn + Math.exp(-0.5 * dn * dn)));
    KN[i + 1] = Math.floor((dn / tn) * M1);
    tn = dn;
    FN[i] = Math.exp(-0.5 * dn * dn);
    WN[i] = dn / M1;
  }
}

/** One draw from the standard normal distribution. */
export function standardNormal(src: Source): number {
  for (;;) {
    const hz = src.u32() | 0;
    const iz = hz & 127;
    if (Math.abs(hz) < KN[iz]) return hz * WN[iz];

    if (iz === 0) {
      // The tail beyond R, by Marsaglia's exponential rejection.
      let x: number;
      let y: number;
      do {
        x = -Math.log(open(src)) * R_INV;
        y = -Math.log(open(src));
      } while (y + y < x * x);
      return hz > 0 ? R + x : -R - x;
    }

    const x = hz * WN[iz];
    if (FN[iz] + open(src) * (FN[iz - 1] - FN[iz]) < Math.exp(-0.5 * x * x))
      return x;
  }
}

/** One draw from the standard exponential distribution, by inversion. */
export function standardExponential(src: Source): number {
  return -Math.log(open(src));
}

/** Marsaglia & Tsang's gamma method. `shape` must be positive. */
export function standardGamma(src: Source, shape: number): number {
  if (shape < 1) {
    // Boost a sub-1 shape into the main algorithm's range.
    return standardGamma(src, shape + 1) * open(src) ** (1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;
    do {
      x = standardNormal(src);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = open(src);
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
