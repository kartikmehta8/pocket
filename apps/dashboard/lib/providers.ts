/** A data provider's name and, when Pocket has one, its mark under `public/`. */
export interface ProviderMark {
  name: string;
  logo: string | null;
}

/**
 * The upstreams the example seller reads from, matched by how the seller
 * names them. Logos are the vendors' own marks, used to say where data comes
 * from. None of these projects has reviewed or endorsed Pocket.
 */
const KNOWN: ReadonlyArray<{ match: RegExp; mark: ProviderMark }> = [
  { match: /coingecko/i, mark: { name: 'CoinGecko', logo: '/logos/coingecko.png' } },
  { match: /publicnode/i, mark: { name: 'PublicNode', logo: '/logos/publicnode.png' } },
  { match: /defillama/i, mark: { name: 'DefiLlama', logo: '/logos/defillama.jpg' } },
];

/**
 * Resolves the seller's free-text provider line to the vendors it names.
 *
 * @param provider The provider string as the catalog advertises it, for
 *   example `"CoinGecko"` or `"Composed from CoinGecko, publicnode and DefiLlama"`.
 * @returns One mark per vendor named, in the order the seller names them. A
 *   provider Pocket does not know comes back as its own text with no logo, so
 *   an unfamiliar seller still says where its data is from.
 */
export function providerMarks(provider: string): ProviderMark[] {
  const found = KNOWN.map((entry) => ({ entry, at: provider.search(entry.match) }))
    .filter(({ at }) => at !== -1)
    .sort((a, b) => a.at - b.at)
    .map(({ entry }) => entry.mark);
  return found.length === 0 ? [{ name: provider, logo: null }] : found;
}
