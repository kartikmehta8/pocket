'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ReactNode } from 'react';

/** Privy's hosted login, themed to match the Pocket palette. */
const PRIVY_APPEARANCE = {
  theme: 'light' as const,
  accentColor: '#2a78d6' as const,
  logo: undefined,
  walletChainType: 'ethereum-only' as const,
  showWalletLoginFirst: false,
};

/**
 * Client providers shared by every route.
 *
 * @param appId Privy application id, or an empty string when none is
 *   configured. Without it the tree renders unchanged, so the dashboard still
 *   works in the single-tenant local setup that authenticates with an API key.
 * @param children The application.
 */
export function Providers({ appId, children }: { appId: string; children: ReactNode }) {
  const tree = <TooltipProvider delayDuration={180}>{children}</TooltipProvider>;

  if (appId === '') return tree;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: PRIVY_APPEARANCE,
        // Operators sign in as people. Wallets belong to their agents and are
        // created server-side, so no wallet is provisioned for the human here.
        loginMethods: ['email', 'google', 'github', 'wallet'],
        embeddedWallets: { ethereum: { createOnLogin: 'off' } },
      }}
    >
      {tree}
    </PrivyProvider>
  );
}
