/**
 * The one button in the system.
 */

import { Slot } from '@radix-ui/react-slot';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Visual weight of a button. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Control height. */
export type ButtonSize = 'sm' | 'md';

/**
 * How each variant is painted.
 *
 * Every variant carries the same black hairline, so the difference between them
 * is fill, not weight. Ghost is the exception: it has no border, because it is
 * not meant to read as a container at all.
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

/**
 * Width floor for a form's submit button.
 *
 * @remarks Two problems, one fix. Buttons in a stack of forms should line up
 * even though their labels differ, and a label that grows while the button
 * works, "Save" becoming "Saving", would otherwise resize the control under
 * the cursor mid-press.
 */
export const SUBMIT_WIDTH = 'min-w-[8rem]';

/** Props for {@link Button}. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the single child element instead of a `<button>`, keeping styles. */
  asChild?: boolean;
  /** Leading icon. Swapped for a spinner while `loading`. */
  icon?: LucideIcon;
  /**
   * Whether the button's work is in flight.
   *
   * @remarks Turns the leading icon into a spinner, blocks further presses and
   * announces `aria-busy`. A label passed alongside should name the work in
   * progress — "Saving" rather than "Saving…" — because the spinner is what
   * says it is still going, and a row of dots repeats that badly.
   */
  loading?: boolean;
}

/**
 * The one button in the system. Transitions colour on the shared curve and
 * inherits the global focus-visible ring.
 *
 * @param props Standard button attributes plus variant, size, icon, loading
 *   and `asChild`.
 * @remarks `asChild` renders whatever it is given and takes no icon or
 *   spinner: the slot has to receive exactly one child, and a link styled as a
 *   button has nothing to be busy about.
 *
 * A press that moves is what makes a flat, bordered control feel physical
 * without adding a shadow it does not otherwise have.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  asChild = false,
  icon: Icon,
  loading = false,
  className,
  type,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex cursor-pointer items-center justify-center font-medium tracking-tight',
    'whitespace-nowrap',
    'transition-[color,background-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-brand)',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-55',
    VARIANT[variant],
    SIZE[size],
    className,
  );

  if (asChild) {
    return (
      <Slot className={classes} {...rest}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? (
        <LoaderCircle aria-hidden className="size-3.5 shrink-0 animate-spin" strokeWidth={2.25} />
      ) : Icon ? (
        <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      ) : null}
      {children}
    </button>
  );
}
