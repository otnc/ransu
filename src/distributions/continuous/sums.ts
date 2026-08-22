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

/** The sum of `n` independent uniforms on `[0, 1)`. */
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

/** The mean of `n` independent uniforms on `[0, 1)`. */
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
