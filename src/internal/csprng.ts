import { raise } from "./errors";

// Synchronous CSPRNG access. No `await`, no static `node:crypto` import, so
// edge runtimes stay supported. Order: globalThis.crypto (Node >= 19, browsers,
// Deno, Bun, workerd), process.getBuiltinModule (Node >= 22.3), CJS require,
// then nothing — secure APIs throw and seeding falls back to weaker entropy.

type Filler = (out: Uint8Array) => void;

/** `getRandomValues` rejects requests larger than this, so we chunk. */
const GET_RANDOM_VALUES_LIMIT = 65536;

let resolved = false;
let filler: Filler | null = null;

interface CryptoLike {
  getRandomValues?: (array: Uint8Array) => Uint8Array;
  randomUUID?: () => string;
}

interface NodeCryptoLike {
  randomFillSync?: (buffer: Uint8Array) => Uint8Array;
  webcrypto?: CryptoLike;
}

function fromWebCrypto(c: CryptoLike): Filler | null {
  const get = c.getRandomValues;
  if (typeof get !== "function") return null;
  return (out) => {
    for (let i = 0; i < out.length; i += GET_RANDOM_VALUES_LIMIT) {
      get.call(
        c,
        out.subarray(i, Math.min(i + GET_RANDOM_VALUES_LIMIT, out.length))
      );
    }
  };
}

function fromNodeCrypto(nc: NodeCryptoLike | undefined): Filler | null {
  if (!nc) return null;
  if (typeof nc.randomFillSync === "function") {
    const fill = nc.randomFillSync;
    return (out) => {
      fill(out);
    };
  }
  return nc.webcrypto ? fromWebCrypto(nc.webcrypto) : null;
}

function resolveFiller(): Filler | null {
  const g = globalThis as unknown as {
    crypto?: CryptoLike;
    process?: { getBuiltinModule?: (id: string) => unknown };
  };

  const web = g.crypto ? fromWebCrypto(g.crypto) : null;
  if (web) return web;

  const getBuiltinModule = g.process?.getBuiltinModule;
  if (typeof getBuiltinModule === "function") {
    try {
      const node = fromNodeCrypto(
        getBuiltinModule("node:crypto") as NodeCryptoLike
      );
      if (node) return node;
    } catch {
      // fall through
    }
  }

  // CJS-only path. The specifier is assembled at runtime so bundlers targeting
  // the browser do not try to resolve it.
  try {
    const req = typeof require === "function" ? require : null;
    if (req) {
      const node = fromNodeCrypto(req(`node:${"crypto"}`) as NodeCryptoLike);
      if (node) return node;
    }
  } catch {
    // fall through
  }

  return null;
}

function getFiller(): Filler | null {
  if (!resolved) {
    filler = resolveFiller();
    resolved = true;
  }
  return filler;
}

/** Whether a cryptographically secure source is available in this runtime. */
export function hasCrypto(): boolean {
  return getFiller() !== null;
}

function requireFiller(fn: string): Filler {
  const f = getFiller();
  if (f) return f;
  return raise(
    "NO_CRYPTO",
    `${fn} needs a cryptographically secure random source, but this runtime exposes none. ` +
      "Install a `crypto.getRandomValues` polyfill (React Native: `react-native-get-random-values`), " +
      "or pass an explicit { engine } if you only need reproducible, non-secure values."
  );
}

// getRandomValues is an expensive call, so small requests come from a pool.
const POOL_SIZE = 4096;
let pool: Uint8Array | null = null;
let poolOffset = POOL_SIZE;

/** Fill `out` with cryptographically secure bytes. Throws if none available. */
export function fillSecure(out: Uint8Array, fn = "This API"): void {
  const fill = requireFiller(fn);
  const n = out.length;
  if (n >= POOL_SIZE) {
    fill(out);
    return;
  }
  if (pool === null || poolOffset + n > POOL_SIZE) {
    pool ??= new Uint8Array(POOL_SIZE);
    fill(pool);
    poolOffset = 0;
  }
  out.set(pool.subarray(poolOffset, poolOffset + n));
  poolOffset += n;
}

/** Allocate `n` cryptographically secure bytes. */
export function secureBytes(n: number, fn = "This API"): Uint8Array {
  const out = new Uint8Array(n);
  fillSecure(out, fn);
  return out;
}

/** The platform `crypto.randomUUID` if it exists — a fast path for UUID v4. */
export function nativeRandomUUID(): (() => string) | null {
  const c = (globalThis as unknown as { crypto?: CryptoLike }).crypto;
  return typeof c?.randomUUID === "function" ? c.randomUUID.bind(c) : null;
}

/**
 * Entropy for seeding a PRNG. Never throws: a weakly seeded engine still beats
 * refusing to run. Secure APIs use {@link fillSecure}, which does throw.
 */
export function seedEntropy(words: number): Uint32Array {
  const out = new Uint32Array(words);
  const f = getFiller();
  if (f) {
    f(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
    return out;
  }
  const now = Date.now();
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  let acc = (now ^ (perf ? Math.floor(perf.now() * 1000) : 0)) >>> 0;
  for (let i = 0; i < words; i++) {
    acc = (acc + 0x9e3779b9) >>> 0;
    const r = Math.floor(Math.random() * 0x100000000) >>> 0;
    let z = (acc ^ r) >>> 0;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    out[i] = (z ^ (z >>> 15)) >>> 0;
  }
  return out;
}
