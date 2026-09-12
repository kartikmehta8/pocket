/**
 * Chrome for every documentation page: the sidebar tree, the top bar and the
 * table of contents.
 */

import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { SidebarAuthor } from '@/components/author';
import { SidebarFaucets } from '@/components/faucets';
import { SidebarItem } from '@/components/sidebar-item';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

/**
 * Chrome for every documentation page: sidebar tree, top bar, table of contents.
 *
 * @param children The active page.
 * @remarks The sidebar does not collapse. It is nine inches of navigation on a
 * site with a dozen pages, and a control for hiding it buys width nothing on
 * this page needs.
 *
 * Its links are rendered by {@link SidebarItem} rather than by the library's
 * own, so the active marker slides between them the way the product's rail
 * does instead of appearing in place.
 *
 * The footer carries who built this and where the testnet money comes from.
 * Both are questions that arrive part way through something else, which is why
 * neither is a page.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{
        collapsible: false,
        components: { Item: SidebarItem },
        footer: (
          <>
            <SidebarAuthor />
            <SidebarFaucets />
          </>
        ),
      }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
