/**
 * The namespace UUIDs defined by RFC 9562 Appendix A, for use with the
 * name-based versions 3 and 5.
 */
export const NAMESPACE = {
  DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

export type NamespaceName = keyof typeof NAMESPACE;
