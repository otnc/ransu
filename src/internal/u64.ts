// 64-bit arithmetic on 32-bit limbs. BigInt is far too slow for the hot path.

/** Scratch result as `[hi, lo]`. Callers must read it before the next call. */
export const R = new Uint32Array(2);

export function add64(
  aHi: number,
  aLo: number,
  bHi: number,
  bLo: number
): void {
  const lo = aLo + bLo;
  R[1] = lo;
  R[0] = aHi + bHi + (lo > 0xffffffff ? 1 : 0);
}

/** Low 64 bits of `a * b`. */
export function mul64(
  aHi: number,
  aLo: number,
  bHi: number,
  bLo: number
): void {
  const ah = aLo >>> 16;
  const al = aLo & 0xffff;
  const bh = bLo >>> 16;
  const bl = bLo & 0xffff;

  const low = al * bl;
  // `mid` can reach 2^33, so it must not be truncated with `>>>`.
  const mid = ah * bl + al * bh + (low >>> 16);

  R[1] = ((mid & 0xffff) << 16) | (low & 0xffff);
  R[0] =
    ah * bh +
    Math.floor(mid / 0x10000) +
    Math.imul(aHi, bLo) +
    Math.imul(aLo, bHi);
}

export function shr64(hi: number, lo: number, k: number): void {
  if (k === 0) {
    R[0] = hi;
    R[1] = lo;
  } else if (k < 32) {
    R[1] = (lo >>> k) | (hi << (32 - k));
    R[0] = hi >>> k;
  } else {
    R[1] = hi >>> (k - 32);
    R[0] = 0;
  }
}

export function shl64(hi: number, lo: number, k: number): void {
  if (k === 0) {
    R[0] = hi;
    R[1] = lo;
  } else if (k < 32) {
    R[0] = (hi << k) | (lo >>> (32 - k));
    R[1] = lo << k;
  } else {
    R[0] = lo << (k - 32);
    R[1] = 0;
  }
}

export function rotl64(hi: number, lo: number, k: number): void {
  if (k === 0) {
    R[0] = hi;
    R[1] = lo;
    return;
  }
  if (k === 32) {
    R[0] = lo;
    R[1] = hi;
    return;
  }
  if (k < 32) {
    R[0] = (hi << k) | (lo >>> (32 - k));
    R[1] = (lo << k) | (hi >>> (32 - k));
    return;
  }
  const j = k - 32;
  R[0] = (lo << j) | (hi >>> (32 - j));
  R[1] = (hi << j) | (lo >>> (32 - j));
}
