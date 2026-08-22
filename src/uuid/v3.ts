import { md5 } from "../internal/digest/md5";
import { nameBased } from "./name-based";

/** Version 3 — MD5 of a namespace and a name. Deterministic, never random. */
export function v3(
  name: string | Uint8Array,
  namespace: string | Uint8Array
): string {
  return nameBased(name, namespace, md5, 3);
}
