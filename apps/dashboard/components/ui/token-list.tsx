'use client';

import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { DURATION, EASE } from '@/lib/motion';

import { Button } from './button';
import { Input } from './field';

/** Props for {@link TokenList}. */
export interface TokenListProps {
  /** `id` of the add-input, referenced by the surrounding `Field` label. */
  id: string;
  /** Current values, in display order. */
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  /** Render values in a monospace face — used for wallet addresses. */
  mono?: boolean;
  /** Accessible noun for the remove buttons, e.g. `"trusted recipient"`. */
  itemNoun: string;
}

/**
 * Editable list of short strings — assets, chains and trusted recipient
 * addresses. Chips animate in and out so an accidental removal is visible.
 */
export function TokenList({
  id,
  values,
  onChange,
  placeholder,
  mono = false,
  itemNoun,
}: TokenListProps) {
  const [draft, setDraft] = useState('');
  const reduced = useReducedMotion();

  const add = () => {
    const value = draft.trim();
    if (value === '' || values.includes(value)) return;
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          className={mono ? 'font-mono text-xs' : undefined}
        />
        <Button size="md" icon={Plus} onClick={add} aria-label={`Add ${itemNoun}`}>
          Add
        </Button>
      </div>
      {values.length === 0 ? (
        <p className="text-text-muted text-xs">None yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false}>
            {values.map((value) => (
              <motion.li
                key={value}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASE }}
                className="bg-ash-50 text-text ring-border inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs ring-1 ring-inset"
              >
                {/* A wallet address is longer than a phone is wide, and a pill
                    cannot wrap mid-word, so it is truncated with the whole
                    value on hover. Without `min-w-0` the flex child refuses to
                    shrink and takes the page sideways with it. */}
                <span
                  title={value}
                  className={
                    mono ? 'figures text-2xs min-w-0 truncate font-mono' : 'min-w-0 truncate'
                  }
                >
                  {value}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((entry) => entry !== value))}
                  aria-label={`Remove ${itemNoun} ${value}`}
                  className="text-ash-500 hover:bg-ash-200 hover:text-text inline-flex size-4 cursor-pointer items-center justify-center rounded-full"
                >
                  <X aria-hidden className="size-2.5" strokeWidth={2.5} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
