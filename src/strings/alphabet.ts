const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

/**
 * The named alphabets `string()` accepts, for building your own.
 *
 * @example
 * ```ts
 * import { alphabets, string } from "ransu";
 *
 * string(8, alphabets.lower);              // "qmzdfhbx"
 * string(8, alphabets.alphanumeric);       // the default
 * string(8, alphabets.hex + alphabets.upper); // combine them as strings
 * ```
 */
export const alphabets = {
  lower: LOWER,
  upper: UPPER,
  letters: LOWER + UPPER,
  digits: DIGITS,
  alphanumeric: LOWER + UPPER + DIGITS,
  hex: "0123456789abcdef",
  hexUpper: "0123456789ABCDEF",
  binary: "01",
  octal: "01234567",
  base32: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  base32hex: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
  base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  base62: DIGITS + UPPER + LOWER,
  base64url: `${UPPER}${LOWER}${DIGITS}-_`,
  unambiguous: "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  ascii:
    "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
} as const;

export type AlphabetName = keyof typeof alphabets;
