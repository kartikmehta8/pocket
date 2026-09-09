import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';

import { getMDXComponents } from '@/components/mdx';
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
 */
export async function generateMetadata(props: DocsPageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return { title: page.data.title, description: page.data.description };
}
