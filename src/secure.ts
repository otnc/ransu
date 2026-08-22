import * as collections from "./collections/index";
import type { Collection } from "./collections/pick";
import { cryptoRandom } from "./engines/crypto";
import { raise } from "./internal/errors";
import { sourceFor } from "./internal/source";
import * as core from "./numbers/index";
import { randomHex, randomString } from "./strings/random-string";

/**
 * The same API as the root, always backed by the platform CSPRNG, for cases
 * where prediction would matter. It cannot be seeded.
 */
const src = () => sourceFor(cryptoRandom);

/** Always throws: a secure generator must not be made reproducible. */
export function seed(): never {
  return raise(
    "UNSEEDABLE_ENGINE",
    "ransu/secure cannot be seeded — a predictable stream would defeat its purpose. " +
      "Import from 'ransu' if you want reproducible values."
  );
}

export function random(): number {
  return core.random(src());
}

export function float(min?: number, max?: number): number {
  return core.float(src(), min, max);
}

/** An integer in `[min, max]`, both ends included. */
export function integer(min: number, max: number): number {
  return core.integer(src(), min, max);
}

export function below(n: number): number {
  return core.below(src(), n);
}

export function range(start: number, stop?: number, step?: number): number {
  return core.range(src(), start, stop, step);
}

export function bigint(min: bigint, max: bigint): bigint {
  return core.randomBigInt(src(), min, max);
}

export function bool(p?: number): boolean {
  return core.bool(src(), p);
}

export function chance(p: number): boolean {
  return core.chance(src(), p);
}

export function oneIn(n: number): boolean {
  return core.oneIn(src(), n);
}

export function bits(n: number): number {
  return core.bits(src(), n);
}

export function bytes(n: number): Uint8Array {
  return core.bytes(src(), n);
}

export function fillBytes(out: Uint8Array): void {
  core.fillBytes(src(), out);
}

export function pick<T>(items: Collection<T>): T {
  return collections.pick(src(), items);
}

export function tryPick<T>(items: Collection<T>): T | undefined {
  return collections.tryPick(src(), items);
}

export function pickIndex<T>(items: Collection<T>): number {
  return collections.pickIndex(src(), items);
}

export function choices<T>(items: Collection<T>, k: number): T[] {
  return collections.choices(src(), items, k);
}

export function sample<T>(items: Collection<T>, k: number): T[] {
  return collections.sample(src(), items, k);
}

/** A shuffled copy, drawn from the CSPRNG. */
export function shuffle<T>(items: Collection<T>): T[] {
  return collections.shuffle(src(), items);
}

export function shuffleInPlace<T>(items: T[]): T[] {
  return collections.shuffleInPlace(src(), items);
}

export function permutation(n: number): number[] {
  return collections.permutation(src(), n);
}

export function weighted<T>(
  items: Collection<T>,
  weights: ArrayLike<number>
): T {
  return collections.weighted(src(), items, weights);
}

export function string(
  length: number,
  alphabet?: string | ArrayLike<string>
): string {
  return randomString(src(), length, alphabet);
}

export function hex(length: number): string {
  return randomHex(src(), length);
}

export { nanoid } from "./nanoid";
export { otp, password, token } from "./token";
export { ulid } from "./ulid";
export { uuid } from "./uuid/index";
