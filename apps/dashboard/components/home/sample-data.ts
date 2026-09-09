/**
 * Representative figures for the landing page preview.
 *
 * Fixed, not fetched. The homepage is public, so there is no organization whose
 * numbers could be shown, and inventing a live-looking feed would be a lie
 * about what a visitor is seeing. The preview is labelled as an example
 * everywhere it appears.
 *
 * The shape is real: these are the amounts a research agent actually racks up
 * buying per-call data feeds priced between one and seventy-five cents.
 */

/** One day of settled spend against the agent's daily ceiling. */
export interface SampleDay {
  /** Short weekday label, since the window is two weeks. */
  label: string;
  /** Settled spend that day. */
  spend: number;
  /** Payments that settled. */
  count: number;
}

/** The agent's daily ceiling, plotted as a reference line. */
export const DAILY_LIMIT = 2;

/** Fourteen days of one agent's spend. Day nine is where the ceiling bites. */
export const SAMPLE_DAYS: readonly SampleDay[] = [
  { label: 'Mon', spend: 0.42, count: 9 },
  { label: 'Tue', spend: 0.88, count: 17 },
  { label: 'Wed', spend: 1.31, count: 24 },
  { label: 'Thu', spend: 0.76, count: 14 },
  { label: 'Fri', spend: 1.94, count: 31 },
  { label: 'Sat', spend: 0.35, count: 7 },
  { label: 'Sun', spend: 0.28, count: 6 },
  { label: 'Mon', spend: 1.68, count: 28 },
  { label: 'Tue', spend: 2.0, count: 33 },
  { label: 'Wed', spend: 1.47, count: 26 },
  { label: 'Thu', spend: 0.91, count: 18 },
  { label: 'Fri', spend: 1.76, count: 29 },
  { label: 'Sat', spend: 0.39, count: 8 },
  { label: 'Sun', spend: 1.12, count: 21 },
];

/** One headline figure from the window, with what it means underneath. */
export interface SampleStat {
  value: string;
  label: string;
  detail: string;
  /** Whether the value is an amount, and so needs its currency shown. */
  money?: boolean;
}

/** Total settled spend in the window, to two decimal places. */
export const SAMPLE_SPEND = SAMPLE_DAYS.reduce((sum, day) => sum + day.spend, 0).toFixed(2);

/** Purchases that settled across the window. Feeds {@link SAMPLE_STATS}. */
const SAMPLE_SETTLED = SAMPLE_DAYS.reduce((sum, day) => sum + day.count, 0);

/** Attempts policy refused. Feeds {@link SAMPLE_STATS}. */
const SAMPLE_REFUSED = 23;

/**
 * The four numbers worth putting in front of someone deciding.
 *
 * Chosen for what they save the reader rather than for what the system did:
 * approvals they did not have to give, money that never left, what a purchase
 * actually costs, and the count that has to stay at zero.
 */
export const SAMPLE_STATS: readonly SampleStat[] = [
  {
    value: SAMPLE_SETTLED.toLocaleString('en-US'),
    label: 'purchases you never approved',
    detail: 'Each one checked against your limits in under a second, while you were elsewhere.',
  },
  {
    value: String(SAMPLE_REFUSED),
    label: 'stopped before they cost anything',
    detail: 'Over a limit, or a seller you had not allowed. No signature, no charge.',
  },
  {
    value: (Number(SAMPLE_SPEND) / SAMPLE_SETTLED).toFixed(2),
    money: true,
    label: 'average per purchase',
    detail: 'Per call, not per seat. You pay for the work, not for the months nobody used it.',
  },
  {
    value: '0',
    label: 'keys your agent ever held',
    detail: 'It asks Pocket to pay. It cannot sign for itself, so a leaked prompt cannot spend.',
  },
];
