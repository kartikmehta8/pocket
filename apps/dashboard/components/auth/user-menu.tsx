'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { usePrivy } from '@privy-io/react-auth';
import { ChevronsUpDown, LogOut, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/cn';

/** Two-letter monogram for the avatar chip. */
function initials(label: string): string {
  const trimmed = label.trim();
  if (trimmed === '') return '??';
  return trimmed.slice(0, 2).toUpperCase();
}

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

  const label = email ?? orgName;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'group flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 text-left',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'hover:bg-ash-100 data-[state=open]:bg-ash-100',
        )}
      >
        <span
          aria-hidden
          className="border-border bg-primary text-2xs flex size-7 items-center justify-center rounded-md border font-bold text-white"
        >
          {initials(label)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="text-text block truncate text-sm font-medium">{orgName}</span>
          {email === null ? null : (
            <span className="text-text-muted text-2xs block truncate">{email}</span>
          )}
        </span>
        <ChevronsUpDown aria-hidden className="text-ash-400 size-3.5 shrink-0" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="border-border bg-surface shadow-e3 overlay-pop z-50 w-60 rounded-lg border p-1.5"
        >
          <div className="px-2 py-1.5">
            <p className="text-text truncate text-sm font-medium">{orgName}</p>
            <p className="text-text-muted truncate text-xs">{email ?? 'Signed in'}</p>
          </div>
          <DropdownMenu.Separator className="bg-divider my-1.5 h-px" />
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
            <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
