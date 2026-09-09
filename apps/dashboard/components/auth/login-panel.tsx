'use client';

import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

/** What the panel is currently doing. */
type Phase = 'loading' | 'ready' | 'exchanging' | 'error';

/**
 * Sign-in control.
 *
 * Privy owns the credential collection — email codes, Google, GitHub, wallets —
 * so this component only opens that modal and then performs the handover: it
 * exchanges the resulting access token for a server session before navigating.
 * Navigating first would land on a page that renders as signed out.
 *
 * @param configured Whether a Privy application id is present. When it is not,
 *   the panel explains what to set rather than offering a button that cannot work.
 */
export function LoginPanel({ configured }: { configured: boolean }) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState('');

  const destination = params.get('next') ?? '/dashboard';

  const exchange = useCallback(async () => {
    setPhase('exchanging');
    try {
      const token = await getAccessToken();
      if (token === null) throw new Error('Privy returned no access token.');

      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, idToken: identityToken }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const detail =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error: { message?: string } }).error.message ?? '')
            : '';
        throw new Error(detail === '' ? 'The API refused the session.' : detail);
      }

      // A first sign-in provisions the organization, so send new operators
      // straight to setup instead of an overview with nothing in it.
      const created = response.status === 201;
      router.replace(created ? '/setup' : destination);
      router.refresh();
    } catch (cause) {
      setPhase('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not start a session.');
    }
  }, [getAccessToken, identityToken, router, destination]);

  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      void exchange();
      return;
    }
    setPhase('ready');
  }, [ready, authenticated, exchange]);

  if (!configured) {
    return (
      <div className="border-border bg-warning-soft rounded-lg border p-4">
        <p className="text-warning-ink text-sm font-medium">Sign-in is not configured</p>
        <p className="text-warning-ink/85 mt-1 text-xs leading-relaxed">
          Set <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> in the dashboard
          environment and restart. Until then the dashboard can only run against a single tenant
          using <code className="font-mono">PURSE_API_KEY</code>.
        </p>
      </div>
    );
  }

  const busy = phase === 'loading' || phase === 'exchanging';

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="md"
        onClick={() => login()}
        disabled={busy}
        className="h-11 w-full justify-center text-sm"
      >
        {busy ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" strokeWidth={2} />
        ) : (
          <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
        )}
        {phase === 'exchanging' ? 'Opening your workspace…' : 'Continue'}
      </Button>

      {phase === 'error' ? (
        <p role="alert" className="text-danger-ink text-xs leading-relaxed">
          {message}
        </p>
      ) : (
        <p className="text-text-muted flex items-start gap-1.5 text-xs leading-relaxed">
          <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          Email, Google, GitHub or an existing wallet. Purse never holds a private key. Agent
          wallets are custodied by Privy.
        </p>
      )}
    </div>
  );
}
