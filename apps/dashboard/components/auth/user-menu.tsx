'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { usePrivy } from '@privy-io/react-auth';
import { ChevronsUpDown, LoaderCircle, LogOut, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/cn';

const ITEM = cn(
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
  'text-text-secondary outline-none transition-colors duration-(--duration-fast)',
  'data-highlighted:bg-ash-50 data-highlighted:text-text',
);

/**
 * Account menu in the top bar: who is signed in, and the way out.
 *
 * @param orgName Organization display name.
 * @param email Signed-in address, or `null` when the identity provider gave none.
 */
export function UserMenu({ orgName, email }: { orgName: string; email: string | null }) {
  const { logout } = usePrivy();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    // Clear the server cookie first. If the Privy call then fails, the session
    // is already dead server-side, which is the safer order to fail in.
    await fetch('/api/session', { method: 'DELETE' }).catch(() => null);
    await logout().catch(() => null);
    router.replace('/login');
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'hover:bg-ash-100 data-[state=open]:bg-ash-100',
        )}
      >
        <span className="text-text min-w-0 truncate text-sm font-medium">{orgName}</span>
        <ChevronsUpDown aria-hidden className="text-ash-400 size-3.5 shrink-0" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="border-border bg-surface shadow-e3 overlay-pop z-50 w-52 rounded-lg border p-1.5"
        >
          {/* The trigger already names the organization, so this only adds the
              thing it cannot fit: which person is signed in. */}
          {email === null ? null : (
            <>
              <p className="text-text-muted truncate px-2 py-1.5 text-xs">{email}</p>
              <DropdownMenu.Separator className="bg-divider my-1 h-px" />
            </>
          )}
          <DropdownMenu.Item asChild>
            <Link href="/setup" className={ITEM}>
              <Sparkles aria-hidden className="size-4" strokeWidth={1.75} />
              Connect an agent
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings" className={ITEM}>
              <Settings aria-hidden className="size-4" strokeWidth={1.75} />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="bg-divider my-1.5 h-px" />
          <DropdownMenu.Item
            className={cn(ITEM, 'data-highlighted:bg-danger-soft data-highlighted:text-danger-ink')}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            {signingOut ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
            )}
            {signingOut ? 'Signing out' : 'Sign out'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
