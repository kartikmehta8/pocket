/**
 * Chrome for every signed-in route: the navigation rail, the top bar, and the
 * session sync that keeps the server-side cookie fresh.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { PageTransition } from '@/components/ui/page-transition';

/**
 * Every route in this group needs a session, so none of them belongs in a
 * search index. Titles and descriptions still matter: a link pasted into a
 * team's chat renders a card from them.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Chrome for every signed-in route: a persistent rail, a sticky top bar, and a
 * measured content column.
 *
 * The sign-in screen lives in a different group and gets none of this, so it
 * never renders navigation for an organization the visitor has not joined yet.
 *
 * @param children The active page.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-[76rem]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
