'use client';

/**
 * The dropdown, used for table filters and pickers.
 */

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

/** One option in a {@link Select}. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Props for {@link Select}. */
export interface SelectProps {
  /** `id` used by the surrounding `Field` label. */
  id: string;
  value: string;
  options: ReadonlyArray<SelectOption>;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Keyboard-operable dropdown built on Radix Select. Used for table filters and
 * enum-valued policy fields.
 */
export function Select({
  id,
  value,
  options,
  onValueChange,
  placeholder = 'Select…',
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          'bg-surface inline-flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5',
          'text-text ring-border-strong text-sm ring-1 ring-inset',
          'hover:ring-ash-300 transition-shadow duration-(--duration-fast) ease-(--ease-brand)',
          'data-[placeholder]:text-ash-400',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown aria-hidden className="text-ash-400 size-3.5" strokeWidth={2} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'bg-surface z-50 max-h-72 max-w-[calc(100vw-2rem)] min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg p-1',
            'shadow-e3 ring-border ring-1 ring-inset',
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'text-text relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-sm',
                  'data-[highlighted]:bg-ash-50 outline-none select-none',
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
                  <Check aria-hidden className="text-accent-600 size-3.5" strokeWidth={2.5} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText className="truncate">
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
