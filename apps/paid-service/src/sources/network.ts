/**
 * Ethereum fee conditions, read from a public node.
 *
 * What a wallet or a relayer checks before it builds a transaction. Getting it
 * wrong means either a stuck transaction or an overpaid one, which is why fee
 * oracles are a product people pay for rather than a thing they self-host.
 */

import { rpc, type DataSource } from './types.js';

/** Public Ethereum JSON-RPC endpoint. No key, no account. */
const RPC_URL = 'https://ethereum-rpc.publicnode.com';

/** Latest block header, in the fields this resource reports. */
interface BlockHeader {
  number: string;
  baseFeePerGas?: string;
  gasUsed: string;
  gasLimit: string;
  timestamp: string;
}

/** The fee payload. */
export interface NetworkGas {
  chain: 'ethereum';
  blockNumber: number;
  gasPriceGwei: number;
  baseFeeGwei: number | null;
  /** Share of the block's gas limit that was used, in `0..1`. */
  blockUtilisation: number;
  blockTimestamp: string;
}

/** Converts a hex quantity to a number. Throws rather than returning `NaN`. */
function toNumber(hex: string): number {
  const value = Number(BigInt(hex));
  if (!Number.isFinite(value)) throw new Error(`Cannot read quantity ${hex}.`);
  return value;
}

/** Converts a wei hex quantity to gwei, to three decimal places. */
function toGwei(hex: string): number {
  return Math.round((toNumber(hex) / 1e9) * 1000) / 1000;
}

/** Live Ethereum gas price and block utilisation. */
export const networkGas: DataSource<NetworkGas> = {
  id: 'network-gas',
  path: '/v1/network/gas',
  title: 'Ethereum fee conditions',
  description: 'Current gas price, base fee, and how full the latest block is.',
  useCase: 'Estimating a fee before submitting a transaction, or deciding to wait.',
  provider: 'publicnode.com JSON-RPC',
  price: '0.02',
  ttlMs: 20_000,
  async load(): Promise<NetworkGas> {
    const [gasPrice, block] = await Promise.all([
      rpc<string>(RPC_URL, 'eth_gasPrice'),
      rpc<BlockHeader>(RPC_URL, 'eth_getBlockByNumber', ['latest', false]),
    ]);

    const gasLimit = toNumber(block.gasLimit);
    return {
      chain: 'ethereum',
      blockNumber: toNumber(block.number),
      gasPriceGwei: toGwei(gasPrice),
      baseFeeGwei: block.baseFeePerGas === undefined ? null : toGwei(block.baseFeePerGas),
      blockUtilisation:
        gasLimit === 0 ? 0 : Math.round((toNumber(block.gasUsed) / gasLimit) * 1000) / 1000,
      blockTimestamp: new Date(toNumber(block.timestamp) * 1000).toISOString(),
    };
  },
};
