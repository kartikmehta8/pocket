import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { SidebarFaucets } from '@/components/faucets';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

/**
 * Chrome for every documentation page: sidebar tree, top bar, table of contents.
 *
 * @param children The active page.
 * @remarks The sidebar does not collapse. It is nine inches of navigation on a
 * site with a dozen pages, and a control for hiding it buys width nothing on
 * this page needs.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{ collapsible: false, footer: <SidebarFaucets /> }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
