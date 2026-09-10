import { getHealth } from '@/lib/api';
import { AdapterPanel, type AdapterSlot } from './adapter-panel';

/**
 * The five ports, and what the thing plugged into each one is responsible for.
 *
 * One line each, ordered by how much a reader cares if it is wrong: custody
 * first, then settlement, then everything that only shapes what is displayed.
 * Nothing here explains the fallbacks — a reader looking at a live system does
 * not need to hear about the offline one.
 */
const SLOTS = [
  {
    key: 'wallet',
    label: 'Wallet',
    role: 'Custodies every agent wallet and signs its payments. No private key reaches Pocket.',
  },
  { key: 'chain', label: 'Chain', role: 'Where payments settle and receipts are confirmed.' },
  { key: 'analytics', label: 'Analytics', role: 'Indexes spend history behind the charts.' },
  {
    key: 'market',
    label: 'Market data',
    role: 'Live token prices, so a policy can cap spend in dollars.',
  },
  { key: 'identity', label: 'Identity', role: 'Verifies who signs in to this dashboard.' },
] as const;

/**
 * Sidebar footer: which provider is serving each adapter, and whether it is live.
 *
 * @param id Stable identifier for the disclosure, unique on the page.
 *
 * Fetches on the server and hands the result to a client disclosure, so the
 * health call stays out of the browser bundle while the panel can still open
 * and close. An unreachable API renders as `Unknown` rather than throwing —
 * the rail must not take the page down with it.
 */
export async function AdapterHealth({ id }: { id: string }) {
  const result = await getHealth();
  const adapters = result.ok ? result.data.adapters : null;

  const slots: AdapterSlot[] = SLOTS.map(({ key, label, role }) => ({
    key,
    label,
    role,
    mode: adapters?.[key],
  }));

  return <AdapterPanel slots={slots} id={id} />;
}
