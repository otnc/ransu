// Zero-dependency benchmark, so it runs unchanged on Node, Bun and Deno.
//
// Every case is compiled with `new Function` on purpose. Sharing one loop
// across several engines would make its call site megamorphic and penalise
// whichever engine happened to be measured second, which is exactly the trap a
// naive harness falls into. A fresh function per case means a fresh inline
// cache, so each number reflects the engine and not the harness.
import { normal } from "../dist/distribution.mjs";
import {
  chacha20,
  mt19937,
  mulberry32,
  nativeMath,
  pcg32,
  sfc32,
  xoshiro128pp,
  xoshiro256pp,
} from "../dist/engine.mjs";
import { Random } from "../dist/index.mjs";

const ROUNDS = 7;
const MIN_MS = 100;

const results = [];

/**
 * @param group  heading in the report
 * @param name   label for the row
 * @param params argument names visible to `expression`
 * @param expression a numeric expression, evaluated once per iteration
 * @param args   values bound to `params`
 * @param perOp  divide the result, for cases that do many elements per call
 */
let caseId = 0;
function bench(group, name, params, expression, args, perOp = 1) {
  // The unique marker matters: V8 keeps a compilation cache keyed on source
  // text, so two `new Function` calls with identical bodies share one compiled
  // function and one feedback vector. Without it, every engine would funnel
  // through the same call site and everything after the first would be measured
  // as megamorphic.
  const loop = new Function(
    "__n",
    ...params,
    `/* case ${caseId++} */ let __s = 0; for (let __i = 0; __i < __n; __i++) { __s += ${expression} } return __s`
  );
  const run = (n) => loop(n, ...args);

  let iterations = 512;
  for (;;) {
    const started = performance.now();
    run(iterations);
    if (performance.now() - started >= MIN_MS) break;
    if (iterations > 1 << 29) break;
    iterations *= 2;
  }

  let best = Number.POSITIVE_INFINITY;
  for (let round = 0; round < ROUNDS; round++) {
    const started = performance.now();
    run(iterations);
    const ns = ((performance.now() - started) * 1e6) / iterations / perOp;
    if (ns < best) best = ns;
  }
  results.push({ group, name, ns: best });
}

// --- raw engine throughput -------------------------------------------------

const ENGINES = [
  ["xoshiro128++ (default)", xoshiro128pp(1)],
  ["xoshiro256++", xoshiro256pp(1)],
  ["pcg32", pcg32(1)],
  ["sfc32", sfc32(1)],
  ["mulberry32", mulberry32(1)],
  ["mt19937", mt19937(1)],
  ["chacha20", chacha20(1)],
  ["nativeMath", nativeMath],
];

bench(
  "engine.nextUint32()",
  "Math.random() * 2^32",
  [],
  "((Math.random() * 4294967296) >>> 0)",
  []
);
for (const [name, engine] of ENGINES) {
  bench("engine.nextUint32()", name, ["e"], "e.nextUint32()", [engine]);
}

// --- the API most people actually call -------------------------------------

const seeded = new Random(1);
const native = new Random(nativeMath);

bench("a double in [0, 1)", "Math.random()", [], "Math.random()", []);
bench("a double in [0, 1)", "ransu [nativeMath]", ["r"], "r.random()", [
  native,
]);
bench("a double in [0, 1)", "ransu [xoshiro128++]", ["r"], "r.random()", [
  seeded,
]);

bench(
  "an integer in [1, 6]",
  "floor(random()*6)+1 — biased",
  [],
  "Math.floor(Math.random() * 6) + 1",
  []
);
bench("an integer in [1, 6]", "ransu [nativeMath]", ["r"], "r.integer(1, 6)", [
  native,
]);
bench(
  "an integer in [1, 6]",
  "ransu [xoshiro128++]",
  ["r"],
  "r.integer(1, 6)",
  [seeded]
);

// --- bulk work, where a native kernel could plausibly help ------------------

const words = new Uint32Array(65536);
const bytes = new Uint8Array(65536);

bench(
  "bulk, per element",
  "fillUint32 (64Ki)",
  ["e", "w"],
  "(e.fillUint32(w), w[0])",
  [xoshiro128pp(1), words],
  words.length
);
bench(
  "bulk, per element",
  "fillBytes (64Ki)",
  ["e", "b"],
  "(e.fillBytes(b), b[0])",
  [xoshiro128pp(1), bytes],
  bytes.length
);
bench(
  "bulk, per element",
  "floats(4096)",
  ["r"],
  "r.floats(4096)[0]",
  [seeded],
  4096
);
bench(
  "bulk, per element",
  "crypto fillBytes (64Ki)",
  ["b"],
  "(crypto.getRandomValues(b), b[0])",
  [bytes],
  bytes.length
);

// --- collections and distributions -----------------------------------------

const deck = Array.from({ length: 52 }, (_, i) => i);
const flat = deck.map(() => 1);
const table = seeded.weightedTable(deck, flat);

bench("collections", "pick(52)", ["r", "d"], "r.pick(d)", [seeded, deck]);
bench("collections", "shuffle(52)", ["r", "d"], "r.shuffle(d).length", [
  seeded,
  deck,
]);
bench("collections", "sample(52, 5)", ["r", "d"], "r.sample(d, 5).length", [
  seeded,
  deck,
]);
bench(
  "collections",
  "weightedPick(52)",
  ["r", "d", "w"],
  "r.weightedPick(d, w)",
  [seeded, deck, flat]
);
bench("collections", "weightedTable.pick()", ["t"], "t.pick()", [table]);

const gaussian = normal({ mean: 0, sd: 1 });
bench("distributions", "normal — ziggurat", ["g"], "g.sample()", [gaussian]);

// --- report ----------------------------------------------------------------

// Absolute nanoseconds move with machine load, so every row is also reported
// relative to `Math.random()` measured in the same run. Compare ratios across
// runs; compare nanoseconds only within one.
const baseline = results.find((row) => row.name === "Math.random()").ns;

const runtime =
  typeof Bun !== "undefined"
    ? `Bun ${Bun.version}`
    : typeof Deno !== "undefined"
      ? `Deno ${Deno.version.deno}`
      : `Node ${process.version}`;

console.log(`ransu bench — ${runtime}\n`);

let group = "";
for (const row of results) {
  if (row.group !== group) {
    group = row.group;
    console.log(`\n${group}`);
  }
  const ns = row.ns < 10 ? row.ns.toFixed(2) : row.ns.toFixed(1);
  const perSecond = 1e9 / row.ns;
  const rate =
    perSecond >= 1e9
      ? `${(perSecond / 1e9).toFixed(2)}G/s`
      : `${(perSecond / 1e6).toFixed(0)}M/s`;
  const ratio = `${(row.ns / baseline).toFixed(2)}x`;
  console.log(
    `  ${row.name.padEnd(30)} ${ns.padStart(8)} ns ${rate.padStart(8)} ${ratio.padStart(7)}`
  );
}
