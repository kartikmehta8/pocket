import * as LabelPrimitive from '@radix-ui/react-label';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Props for {@link Field}. */
export interface FieldProps {
  /** `id` of the control this label describes. */
  htmlFor: string;
  /** Visible label text. */
  label: string;
  /** Optional helper line beneath the control. */
  hint?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Labelled form field. Every control on the dashboard is wrapped in one, so no
 * input is ever left without an accessible name.
 */
export function Field({ htmlFor, label, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <LabelPrimitive.Root htmlFor={htmlFor} className="eyebrow">
        {label}
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
