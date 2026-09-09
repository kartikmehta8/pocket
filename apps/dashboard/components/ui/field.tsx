import * as LabelPrimitive from '@radix-ui/react-label';
import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

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

/** Props for {@link NativeSelect}. */
export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * A plain `<select>`, styled to the input metrics.
 *
 * Deliberately native rather than the Radix `Select` used for filters: this one
 * posts inside a form to a server action, and a custom listbox would need a
 * shadow input to do that. Native also gets the platform picker on mobile.
 *
 * @param props Standard select attributes.
 */
export function NativeSelect({ className, children, ...rest }: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'bg-surface text-text border-border h-9 w-full appearance-none rounded-md border pr-8 pl-3 text-sm',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'hover:bg-ash-25 disabled:bg-ash-100 disabled:text-text-muted disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-ash-400 pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
        strokeWidth={2}
      />
    </div>
  );
}
