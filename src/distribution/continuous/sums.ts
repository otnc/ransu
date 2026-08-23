import {
  type DistributionOptions,
  type NumberSampler,
  numberSampler,
  resolveSource,
} from "../sampler";
import { assertPositive } from "./guards";

export interface IrwinHallOptions extends DistributionOptions {
  n: number;
}

/**
 * Irwin-Hall: the sum of `n` uniforms. With `n` of 12 it is a cheap normal approximation.
 *
 * @example
 * ```ts
 * irwinHall({ n: 12 }).sample(); // 6.1284...
 * ```
 */
export function irwinHall(options: IrwinHallOptions): NumberSampler {
  const { n } = options;
  assertPositive(n, "n");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => {
      let total = 0;
      for (let i = 0; i < n; i++) total += src.f64();
      return total;
    },
    n / 2,
    n / 12
  );
}

/**
 * Bates: the mean of `n` uniforms, so Irwin-Hall divided by `n`.
 *
 * @example
 * ```ts
 * bates({ n: 10 }).sample(); // 0.5127...
 * ```
 */
export function bates(options: IrwinHallOptions): NumberSampler {
  const { n } = options;
  assertPositive(n, "n");
  const src = resolveSource(options.engine);
  return numberSampler(
    () => {
      let total = 0;
      for (let i = 0; i < n; i++) total += src.f64();
      return total / n;
    },
    0.5,
    1 / (12 * n)
  );
}
