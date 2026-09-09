import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/** Where the product itself lives, so every page can point back to it. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Chrome shared by every layout in the docs site.
 *
 * @returns Navigation options for the Fumadocs layouts.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="text-fd-foreground inline-flex items-baseline text-[0.9375rem] font-bold tracking-[-0.03em]">
          Pocket
          <span aria-hidden className="bg-fd-primary ml-[3px] size-1 self-end rounded-full" />
          <span className="text-fd-muted-foreground ml-2 text-sm font-medium">Docs</span>
        </span>
      ),
      url: '/docs',
    },
    links: [
      {
        text: 'Open the app',
        url: APP_URL,
        external: true,
      },
    ],
    // The product is light only. A docs site that could go dark would not be
    // the same product, so the control is removed rather than hidden.
    themeSwitch: { enabled: false },
  };
}
