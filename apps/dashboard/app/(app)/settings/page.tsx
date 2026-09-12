/**
 * Settings: the organization, the API keys agents authenticate with, and the
 * addresses a runtime connects to.
 */

import type { Metadata } from 'next';

import { getOrg, listApiKeys } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { serviceUrls } from '@/lib/urls';
import { ApiKeysTable } from '@/components/settings/api-keys-table';
import { OrgForm } from '@/components/settings/org-form';
import { ApiKeyMinter } from '@/components/setup/api-key-minter';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyButton } from '@/components/ui/copy-button';
import { Fact } from '@/components/ui/fact';
import { InlineCode } from '@/components/ui/inline-code';
import { PageHeader } from '@/components/ui/page-header';

/** Tab title, and the card a shared link renders. */
export const metadata: Metadata = {
  title: 'Settings',
  description:
    'Rename your organization, manage the keys your agents authenticate with, and copy the addresses they connect to.',
};

/** Credentials are live; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Settings: the organization, its credentials, and where agents connect.
 *
 * @remarks The full content column, as on every other page. The organization
 * card anchors the top: the rename form on one side, the facts about the
 * account on the other. Below it the keys sit in a table, with creating a
 * key and the endpoints parked in the column the table does not need.
 * Adapter wiring is not repeated here; it lives in the sidebar, on every page.
 */
export default async function SettingsPage() {
  const [accountResult, keysResult] = await Promise.all([getOrg(), listApiKeys()]);

  if (!accountResult.ok) {
    return (
      <>
        <PageHeader title="Settings" />
        <ApiErrorState
          subject="your settings"
          code={accountResult.code}
          message={accountResult.message}
        />
      </>
    );
  }

  const { org, user, principal } = accountResult.data;
  const machine = principal === 'api-key';
  const keys = keysResult.ok ? keysResult.data.keys : [];
  const liveKeys = keys.filter((key) => key.revokedAt === null).length;
  const urls = serviceUrls();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Rename your organization, manage the keys your agents authenticate with, and copy the addresses they connect to."
      />

      <Card pop>
        <CardContent className="grid gap-x-10 gap-y-6 pt-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-text text-md font-semibold tracking-tight">Organization</h2>
              <p className="text-text-muted mt-0.5 text-sm">
                {user?.email
                  ? `Signed in as ${user.email}`
                  : machine
                    ? 'Authenticated with an API key'
                    : 'Signed in'}
              </p>
            </div>
            <OrgForm name={org.name} disabled={machine} />
          </div>

          <dl className="divide-divider border-divider divide-y border-t pt-1 lg:border-t-0 lg:pt-0">
            <Fact label="Organization id">
              <span className="figures inline-flex items-center gap-1 font-mono text-xs">
                {org.id}
                <CopyButton value={org.id} label="organization id" />
              </span>
            </Fact>
            <Fact label="Members">{org.members}</Fact>
            <Fact label="Created">
              <time dateTime={org.createdAt}>{formatDateTime(org.createdAt)}</time>
            </Fact>
            <Fact label="Live keys">
              {keysResult.ok ? liveKeys : <span className="text-text-muted">Not visible here</span>}
            </Fact>
          </dl>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-text text-md font-semibold tracking-tight">API keys</h2>
            <p className="text-text-muted mt-0.5 text-sm">
              Presented by your MCP server and any agent runtime that calls Pocket directly.
            </p>
          </div>
          <div className="bg-surface border-border overflow-hidden rounded-lg border">
            {keysResult.ok ? (
              <ApiKeysTable keys={keys} />
            ) : (
              <p className="text-text-secondary px-5 py-4 text-sm leading-relaxed">
                This dashboard is authenticated with <InlineCode>POCKET_API_KEY</InlineCode> rather
                than a signed-in account, so it cannot manage credentials. Remove that variable and
                sign in to use key management.
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {keysResult.ok ? (
            <Card pop>
              <CardHeader>
                <div>
                  <CardTitle>Create a key</CardTitle>
                  <CardDescription>Shown once. Only a hash is kept.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ApiKeyMinter existing={liveKeys} />
              </CardContent>
            </Card>
          ) : null}

          <Card pop>
            <CardHeader>
              <div>
                <CardTitle>Endpoints</CardTitle>
                <CardDescription>Where your agent runtime connects.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Wrapped, not scrolled: this column is narrow and a production
                  URL runs past its edge, where a scrollbar hides the tail of
                  the very value the card exists to show. */}
              <CodeBlock wrap code={urls.mcp} label="MCP endpoint" caption="MCP server" />
              <CodeBlock wrap code={urls.api} label="API base URL" caption="Pocket API" />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
