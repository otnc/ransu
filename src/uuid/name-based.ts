import { raise } from "../internal/errors";
import { brand, parse, stringify } from "./codec";

const encoder = /* @__PURE__ */ new TextEncoder();

function namespaceBytes(namespace: string | Uint8Array): Uint8Array {
  if (typeof namespace === "string") {
    // `parse` validates and reports on its own.
    return parse(namespace);
  }
  if (namespace.length !== 16) {
    raise(
      "INVALID_ARGUMENT",
      "A namespace given as bytes must be exactly 16 bytes long."
    );
  }
  return namespace;
}

export function nameBased(
  name: string | Uint8Array,
  namespace: string | Uint8Array,
  digest: (input: Uint8Array) => Uint8Array,
  uuidVersion: number
): string {
  const ns = namespaceBytes(namespace);
  const value = typeof name === "string" ? encoder.encode(name) : name;

  const input = new Uint8Array(16 + value.length);
  input.set(ns);
  input.set(value, 16);

  return stringify(brand(digest(input).slice(0, 16), uuidVersion));
}
