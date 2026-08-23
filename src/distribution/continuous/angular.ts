import { assertFinite } from "../../internal/assert";
import { raise } from "../../internal/errors";
import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  open,
  resolveSource,
} from "../sampler";

export interface VonMisesOptions extends DistributionOptions {
  /** Mean angle in radians. */
  mu?: number;
  /** Concentration. Zero gives a uniform angle. */
  kappa?: number;
}

/**
 * Von Mises: an angle in `(-pi, pi]`, the circular analogue of a normal. A larger `kappa` concentrates draws near `mu`.
 *
 * @example
 * ```ts
 * vonMises({ mu: 0, kappa: 10 }).sample(); // 0.0782...
 * ```
 */
export function vonMises(options: VonMisesOptions = {}): NumberSampler {
  const { mu = 0, kappa = 1 } = options;
  assertFinite(mu, "mu");
  assertFinite(kappa, "kappa");
  if (kappa < 0) raise("INVALID_ARGUMENT", `kappa must be >= 0, got ${kappa}.`);
  const src = resolveSource(options.engine);

  if (kappa < 1e-8) {
    return numberSampler(() => Math.PI * (2 * src.f64() - 1), mu, Number.NaN);
  }

  const a = 1 + Math.sqrt(1 + 4 * kappa * kappa);
  const b = (a - Math.sqrt(2 * a)) / (2 * kappa);
  const r = (1 + b * b) / (2 * b);

  return numberSampler(
    () => {
      let fCandidate: number;
      for (;;) {
        const z = Math.cos(Math.PI * src.f64());
        fCandidate = (1 + r * z) / (r + z);
        const c = kappa * (r - fCandidate);
        const u = open(src);
        if (c * (2 - c) - u > 0 || Math.log(c / u) + 1 - c >= 0) break;
      }
      const theta = (src.f64() > 0.5 ? 1 : -1) * Math.acos(fCandidate) + mu;
      return Math.atan2(Math.sin(theta), Math.cos(theta));
    },
    mu,
    Number.NaN
  );
}
