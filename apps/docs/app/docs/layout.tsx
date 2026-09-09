import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

/**
 * Chrome for every documentation page: sidebar tree, top bar, table of contents.
 *
 * @param children The active page.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
