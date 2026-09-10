import type { ReactNode, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Props shared by table slots. */
interface SlotProps {
  className?: string;
  children?: ReactNode;
}

/** Horizontally scrollable wrapper — wide tables never scroll the page body. */
export function TableFrame({ className, children }: SlotProps) {
  return <div className={cn('w-full overflow-x-auto', className)}>{children}</div>;
}

/**
 * The table element, with tabular figures switched on for the whole grid.
 *
 * @remarks Borders are kept separate and drawn on cells, never on rows. With
 * collapsed borders Chromium paints a row's background over them, so a hovered
 * or tinted row lost its dividers. Cell borders sit above the background.
 */
export function Table({ className, children }: SlotProps) {
  return (
    <table
      className={cn('figures w-full min-w-max border-separate border-spacing-0 text-sm', className)}
    >
      {children}
    </table>
  );
}

/** Table head with a hairline underline. */
export function THead({ className, children }: SlotProps) {
  return (
    <thead className={cn('[&_th]:border-divider [&_th]:border-b', className)}>
      <tr>{children}</tr>
    </thead>
  );
}

/** Props for {@link TH}. */
export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align the column, as money columns require. */
  numeric?: boolean;
}

/** Column heading, rendered as an uppercase micro-label. */
export function TH({ numeric = false, className, children, ...rest }: THProps) {
  return (
    <th
      scope="col"
      className={cn(
        'eyebrow px-4 py-2 text-left font-semibold whitespace-nowrap',
        numeric && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

/** Table body. */
export function TBody({ className, children }: SlotProps) {
  return <tbody className={className}>{children}</tbody>;
}

/** Body cell. */
export function TD({
  numeric = false,
  className,
  children,
  colSpan,
}: SlotProps & { numeric?: boolean; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={cn('px-4 py-2.5 align-middle', numeric && 'text-right', className)}
    >
      {children}
    </td>
  );
}
