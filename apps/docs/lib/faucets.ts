/**
 * Where testnet funds come from.
 *
 * @remarks Mirrors `apps/dashboard/lib/faucets.ts`, which links to the same
 * two places from four surfaces inside the product. A reader who meets the
 * faucets in the documentation and then again in the dashboard should be sent
 * to the same address by both.
 */

/** One public faucet. */
export interface Faucet {
  /** What it hands out. */
  asset: 'USDC' | 'HBAR';
  /** Who runs it. */
  name: string;
  href: string;
  /** The mark, under `public/logos`. */
  logo: string;
  /** What the asset is for, in one line. */
  purpose: string;
}

/** Both faucets, USDC first: it is the one an agent actually spends. */
export const FAUCETS: readonly Faucet[] = [
  {
    asset: 'USDC',
    name: 'Circle',
    href: 'https://faucet.circle.com',
    logo: '/logos/usdc.svg',
    purpose: 'What agents spend.',
  },
  {
    asset: 'HBAR',
    name: 'Hedera',
    href: 'https://portal.hedera.com/faucet',
    logo: '/logos/hedera.svg',
    purpose: 'Pays the gas fees.',
  },
];
