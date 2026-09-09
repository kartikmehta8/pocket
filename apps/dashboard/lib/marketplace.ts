import 'server-only';

/** One purchasable feed, as the seller advertises it before payment. */
export interface CatalogResource {
  path: string;
  title: string;
  description: string;
  /** What a developer would realistically use this for. */
  useCase: string;
  /** Which upstream the data actually comes from. */
  provider: string;
  /** Price as a decimal string. */
  price: string;
  asset: string;
  assetSymbol: string;
  /** How often the seller refreshes it. */
  refreshSeconds: number;
  /** When the seller last fetched it, or `null` if never. */
  asOf: string | null;
  /** True when the seller is serving its last good snapshot. */
  stale: boolean;
  /** Absolute URL to buy, built from the configured seller base. */
  url: string;
}

/** What the seller is offering right now. */
export interface Catalog {
  /** The seller's base URL, or `null` when none is configured. */
  baseUrl: string | null;
  resources: CatalogResource[];
  /** Why the catalog is empty, when it is. */
  error: string | null;
}

/** The example seller's base URL, without a trailing slash. */
function sellerBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_PAID_SERVICE_URL ?? '';
  return raw === '' ? null : raw.replace(/\/+$/, '');
}

/**
 * Reads the seller's public catalog.
 *
 * @returns The offered resources, or an explanation of why there are none.
 * @remarks Prices here are quoted by the seller, not by Purse. They are shown
 * before a purchase so a person sees the same number the policy engine will,
 * and the request is never cached: a stale price on this page would be a
 * quote Purse cannot honour.
 */
export async function getCatalog(): Promise<Catalog> {
  const baseUrl = sellerBaseUrl();
  if (baseUrl === null) {
    return {
      baseUrl: null,
      resources: [],
      error: 'No seller is configured. Set NEXT_PUBLIC_PAID_SERVICE_URL to browse a catalog.',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/catalog`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { baseUrl, resources: [], error: `The seller answered ${response.status}.` };
    }
    const body = (await response.json()) as { resources?: Omit<CatalogResource, 'url'>[] };
    const resources = (body.resources ?? []).map((resource) => ({
      ...resource,
      url: `${baseUrl}${resource.path}`,
    }));
    return { baseUrl, resources, error: null };
  } catch {
    return { baseUrl, resources: [], error: 'The seller is unreachable.' };
  }
}
