import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // The everyday loop: boundaries, errors, types, round-trips.
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.stat.test.ts"],
        },
      },
      {
        // Distribution correctness: KS and chi-square against exact CDFs and
        // pmfs, which need millions of draws. Separated so a fast `pnpm test`
        // stays fast; CI runs both.
        test: {
          name: "statistical",
          include: ["src/**/*.stat.test.ts"],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
