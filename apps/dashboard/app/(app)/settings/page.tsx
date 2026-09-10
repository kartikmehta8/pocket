import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';

import { getOrg, listApiKeys } from '@/lib/api';
import { serviceUrls } from '@/lib/urls';
import { ApiKeyRow } from '@/components/settings/api-key-row';
import { OrgForm } from '@/components/settings/org-form';
import { ApiKeyMinter } from '@/components/setup/api-key-minter';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineCode } from '@/components/ui/inline-code';
import { PageHeader } from '@/components/ui/page-header';

/** Tab title for settings. */
export const metadata: Metadata = { title: 'Settings' };

/** Credentials are live; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Settings: the organization name, its credentials, and where agents connect.
 *
 * @remarks Held to a reading measure rather than the full content column. These
 * are short forms and two addresses, and stretched across a wide screen a
 * single-line input reads as a mistake. Adapter wiring is not repeated here;
 * it lives in the sidebar, on every page.
 */
export default async function SettingsPage() {
  const [accountResult, keysResult] = await Promise.all([getOrg(), listApiKeys()]);

  if (!accountResult.ok) {
    return (
      <div className="gap-section flex w-full max-w-3xl flex-col">
        <PageHeader title="Settings" />
        <ApiErrorState
          subject="your settings"
          code={accountResult.code}
          message={accountResult.message}
        />
      </div>
    );
  }

  const { org, user, principal } = accountResult.data;
  const machine = principal === 'api-key';
  const keys = keysResult.ok ? keysResult.data.keys : [];
  const liveKeys = keys.filter((key) => key.revokedAt === null).length;
  const urls = serviceUrls();

  return (
    <div className="gap-section flex w-full max-w-5xl flex-col">
      <PageHeader
        title="Settings"
        description="Rename your organization, manage the keys your agents authenticate with, and copy the addresses they connect to."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>
                  {user?.email
                    ? `Signed in as ${user.email}`
                    : machine
                      ? 'Authenticated with an API key'
                      : 'Signed in'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <OrgForm name={org.name} disabled={machine} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>API keys</CardTitle>
                <CardDescription>
                  Presented by your MCP server and any agent runtime that calls Pocket directly.
                </CardDescription>
              </div>
            </CardHeader>

            {keysResult.ok ? (
              <>
                {keys.length === 0 ? (
                  <CardContent>
                    <EmptyState
                      icon={KeyRound}
                      title="No keys yet"
                      description="Create one so your MCP server can authenticate."
                    />
                  </CardContent>
                ) : (
                  <ul className="border-divider border-t">
                    {keys.map((key) => (
                      <ApiKeyRow key={key.id} apiKey={key} canRevoke={liveKeys > 1} />
                    ))}
                  </ul>
                )}
                <CardContent className="border-divider border-t pt-4">
                  <ApiKeyMinter existing={liveKeys} />
                </CardContent>
              </>
            ) : (
              <CardContent>
                <p className="text-text-secondary text-sm leading-relaxed">
                  This dashboard is authenticated with <InlineCode>POCKET_API_KEY</InlineCode>{' '}
                  rather than a signed-in account, so it cannot manage credentials. Remove that
                  variable and sign in to use key management.
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Reference, not a form: parked in the column the forms do not need. */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <div>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>Where your agent runtime connects.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CodeBlock code={urls.mcp} label="MCP endpoint" caption="MCP server" />
            <CodeBlock code={urls.api} label="API base URL" caption="Pocket API" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
