import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Visual weight of a button. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Control height. */
export type ButtonSize = 'sm' | 'md';

/*
 * Every variant carries the same black hairline, so the difference between
 * them is fill, not weight. Ghost is the exception: it has no border because
 * it is not meant to read as a container at all.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border-border bg-primary border text-white hover:bg-primary-hover active:bg-primary-active disabled:border-ash-300 disabled:bg-ash-300',
  secondary:
    'border-border bg-surface text-text border hover:bg-ash-50 active:bg-ash-100 disabled:border-ash-300 disabled:text-text-muted',
  ghost: 'text-text-secondary hover:bg-ash-100 hover:text-text active:bg-ash-150',
  danger: 'border-border bg-danger-soft text-danger-ink border hover:bg-danger-line/60',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-9 gap-1.5 rounded-md px-3.5 text-sm',
};

/** Props for {@link Button}. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the single child element instead of a `<button>`, keeping styles. */
  asChild?: boolean;
}

/**
 * The one button in the system. Transitions colour on the shared curve and
 * inherits the global focus-visible ring.
 *
 * @param props Standard button attributes plus variant, size and `asChild`.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  asChild = false,
  className,
  type,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      {...(asChild ? {} : { type: type ?? 'button' })}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center font-medium tracking-tight',
        'transition-[color,background-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-brand)',
        // A press that moves is what makes a flat, bordered control feel
        // physical without adding a shadow it does not otherwise have.
        'active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
}
