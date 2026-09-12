import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

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
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{
        collapsible: false,
        components: { Item: SidebarItem },
        footer: <SidebarFaucets />,
      }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
