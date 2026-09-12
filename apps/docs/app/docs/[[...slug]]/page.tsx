/**
 * One documentation page, and the metadata a crawler and a chat client read
 * off it.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';

import { getMDXComponents } from '@/components/mdx';
import { DOCS_NAME, SITE_NAME } from '@/lib/brand';
import { source } from '@/lib/source';

/** Route parameters for a documentation page. */
interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

/**
 * Renders one documentation page.
 *
 * @param props Route parameters carrying the page slug.
 */
export default async function Page(props: DocsPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

/** Prerenders every page in the tree. */
export function generateStaticParams() {
  return source.generateParams();
}

/**
 * Per-page metadata.
 *
 * @param props Route parameters carrying the page slug.
 * @returns Title, description, canonical address and the social card fields.
 * @remarks The card's image comes from `/og/…`, a route prerendered at build
 * time that draws this page's own title. The file convention that would
 * normally do this cannot be used: `opengraph-image` is a route segment, and
 * Next refuses one after the optional catch-all this route is.
 *
 * `/docs/using/budgets` is drawn by `/og/using/budgets`, and `/docs` by `/og`.
 * The canonical address is relative because `metadataBase` on the root layout
 * resolves it.
 */
export async function generateMetadata(props: DocsPageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const { title, description } = page.data;
  const image = {
    url: page.url.replace(/^\/docs/, '/og'),
    width: 1200,
    height: 630,
    alt: `${title} — ${SITE_NAME} documentation`,
  };

  return {
    title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      type: 'article',
      siteName: DOCS_NAME,
      title,
      description,
      url: page.url,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
