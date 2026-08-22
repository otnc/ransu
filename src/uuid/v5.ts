import { sha1 } from "../internal/digest/sha1";
import { nameBased } from "./name-based";

/** Version 5 — SHA-1 of a namespace and a name. Preferred over {@link v3}. */
export function v5(
  name: string | Uint8Array,
  namespace: string | Uint8Array
): string {
  return nameBased(name, namespace, sha1, 5);
}
