// Import-shape smoke test. Runs against the built dist/ through the real
// exports map, which a unit test against src/ cannot cover.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push(`  ok  ${name}`);
  } catch (error) {
    checks.push(`FAIL  ${name}\n      ${error.message}`);
    process.exitCode = 1;
  }
}

// --- ESM -------------------------------------------------------------------

const { default: ransu, integer, pick, uuid, Random } = await import("ransu");

check("esm: default export is callable", () => {
  const value = ransu();
  assert.ok(value >= 0 && value < 1);
});

check("esm: namespace methods", () => {
  assert.ok([1, 2, 3, 4, 5, 6].includes(ransu.integer(1, 6)));
  assert.equal(ransu.string(8).length, 8);
  assert.ok(ransu.uuid.validate(ransu.uuid.v7()));
});

check("esm: named exports", () => {
  assert.ok([1, 2, 3].includes(integer(1, 3)));
  assert.equal(pick(["a"]), "a");
  assert.ok(uuid.validate(uuid.v4()));
  assert.equal(new Random(1).integer(1, 6), new Random(1).integer(1, 6));
});

check("esm: named exports are also namespace properties", () => {
  assert.equal(ransu.integer, integer);
  assert.equal(ransu.default, ransu);
});

const engineModule = await import("ransu/engine");
check("esm: ransu/engine", () => {
  const engine = engineModule.xoshiro128pp(1);
  assert.equal(typeof engine.nextUint32(), "number");
  assert.equal(engine.algorithm, "xoshiro128++");
});

const uuidModule = await import("ransu/uuid");
check("esm: ransu/uuid", () => {
  assert.ok(uuidModule.uuid.validate(uuidModule.uuid.v7()));
  assert.equal(uuidModule.v4().length, 36);
});

const nanoidModule = await import("ransu/nanoid");
check("esm: ransu/nanoid", () => {
  assert.equal(nanoidModule.nanoid().length, 21);
});

const ulidModule = await import("ransu/ulid");
check("esm: ransu/ulid", () => {
  assert.equal(ulidModule.ulid().length, 26);
});

const tokenModule = await import("ransu/token");
check("esm: ransu/token", () => {
  assert.match(tokenModule.token(16), /^[A-Za-z0-9_-]{22}$/);
  assert.match(tokenModule.otp(6), /^[0-9]{6}$/);
});

const unicodeModule = await import("ransu/unicode");
check("esm: ransu/unicode", () => {
  assert.equal([...unicodeModule.chars(5, { blocks: "emoji" })].length, 5);
  assert.equal([...unicodeModule.char({ blocks: "kana" })].length, 1);
});

const distModule = await import("ransu/distribution");
check("esm: ransu/distribution", () => {
  const sampler = distModule.normal({ mean: 5, sd: 1 });
  assert.equal(typeof sampler.sample(), "number");
  assert.equal(sampler.samples(4).length, 4);
});

const compatModule = await import("ransu/compat");
check("esm: ransu/compat", () => {
  const fn = compatModule.toMathRandom(new Random(1));
  const value = fn();
  assert.ok(value >= 0 && value < 1);
  assert.equal(compatModule.fromMathRandom(Math.random).algorithm, "function");
});

const secureModule = await import("ransu/secure");
check("esm: ransu/secure", () => {
  assert.ok([1, 2, 3].includes(secureModule.integer(1, 3)));
  assert.throws(() => secureModule.seed(), /cannot be seeded/);
});

const diceModule = await import("ransu/dice");
check("esm: ransu/dice", () => {
  const total = diceModule.dice("3d6+2");
  assert.ok(total >= 5 && total <= 20);
  assert.equal(diceModule.dice.detail("4d6").dice.length, 4);
});

const geometryModule = await import("ransu/geometry");
check("esm: ransu/geometry", () => {
  const [x, y] = geometryModule.inCircle(1);
  assert.ok(Math.hypot(x, y) <= 1);
  assert.equal(geometryModule.unitVector(3).length, 3);
});

const colorModule = await import("ransu/color");
check("esm: ransu/color", () => {
  assert.match(colorModule.color(), /^#[0-9a-f]{6}$/);
  assert.match(colorModule.color({ alpha: true }), /^#[0-9a-f]{8}$/);
  assert.equal(colorModule.rgb().length, 4);
});

const timeModule = await import("ransu/time");
check("esm: ransu/time", () => {
  const delay = timeModule.backoff(3);
  assert.ok(delay >= 0 && delay < 800);
  assert.ok(timeModule.date(0, 1000) instanceof Date);
});

const hashModule = await import("ransu/hash");
check("esm: ransu/hash", () => {
  assert.equal(hashModule.hashFloat("user-1"), hashModule.hashFloat("user-1"));
  assert.ok(hashModule.bucket("user-1", 8) < 8);
});

// --- CommonJS --------------------------------------------------------------

check("cjs: require gives the namespace itself, not { default }", () => {
  const cjs = require("ransu");
  assert.equal(typeof cjs, "function");
  assert.ok([1, 2, 3, 4, 5, 6].includes(cjs.integer(1, 6)));
  assert.ok(cjs.uuid.validate(cjs.uuid.v4()));
});

check("cjs: destructuring named exports works", () => {
  const { integer: int, pick: choose, Random: Ctor } = require("ransu");
  assert.ok([1, 2, 3].includes(int(1, 3)));
  assert.equal(choose(["x"]), "x");
  assert.equal(new Ctor(2).integer(1, 6), new Ctor(2).integer(1, 6));
});

check("cjs: .default still resolves, for interop shims", () => {
  const cjs = require("ransu");
  assert.equal(cjs.default, cjs);
});

for (const subpath of [
  "ransu/engine",
  "ransu/distribution",
  "ransu/uuid",
  "ransu/nanoid",
  "ransu/ulid",
  "ransu/token",
  "ransu/unicode",
  "ransu/dice",
  "ransu/geometry",
  "ransu/color",
  "ransu/time",
  "ransu/hash",
  "ransu/secure",
  "ransu/compat",
]) {
  check(`cjs: ${subpath}`, () => {
    const mod = require(subpath);
    assert.equal(typeof mod, "object");
    assert.ok(Object.keys(mod).length > 0);
  });
}

// --- Reproducibility across both module systems ----------------------------

check("esm and cjs agree on the same seed", () => {
  const cjs = require("ransu");
  const a = new Random(2026).integer(1, 1_000_000);
  const b = new cjs.Random(2026).integer(1, 1_000_000);
  assert.equal(a, b);
});

console.log(checks.join("\n"));
console.log(
  process.exitCode ? "\nsmoke: FAILED" : "\nsmoke: all import shapes OK"
);
