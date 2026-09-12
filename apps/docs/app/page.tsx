/**
 * The root route. The docs site has no landing page of its own; the product
 * site is the landing page.
 */

import { redirect } from 'next/navigation';

/** The docs site has no separate landing page; the product site is the landing page. */
export default function Home() {
  redirect('/docs');
}
