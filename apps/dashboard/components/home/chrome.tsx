import Link from 'next/link';

import { DESCRIPTION } from '@/lib/brand';
import { homeCta } from '@/lib/home-cta';
import { Wordmark } from '@/components/layout/wordmark';
import { ScrollLink } from './scroll-link';

/**
 * Footer: the wordmark, one line about the product, and the way in.
 *
 * @param signedIn Whether the visitor already has a session.
 */
export function MarketingFooter({ signedIn }: { signedIn: boolean }) {
  const cta = homeCta(signedIn);
  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-end justify-between gap-6 px-5 py-10 sm:px-8">
        <div>
          <Wordmark href="/" />
          <p className="text-text-muted mt-2 max-w-xs text-xs leading-relaxed">{DESCRIPTION}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <ScrollLink targetId="create" className="text-text-secondary hover:text-text">
            How it works
          </ScrollLink>
          <ScrollLink targetId="preview" className="text-text-secondary hover:text-text">
            What you see
          </ScrollLink>
          <a
            href={process.env.NEXT_PUBLIC_DOCS_URL ?? 'http://localhost:3001/docs'}
            target="_blank"
            rel="noreferrer noopener"
            className="text-text-secondary hover:text-text"
          >
            Documentation
          </a>
          <Link href={cta.href} className="text-text-secondary hover:text-text">
            {signedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </div>
    </footer>
  );
}
