import { createFromSource } from 'fumadocs-core/search/server';

import { source } from '@/lib/source';

/**
 * The search index, served to the sidebar's search dialog.
 *
 * @remarks Built from the same loader the navigation tree comes from, so a
 * page cannot exist in one and not the other. The index is small enough — a
 * dozen pages — that it is built in memory on the server rather than pushed
 * to a hosted search service nobody here needs to operate.
 */
export const { GET } = createFromSource(source);
