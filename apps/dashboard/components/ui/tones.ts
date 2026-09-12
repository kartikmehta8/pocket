/**
 * The class fragments each semantic tone is painted with.
 */

import type { Tone } from '@/lib/status';

/**
 * Class fragments for a soft-filled status chip.
 *
 * @remarks The ring is the tone's own line colour rather than the theme's black
 * hairline. A black outline on a chip this small closes it up and the fill
 * stops reading as a colour.
 */
export const TONE_CHIP: Record<Tone, string> = {
  neutral: 'bg-ash-100 text-ash-700 ring-ash-300',
  info: 'bg-info-soft text-info-ink ring-info-line',
  success: 'bg-success-soft text-success-ink ring-success-line',
  warning: 'bg-warning-soft text-warning-ink ring-warning-line',
  danger: 'bg-danger-soft text-danger-ink ring-danger-line',
};

/** Solid fill used for meter progress and decision accents. */
export const TONE_FILL: Record<Tone, string> = {
  neutral: 'bg-ash-400',
  info: 'bg-accent-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Track behind a meter fill — a lighter step of the fill's own ramp. */
export const TONE_TRACK: Record<Tone, string> = {
  neutral: 'bg-ash-150',
  info: 'bg-accent-100',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  danger: 'bg-danger-soft',
};

/** Text colour that stays legible on the page surface. */
export const TONE_INK: Record<Tone, string> = {
  neutral: 'text-ash-700',
  info: 'text-info-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
};

/** Left rule used to mark a row as needing attention. */
export const TONE_RULE: Record<Tone, string> = {
  neutral: 'border-l-ash-300',
  info: 'border-l-accent-400',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};
