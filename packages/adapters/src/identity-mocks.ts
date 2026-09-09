/**
 * Offline identity verification.
 *
 * Used when no identity provider is configured, so the dashboard can be run
 * and demonstrated without an internet connection. It accepts any token and
 * treats it as the subject itself, which is why it exists behind the same
 * credentials check as every other mock: an operator who has configured Privy
 * never reaches this code.
 */

import { PurseError, type IdentityVerifier, type VerifiedIdentity } from '@purse/core';

/**
 * Identity verifier that trusts the caller.
 *
 * @remarks Never selected when `PRIVY_APP_ID` and `PRIVY_APP_SECRET` are set.
 * The health endpoint reports it as not live, so a dashboard running against
 * it cannot claim otherwise.
 */
export class OpenIdentityVerifier implements IdentityVerifier {
  public readonly name = 'offline';

  /**
   * Treats the token as the subject.
   *
   * @param token - Any non-empty string.
   * @returns An identity whose subject is the token.
   * @throws {PurseError} `UNAUTHORIZED` when the token is empty.
   */
  public verify(token: string): Promise<VerifiedIdentity> {
    const subject = token.trim();
    if (subject === '') {
      throw new PurseError('UNAUTHORIZED', 'The session token is not valid.');
    }
    return Promise.resolve({ subject: `offline:${subject}`, email: null });
  }

  /**
   * Reports no profile detail.
   *
   * @param subject - Subject identifier.
   * @returns The subject with no email, since there is no provider to ask.
   */
  public profile(subject: string): Promise<VerifiedIdentity | null> {
    return Promise.resolve({ subject, email: null });
  }
}
