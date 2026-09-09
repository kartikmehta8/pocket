/**
 * Privy session verification.
 *
 * The dashboard signs people in with Privy's hosted login and forwards the
 * resulting access token to the API. This adapter is what turns that token
 * into a subject Purse will trust with an organization's money, so it fails
 * closed on every path: any error from Privy — expired, forged, or issued for
 * another application — becomes `UNAUTHORIZED` rather than a partial success.
 */

import { PrivyClient } from '@privy-io/server-auth';
import { PurseError, type IdentityVerifier, type VerifiedIdentity } from '@purse/core';

/** Options for {@link PrivyIdentityVerifier}. */
export interface PrivyIdentityOptions {
  appId: string;
  appSecret: string;
  /**
   * Verification key from the Privy dashboard.
   *
   * @remarks Optional. Supplying it lets the SDK verify signatures locally
   * instead of fetching the JWKS on first use, which removes a network hop
   * from the authentication path.
   */
  verificationKey?: string | undefined;
}

/** Reads the first verified email address off a Privy user record. */
function emailOf(user: { email?: { address?: string } | null }): string | null {
  const address = user.email?.address;
  return typeof address === 'string' && address !== '' ? address : null;
}

/** Identity verifier backed by Privy access tokens. */
export class PrivyIdentityVerifier implements IdentityVerifier {
  public readonly name = 'privy';
  readonly #privy: PrivyClient;
  readonly #verificationKey: string | undefined;

  /**
   * @param options - Privy application credentials.
   */
  public constructor(options: PrivyIdentityOptions) {
    this.#privy = new PrivyClient(options.appId, options.appSecret);
    this.#verificationKey = options.verificationKey;
  }

  /**
   * Verifies a Privy access token.
   *
   * @param token - The JWT the browser received from Privy.
   * @returns The Privy user id as the subject. Email is resolved separately by
   *   {@link PrivyIdentityVerifier.profile}, because the token does not carry it.
   * @throws {PurseError} `UNAUTHORIZED` for any token Privy will not vouch for.
   */
  public async verify(token: string): Promise<VerifiedIdentity> {
    try {
      const claims = await this.#privy.verifyAuthToken(token, this.#verificationKey);
      return { subject: claims.userId, email: null };
    } catch (cause) {
      throw new PurseError('UNAUTHORIZED', 'The session token is not valid.', {}, cause);
    }
  }

  /**
   * Fetches the profile behind a verified subject.
   *
   * @param subject - Privy user id.
   * @param profileToken - Privy identity token from the browser. It carries
   *   the user record itself, so resolving it costs no rate-limited lookup.
   * @returns The identity with an email attached, or `null` when no identity
   *   token was supplied or Privy rejects it. A failure here is not an
   *   authentication failure — it degrades to a missing display name.
   */
  public async profile(subject: string, profileToken?: string): Promise<VerifiedIdentity | null> {
    if (profileToken === undefined || profileToken === '') return null;
    try {
      const user = await this.#privy.getUser({ idToken: profileToken });
      // The identity token arrives on the same request as the access token but
      // is a separate credential. Refuse a mismatch rather than attaching one
      // person's email to another person's organization.
      if (user.id !== subject) return null;
      return { subject, email: emailOf(user) };
    } catch {
      return null;
    }
  }
}
