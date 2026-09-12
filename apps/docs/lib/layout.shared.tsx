import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { POWERED_BY, appUrl } from '@/lib/brand';

/**
 * Chrome shared by every layout in the docs site.
 *
 * @returns Navigation options for the Fumadocs layouts.
 * @remarks The wordmark is the product's own — the name set tight, a single
 * accent dot, and no glyph — with the line the dashboard's rail carries
 * underneath it. Someone arriving here from the app should recognise the
 * furniture before they read a word.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex flex-col gap-0.5">
          <span className="text-fd-foreground inline-flex items-baseline text-[0.9375rem] font-bold tracking-[-0.03em]">
            Pocket
            <span aria-hidden className="bg-fd-primary ml-[3px] size-1 self-end rounded-full" />
            <span className="text-fd-muted-foreground ml-2 text-sm font-medium">Docs</span>
          </span>
          <span className="text-fd-muted-foreground flex items-center gap-1.5 text-xs leading-snug">
            <span aria-hidden className="bg-fd-primary/60 size-1 rounded-full" />
            {POWERED_BY}
          </span>
        </span>
      ),
      url: '/docs',
    },
    links: [
      {
        text: 'Open the app',
        url: appUrl(),
        external: true,
      },
    ],
    // The product is light only. A docs site that could go dark would not be
    // the same product, so the control is removed rather than hidden.
    themeSwitch: { enabled: false },
  };
}
