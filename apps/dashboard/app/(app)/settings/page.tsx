import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';

import { getHealth, getOrg, listApiKeys } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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

export const metadata: Metadata = { title: 'Settings' };

/** Credentials and adapter state are live; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * Settings: the organization, its credentials, and which vendors are actually
 * wired up.
 */
export default async function SettingsPage() {
  const [accountResult, keysResult, healthResult] = await Promise.all([
    getOrg(),
    listApiKeys(),
    getHealth(),
  ]);

  if (!accountResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Account" title="Settings" />
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
        eyebrow="Account"
        title="Settings"
        description={`Created ${formatDateTime(org.createdAt)} · ${org.members} ${
          org.members === 1 ? 'member' : 'members'
        }`}
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              {user?.email ?? (machine ? 'Authenticated with an API key' : 'Signed in')}
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
              Presented by the MCP server and any agent runtime that calls Purse directly.
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
              This dashboard is authenticated with <InlineCode>PURSE_API_KEY</InlineCode> rather
              than a signed-in account, so it cannot manage credentials. Remove that variable and
              sign in to use key management.
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>What to point an agent runtime and a browser at.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CodeBlock code={urls.mcp} label="MCP endpoint" caption="MCP server" />
          <CodeBlock code={urls.api} label="API base URL" caption="Purse API" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Adapters</CardTitle>
            <CardDescription>
              Live means a real vendor. Anything else is a deterministic fallback, stated rather
              than inferred.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {healthResult.ok ? (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(healthResult.data.adapters).map(([slot, mode]) => (
                <div key={slot} className="border-border flex justify-between border-b py-1.5">
                  <dt className="text-text-secondary text-sm capitalize">{slot}</dt>
                  <dd className="text-text figures text-sm font-medium">
                    {mode.provider}
                    <span className="text-text-muted"> · {mode.live ? 'live' : 'fallback'}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-text-secondary text-sm">
              The API is unreachable, so adapter state is unknown.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
