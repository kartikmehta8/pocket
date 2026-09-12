'use client';

/**
 * Who built Pocket, and where to find them.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';

/** Name shown beside the avatar, and used in the labels assistive tech reads. */
const AUTHOR = 'Kartik Mehta';

/** Pixels the open panel keeps between itself and the edge of the window. */
const EDGE_GUTTER = 12;

/**
 * Where the author can be found.
 *
 * One list for both the desktop badge and the mobile menu, so the two cannot
 * drift apart. Each carries its own mark rather than a shared icon set: two of
 * the three are brand logos, and a brand logo drawn in someone else's stroke
 * weight reads as a counterfeit of it.
 */
const PROFILES = [
  { label: 'Website', href: 'https://www.mrmehta.in/', logo: '/logos/website.svg' },
  { label: 'X', href: 'https://x.com/kartik_mehta8', logo: '/logos/x.svg' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/kartikmehta17',
    logo: '/logos/linkedin.svg',
  },
] as const;

/** One profile mark. Decorative: every use pairs it with the profile's name. */
function ProfileMark({ logo }: { logo: string }) {
  return (
    <Image
      src={logo}
      alt=""
      width={16}
      height={16}
      unoptimized
      aria-hidden
      className="size-3.5 shrink-0 opacity-80"
    />
  );
}

/**
 * The author's avatar, which opens three profile links.
 *
 * @remarks Hover alone would put these links out of reach of a keyboard and of
 * every touch device, so the avatar is a real button: pointer and focus open
 * it, a tap toggles it, and Escape or a click elsewhere closes it. The links
 * are only mounted while it is open, which is what keeps them out of the tab
 * order the rest of the time rather than leaving invisible stops behind.
 *
 * The panel hangs below rather than expanding in place. This sits at the end of
 * a centred pill, and widening it would push the call to action sideways every
 * time a pointer crossed the avatar. It is centred on the avatar, so the middle
 * bubble falls directly beneath it with one to either side.
 *
 * That centring is measured rather than assumed. The avatar sits at the end of
 * a pill that runs up against the edge of a narrow window, where a centred row
 * would hang off the side, so the panel is nudged back inside when it has to
 * be. Symmetry is the intent; staying on screen wins when the two disagree.
 */
export function AuthorBadge({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      if (root.current === null || panel.current === null) return;
      const avatar = root.current.getBoundingClientRect();
      const half = panel.current.offsetWidth / 2;
      const overflow = avatar.left + avatar.width / 2 + half - (window.innerWidth - EDGE_GUTTER);
      setShift(overflow > 0 ? -overflow : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  return (
    <div
      ref={root}
      className={cn('relative', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="author-profiles"
        className="border-border block size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border"
      >
        <Image
          src="/kartik.jpg"
          alt={AUTHOR}
          width={72}
          height={72}
          className="size-full object-cover"
        />
        <span className="sr-only">, links</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="author-profiles"
            ref={panel}
            style={{ marginLeft: shift }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className="absolute top-full left-1/2 z-10 -translate-x-1/2 pt-2"
          >
            <ul className="flex items-center gap-1.5">
              {PROFILES.map((profile, index) => (
                <motion.li
                  key={profile.label}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: DURATION.fast,
                    ease: EASE,
                    delay: reduced ? 0 : index * 0.04,
                  }}
                >
                  <a
                    href={profile.href}
                    target="_blank"
                    rel="noreferrer noopener me"
                    className={cn(
                      'border-border bg-surface/95 shadow-pop-sm inline-flex size-9 items-center justify-center rounded-full border backdrop-blur-md',
                      'hover:border-accent-600 hover:bg-ash-50 transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-brand)',
                    )}
                  >
                    <ProfileMark logo={profile.logo} />
                    <span className="sr-only">{`${AUTHOR} on ${profile.label} (opens in a new tab)`}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * The same three profiles, written out rather than hidden behind a hover.
 *
 * @remarks What a phone gets instead of the badge, inside the menu it already
 * opens. A hover panel has nothing to reveal without a pointer, and a row of
 * bare marks would be the only thing in a list of worded links that a reader
 * has to recognise rather than read, so the avatar sits beside the name and
 * each profile is spelled out.
 *
 * @param className Placement, supplied by the caller rather than assumed, so
 *   this sits in the rhythm of whatever sheet it is dropped into.
 * @param onNavigate Called when a profile is opened, so a menu can close itself.
 */
export function AuthorLinks({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Image
          src="/kartik.jpg"
          alt=""
          width={56}
          height={56}
          aria-hidden
          className="border-border size-7 shrink-0 rounded-full border object-cover"
        />
        <p className="text-text-muted text-xs leading-relaxed">
          Built by <span className="text-text font-medium">{AUTHOR}</span>
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {PROFILES.map((profile) => (
          <li key={profile.label}>
            <a
              href={profile.href}
              target="_blank"
              rel="noreferrer noopener me"
              onClick={onNavigate}
              className="border-border text-text-secondary hover:bg-ash-100 hover:text-text inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--duration-fast)"
            >
              <ProfileMark logo={profile.logo} />
              {profile.label}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
