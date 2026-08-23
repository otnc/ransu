import { md5 } from "../internal/digest/md5";
import { nameBased } from "./name-based";

/**
 * Version 3 — name-based, using MD5 (RFC 9562 §5.3).
 *
 * The same namespace and name always give the same UUID, on any machine and
 * in any language. MD5 is broken for signatures, which is why §5.3 says new
 * designs should prefer {@link v5}; v3 remains for interoperating with what
 * already exists.
 *
 * @example
 * ```ts
 * v3("www.example.com", NAMESPACE.DNS);
 * // "5df41881-3aed-3515-88a7-2f4a814cf09e"  the RFC's own vector
 *
 * // Any of the four namespaces of Appendix A, or a UUID of your own.
 * v3("/orders/42", NAMESPACE.URL);
 * ```
 */
export function v3(
  name: string | Uint8Array,
  namespace: string | Uint8Array
): string {
  return nameBased(name, namespace, md5, 3);
}
