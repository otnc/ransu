/**
 * The namespace UUIDs of RFC 9562 Appendix A, for the name-based versions 3
 * and 5.
 *
 * @example
 * ```ts
 * v5("www.example.com", NAMESPACE.DNS);
 * v5("https://example.com/a", NAMESPACE.URL);
 * v5("1.3.6.1.4.1", NAMESPACE.OID);
 * v5("CN=Alice,DC=example", NAMESPACE.X500);
 * ```
 */
export const NAMESPACE = {
  DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

export type NamespaceName = keyof typeof NAMESPACE;
