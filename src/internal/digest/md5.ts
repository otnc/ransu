// Synchronous MD5, used only by UUID v3. `crypto.subtle.digest` is async and
// ransu never returns a Promise. Identifier derivation only, never security.

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const K = /* @__PURE__ */ (() => {
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++)
    k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
  return k;
})();

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

export function md5(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8;
  const padded = new Uint8Array((((input.length + 8) >> 6) + 1) << 6);
  padded.set(input);
  padded[input.length] = 0x80;

  // 64-bit little-endian bit length (only the low 53 bits can be meaningful).
  const tail = padded.length - 8;
  padded[tail] = bitLength & 0xff;
  padded[tail + 1] = (bitLength >>> 8) & 0xff;
  padded[tail + 2] = (bitLength >>> 16) & 0xff;
  padded[tail + 3] = (bitLength >>> 24) & 0xff;
  padded[tail + 4] = Math.floor(bitLength / 0x100000000) & 0xff;

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const m = new Uint32Array(16);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      m[i] =
        (padded[j] |
          (padded[j + 1] << 8) |
          (padded[j + 2] << 16) |
          (padded[j + 3] << 24)) >>>
        0;
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) & 15;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) & 15;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) & 15;
      }
      const tmp = d;
      d = c;
      c = b;
      const sum = (((f + a) >>> 0) + ((K[i] + m[g]) >>> 0)) >>> 0;
      b = (b + rotl(sum, SHIFTS[i])) >>> 0;
      a = tmp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const out = new Uint8Array(16);
  const words = [a0, b0, c0, d0];
  for (let i = 0; i < 4; i++) {
    const w = words[i];
    out[i * 4] = w & 0xff;
    out[i * 4 + 1] = (w >>> 8) & 0xff;
    out[i * 4 + 2] = (w >>> 16) & 0xff;
    out[i * 4 + 3] = (w >>> 24) & 0xff;
  }
  return out;
}
