/**
 * The identity port.
 *
 * Pocket authenticates two very different callers. Agents present a long-lived
 * organization API key. People present a short-lived token from an identity
 * provider. Only the second needs a vendor, so only the second gets a port —
 * and the port is deliberately tiny, because a bug here is an authentication
 * bypass rather than a rendering glitch.
 */

/** A caller the identity provider has vouched for. */
export interface VerifiedIdentity {
  /**
   * Stable, provider-scoped subject identifier.
   *
   * @remarks This, not the email address, is what an organization is keyed on.
   * People change their email; the subject survives it.
   */
  subject: string;
  /** Contact address, when the provider exposes one. Display only. */
  email: string | null;
}

/** Verifies short-lived human session tokens. */
export interface IdentityVerifier {
  /** Provider name, surfaced by the health endpoint. */
  readonly name: string;
  /**
   * Verifies a session token.
   *
   * @param token - The bearer token presented by the browser.
   * @returns The identity the provider vouches for.
   * @throws {PocketError} `UNAUTHORIZED` when the token is absent, malformed,
   *   expired, or issued for a different application.
   */
  verify(token: string): Promise<VerifiedIdentity>;
  /**
   * Looks up richer profile detail for a subject.
   *
   * @param subject - Subject identifier from {@link IdentityVerifier.verify}.
   * @param profileToken - Optional second token from the same provider that
   *   carries profile claims. Providers that offer one rate-limit the lookup
   *   far less heavily when it is supplied, so the browser forwards it.
   * @returns The profile, or `null` when the provider cannot supply one.
   * @remarks Called only when an organization is first provisioned, so a slow
   *   or unavailable profile lookup never sits on the hot request path. A
   *   `null` here is never an authentication failure — at worst the operator
   *   gets a generic organization name they can rename.
   */
  profile(subject: string, profileToken?: string): Promise<VerifiedIdentity | null>;
}
