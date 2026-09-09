import type { ReactNode } from 'react';

/**
 * Shared shell for a diagram.
 *
 * Uses plain elements with `role` attributes rather than `ol` and `li`, and
 * zeroes the margins the documentation prose adds to paragraphs. A real list
 * inside the docs body picks up its own markers and indentation, which lands on
 * top of the numbering these diagrams draw themselves.
 */
function Frame({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={caption}
      className="my-6 rounded-lg border border-black bg-white p-5"
    >
      {/*
        The reset is scoped to the diagram body rather than the whole frame.
        Applied to the frame it also matched the caption, and a descendant
        selector outranks the caption's own margin utility, so the caption
        collapsed against the diagram.
      */}
      <div className="[&_p]:my-0">{children}</div>
      <p className="mt-5 text-center text-xs leading-relaxed text-[#6b6b6b]">{caption}</p>
    </div>
  );
}

/** One box in a flow. */
export interface FlowNode {
  /** Short label inside the box. */
  label: string;
  /** One line under the label, if the step needs qualifying. */
  note?: string;
  /** Marks the step that decides. Exactly one per flow, or none. */
  decides?: boolean;
}

/**
 * A flow of labelled boxes.
 *
 * Built from the same tokens as the product: white surface, black hairline,
 * 1rem radius.
 *
 * Stacks vertically on a narrow screen and runs left to right from `md` up.
 * Wrapping rather than scrolling is deliberate: a diagram the reader has to
 * drag sideways is one most readers never see the end of.
 *
 * @param nodes The boxes, in order.
 * @param caption What the diagram shows, for anyone who cannot see it.
 */
export function Flow({ nodes, caption }: { nodes: FlowNode[]; caption: string }) {
  return (
    <Frame caption={caption}>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch md:justify-center md:gap-y-3">
        {nodes.map((node, index) => (
          <div key={`${node.label}-${String(index)}`} className="contents md:flex md:items-stretch">
            <div
              className={[
                'rounded-lg border border-black p-3 md:flex md:w-40 md:shrink-0 md:flex-col md:justify-center',
                node.decides ? 'bg-[#eef2ff]' : 'bg-white',
              ].join(' ')}
            >
              <p className="text-[0.8125rem] leading-snug font-bold text-black">{node.label}</p>
              {node.note ? (
                <p className="mt-1 text-[0.6875rem] leading-snug text-[#6b6b6b]">{node.note}</p>
              ) : null}
            </div>
            {index < nodes.length - 1 ? (
              <span
                aria-hidden
                className="mx-auto flex h-4 w-4 items-center justify-center md:mx-0 md:h-auto md:w-8"
              >
                <span className="text-[#6b6b6b]">
                  <span className="md:hidden">&darr;</span>
                  <span className="hidden md:inline">&rarr;</span>
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** One exchange in a sequence. */
export interface SequenceStep {
  /** Who acts. */
  from: string;
  /** Who receives, or omitted when the actor works alone. */
  to?: string;
  /** What happens. */
  action: string;
  /** Optional consequence worth calling out. */
  note?: string;
  /** Marks the step where the decision is taken. */
  decides?: boolean;
}

/**
 * A numbered sequence of exchanges.
 *
 * Read downward rather than across lanes. A reader following an order of events
 * reads down the page, and lane diagrams stop being legible on a phone.
 *
 * @param steps The exchanges, in order.
 * @param caption What the sequence shows.
 */
export function Sequence({ steps, caption }: { steps: SequenceStep[]; caption: string }) {
  return (
    <Frame caption={caption}>
      <div role="list" className="flex flex-col">
        {steps.map((step, index) => (
          <div
            key={`${step.from}-${String(index)}`}
            role="listitem"
            className="relative flex gap-3.5 pb-4 last:pb-0"
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-7 bottom-0 left-[0.6875rem] w-px bg-black/15"
              />
            ) : null}

            <span
              aria-hidden
              className={[
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-black text-[0.625rem] font-bold',
                step.decides ? 'bg-[#4f46e5] text-white' : 'bg-white text-black',
              ].join(' ')}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[0.8125rem] leading-snug">
                <span className="font-bold text-black">{step.from}</span>
                {step.to ? (
                  <>
                    <span aria-hidden className="mx-1.5 text-[#6b6b6b]">
                      &rarr;
                    </span>
                    <span className="font-bold text-black">{step.to}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-[#333333]">{step.action}</p>
              {step.note ? (
                <p className="mt-1 text-[0.75rem] leading-relaxed text-[#6b6b6b]">{step.note}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
