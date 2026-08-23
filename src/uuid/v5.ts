import { sha1 } from "../internal/digest/sha1";
import { nameBased } from "./name-based";

/**
 * Version 5 — name-based, using SHA-1 (RFC 9562 §5.5).
 *
 * The name-based version to prefer. Deriving an ID from a name you already
 * have means no coordination and no storage: the same input yields the same
 * UUID everywhere, forever.
 *
 * @example
 * ```ts
 * v5("www.example.com", NAMESPACE.DNS);
 * // "2ed6657d-e927-568b-95e1-2665a8aea6a2"  the RFC's own vector
 *
 * // Stable IDs for rows keyed by something natural.
 * v5("user:alice@example.com", NAMESPACE.URL);
 * ```
 */
export function v5(
  name: string | Uint8Array,
  namespace: string | Uint8Array
): string {
  return nameBased(name, namespace, sha1, 5);
}
