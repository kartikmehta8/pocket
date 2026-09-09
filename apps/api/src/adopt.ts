/**
 * Attach a signed-in account to an existing organization.
 *
 * Signing in for the first time creates a fresh tenant, which is right for a
 * new customer and wrong for an operator who already has one — the demo data,
 * the funded agents and the settled payments all live under the old
 * organization. This moves the user row across so they see it.
 *
 * Usage: `pnpm --filter @pocket/api adopt -- <email> <orgId>`
 */

import { closeDb, getDb, findOrganizationById, moveUserToOrganization } from '@pocket/db';
import { loadConfig } from './config.js';

/**
 * Reassigns a user to another organization.
 *
 * @throws {Error} When the arguments are missing, the organization does not
 *   exist, or no user matches the email. Every failure is loud: a silent
 *   no-op here would look like a permissions bug later.
 */
async function adopt(): Promise<void> {
  const [email, orgId] = process.argv.slice(2);
  if (email === undefined || orgId === undefined) {
    throw new Error('Usage: pnpm --filter @pocket/api adopt -- <email> <orgId>');
  }

  const config = loadConfig();
  const db = getDb(config.DATABASE_URL);

  const org = await findOrganizationById(db, orgId);
  if (org === null) throw new Error(`No organization with id ${orgId}.`);

  const user = await moveUserToOrganization(db, email, orgId);
  if (user === null) throw new Error(`No signed-in user with email ${email}. Sign in first.`);

  process.stdout.write(`${email} now belongs to ${org.name} (${org.id}).\n`);
  await closeDb();
}

adopt().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
