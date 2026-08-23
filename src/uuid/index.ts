import {
  compare,
  MAX,
  NIL,
  parse,
  stringify,
  validate,
  version,
} from "./codec";
import { NAMESPACE } from "./namespace";
import type { UuidOptions } from "./options";
import { timestamp } from "./timestamp";
import { v1 } from "./v1";
import { DCE_DOMAIN, v2 } from "./v2";
import { v3 } from "./v3";
import { v4 } from "./v4";
import { v5 } from "./v5";
import { v1ToV6, v6, v6ToV1 } from "./v6";
import { v7 } from "./v7";
import { v8 } from "./v8";

/**
 * `uuid` is both a function and a namespace: calling it gives a v4, everything
 * else hangs off it. Names and argument order match the `uuid` package.
 */
export interface UuidApi {
  (options?: UuidOptions): string;
  v1: typeof v1;
  v2: typeof v2;
  v3: typeof v3;
  v4: typeof v4;
  v5: typeof v5;
  v6: typeof v6;
  v7: typeof v7;
  v8: typeof v8;
  v1ToV6: typeof v1ToV6;
  v6ToV1: typeof v6ToV1;
  parse: typeof parse;
  stringify: typeof stringify;
  validate: typeof validate;
  version: typeof version;
  compare: typeof compare;
  timestamp: typeof timestamp;
  NIL: string;
  MAX: string;
  NAMESPACE: typeof NAMESPACE;
  DCE_DOMAIN: typeof DCE_DOMAIN;
}

/**
 * A UUID, in every version RFC 9562 defines.
 *
 * Calling it gives a v4; every version and helper hangs off it. Names and
 * argument order match the `uuid` package, so it is a drop-in for that.
 *
 * @example
 * ```ts
 * uuid();    // "39817b65-27b9-45d0-9b51-315d530a3211"  a v4
 * uuid.v4(); // the same thing, spelled out
 *
 * // Time-ordered, so it sorts by creation time in a database index.
 * uuid.v7(); // "0198f2a4-1c05-7e2b-8f31-9d4a7c0e15b3"
 *
 * // Name-based: the same name always gives the same UUID.
 * uuid.v5("example.com", uuid.NAMESPACE.DNS);
 *
 * uuid.validate(uuid());     // true
 * uuid.version(uuid.v7());   // 7
 * uuid.timestamp(uuid.v7()); // 1756890764019
 *
 * uuid.NIL; // "00000000-0000-0000-0000-000000000000"
 * uuid.MAX; // "ffffffff-ffff-ffff-ffff-ffffffffffff"
 * ```
 */
export const uuid: UuidApi = /* @__PURE__ */ Object.assign(
  (options?: UuidOptions): string => v4(options),
  {
    v1,
    v2,
    v3,
    v4,
    v5,
    v6,
    v7,
    v8,
    v1ToV6,
    v6ToV1,
    parse,
    stringify,
    validate,
    version,
    compare,
    timestamp,
    NIL,
    MAX,
    NAMESPACE,
    DCE_DOMAIN,
  }
);

export {
  compare,
  MAX,
  NIL,
  parse,
  stringify,
  validate,
  version,
} from "./codec";
export { NAMESPACE, type NamespaceName } from "./namespace";
export type { TimeUuidOptions, UuidOptions } from "./options";
export { timestamp } from "./timestamp";
export { v1 } from "./v1";
export { DCE_DOMAIN, v2 } from "./v2";
export { v3 } from "./v3";
export { v4 } from "./v4";
export { v5 } from "./v5";
export { v1ToV6, v6, v6ToV1 } from "./v6";
export { v7 } from "./v7";
export { v8 } from "./v8";
