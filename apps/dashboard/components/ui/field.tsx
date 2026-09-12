/**
 * The labelled form field every control is wrapped in.
 */

import * as LabelPrimitive from '@radix-ui/react-label';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { InfoHint } from './info-hint';

/** Props for {@link Field}. */
export interface FieldProps {
  /** `id` of the control this label describes. */
  htmlFor: string;
  /** Visible label text. */
  label: string;
  /** Optional helper line beneath the control. */
  hint?: string;
  /**
   * What this field does, behind an info icon on the label.
   *
   * @remarks For the rule a field enforces rather than how to fill it in. The
   * one-line `hint` is the place for the latter, and it stays visible.
   */
  info?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Labelled form field. Every control on the dashboard is wrapped in one, so no
 * input is ever left without an accessible name.
 */
export function Field({ htmlFor, label, hint, info, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <LabelPrimitive.Root htmlFor={htmlFor} className="eyebrow flex items-center gap-1">
        {label}
        {info === undefined ? null : <InfoHint label={info} subject={label.toLowerCase()} />}
      </LabelPrimitive.Root>
      {children}
      {hint ? <p className="text-text-muted text-xs">{hint}</p> : null}
    </div>
  );
}

/** Props for {@link Input}. */
export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Text input matching the button metrics.
 *
 * @param props Standard input attributes.
 */
export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'bg-surface text-text border-border h-9 w-full rounded-md border px-3 text-sm',
        'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        'placeholder:text-ash-400 hover:bg-ash-25',
        'disabled:bg-ash-100 disabled:text-text-muted disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
}
