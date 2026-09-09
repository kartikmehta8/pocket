/**
 * Anomaly detection and ledger/chain reconciliation.
 *
 * Every rule here is coarse and explainable on purpose. A spending control
 * that cannot state why it fired gives an operator nothing to act on, so
 * thresholds are simple multiples rather than a fitted model.
 */

import { decimalsOf, formatAmount, type AnalyticsProvider, type AssetId } from '@pocket/core';

/** One flagged deviation from an agent's normal behaviour. */
export interface Anomaly {
  type: 'spend_spike' | 'new_recipient_concentration' | 'ledger_chain_mismatch';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Flags deviations that a human should look at.
 *
 * @param current - Current window total in base units.
 * @param previous - Previous window total in base units.
 * @param byRecipient - Recipient totals for the current window.
 * @param asset - Asset for formatting messages.
 * @returns Zero or more anomalies.
 * @remarks Thresholds are deliberately coarse and explainable. A model that
 * cannot say why it fired is not useful for a spending control.
 */
export function detectAnomalies(
  current: bigint,
  previous: bigint,
  byRecipient: Array<{ address: string; amount: bigint; count: number }>,
  asset: AssetId,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (previous > 0n && current > previous * 2n) {
    const multiple = (Number(current) / Number(previous)).toFixed(1);
    anomalies.push({
      type: 'spend_spike',
      severity: current > previous * 5n ? 'high' : 'medium',
      description: `Spending is ${multiple}x the previous period.`,
    });
  }

  const total = byRecipient.reduce((sum, row) => sum + row.amount, 0n);
  const top = byRecipient[0];
  if (top !== undefined && total > 0n && top.amount * 10n > total * 8n && byRecipient.length > 1) {
    anomalies.push({
      type: 'new_recipient_concentration',
      severity: 'low',
      description: `${formatAmount(top.amount, decimalsOf(asset))} ${asset}, over 80% of spend, went to a single recipient.`,
    });
  }

  return anomalies;
}

/**
 * Compares the ledger against on-chain reality.
 *
 * @param deps - Analytics provider.
 * @param address - Agent wallet address to inspect.
 * @param from - Window start.
 * @param to - Window end.
 * @param ledgerTotal - What Pocket believes it authorized, in base units.
 * @param asset - Asset to compare.
 * @returns A mismatch anomaly, or `null` when the two agree or the index is
 *   unreachable. An unreachable index is reported as no anomaly rather than a
 *   false one.
 */
export async function reconcile(
  deps: { analytics: AnalyticsProvider },
  address: string,
  from: Date,
  to: Date,
  ledgerTotal: bigint,
  asset: AssetId,
): Promise<Anomaly | null> {
  try {
    const transfers = await deps.analytics.getTransfers({ address, since: from, until: to });
    const outbound = transfers
      .filter((transfer) => transfer.from === address.toLowerCase() && transfer.asset === asset)
      .reduce((sum, transfer) => sum + transfer.amount, 0n);
    if (outbound === ledgerTotal) return null;
    const difference = outbound > ledgerTotal ? outbound - ledgerTotal : ledgerTotal - outbound;
    return {
      type: 'ledger_chain_mismatch',
      severity: outbound > ledgerTotal ? 'high' : 'low',
      description: `On-chain outflow differs from the Pocket ledger by ${formatAmount(difference, decimalsOf(asset))} ${asset}.`,
    };
  } catch {
    return null;
  }
}
