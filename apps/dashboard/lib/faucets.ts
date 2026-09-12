/**
 * Where testnet funds come from.
 *
 * Two public faucets, run by other people, handing out the two things an agent
 * wallet can need. Kept as data because four surfaces link to them and a URL
 * pasted into four files is a URL that will only be corrected in three.
 */

/** What an agent wallet can run out of. */
export type FaucetAsset = 'USDC' | 'HBAR';

/** One public faucet. */
export interface Faucet {
  /** What it hands out. */
  asset: FaucetAsset;
  /** Who runs it. */
  name: string;
  href: string;
  /** The mark, under `public/logos`. */
  logo: string;
  /** What the asset is for, in one line. */
  purpose: string;
  /**
   * The trap worth naming before someone hits it.
   *
   * @remarks Circle asks for a Hedera `0.0.x` id rather than an address and
   * reports success either way, so an operator who pastes the wrong one is
   * left watching for money that is not coming.
   */
  caveat?: string;
}

/** Both faucets, USDC first: it is the one an agent actually spends. */
export const FAUCETS: readonly Faucet[] = [
  {
    asset: 'USDC',
    name: 'Circle',
    href: 'https://faucet.circle.com',
    logo: '/logos/usdc.svg',
    purpose: 'What agents spend.',
    caveat: 'Choose Hedera Testnet and paste the 0.0.x account id, not the address.',
  },
  {
    asset: 'HBAR',
    name: 'Hedera',
    href: 'https://portal.hedera.com/faucet',
    logo: '/logos/hedera.svg',
    purpose: 'Brings the account into existence and pays transaction fees.',
    caveat: 'Agents never spend HBAR: the x402 facilitator pays for every purchase.',
  },
];

/**
 * One faucet by what it hands out.
 *
 * @param asset The asset needed.
 * @returns That faucet.
 * @throws {Error} Never in practice — the list covers every `FaucetAsset`, and
 *   the throw exists so adding an asset without a faucet fails loudly rather
 *   than rendering a button that goes nowhere.
 */
export function faucetFor(asset: FaucetAsset): Faucet {
  const faucet = FAUCETS.find((entry) => entry.asset === asset);
  if (faucet === undefined) throw new Error(`No faucet is configured for ${asset}.`);
  return faucet;
}
