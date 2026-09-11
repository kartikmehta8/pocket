'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/cn';

/** Props for {@link Switch}. */
export interface SwitchProps {
  /** `id` used by the surrounding label. */
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name, when no visible label points at this control. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A two-state toggle for a setting that takes effect on save.
 *
 * @remarks The platform checkbox was doing this job with an accent colour and
 * a 14px hit area, which is below the 24px minimum a pointer target should
 * offer and gave no sense of which side was on. Built on Radix so the keyboard
 * and screen-reader behaviour is the real thing rather than a styled div.
 */
export function Switch({
  id,
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'border-border inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-0.5',
        'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-accent-600 data-[state=unchecked]:bg-ash-200',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'bg-surface block size-3.5 rounded-full shadow-sm',
          'transition-transform duration-(--duration-fast) ease-(--ease-brand)',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
