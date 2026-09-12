/**
 * Who built Pocket, in the sidebar footer.
 */

import Image from 'next/image';

/** Name shown beside the avatar, and used in the labels assistive tech reads. */
const AUTHOR = 'Kartik Mehta';

/**
 * Where the author can be found.
 *
 * @remarks Written out here rather than imported from the dashboard, which
 * holds the same three. This site installs on its own, without the workspace
 * around it, so reaching across for a list this short would trade a duplicate
 * nobody has to maintain for a build step somebody does.
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

/**
 * The author and three ways to reach him, above the faucets.
 *
 * @remarks Sits in the sidebar footer rather than on a page, for the same
 * reason the faucets do: it is chrome, and a documentation site that makes you
 * hunt for who wrote it has hidden the one thing a reader might want to follow
 * up on.
 *
 * One row, deliberately. The sidebar tree already scrolls on a laptop, and
 * every pixel spent here is a page a reader has to scroll to reach, so this
 * carries no heading of its own: the avatar says it is a person without a
 * label having to.
 *
 * Its rule is a desktop affair. The static sidebar draws none of its own, so
 * this one separates the footer from the page tree; the drawer the sidebar
 * becomes below `md` draws one already, and `global.css` takes that away too,
 * because a panel with its own edge does not need a second line inside it.
 *
 * Every link opens in a new tab. Someone who clicks one is stepping away from
 * whatever they were reading, and losing their place to do it is a small
 * annoyance with no upside.
 */
export function SidebarAuthor() {
  return (
    <div
      data-pocket-author
      className="border-fd-border/15 flex items-center gap-2.5 border-t px-3 py-3 max-md:border-t-0"
    >
      <Image
        src="/kartik.jpg"
        alt=""
        width={64}
        height={64}
        aria-hidden
        className="border-fd-border/25 size-5 shrink-0 rounded-full border object-cover"
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-fd-foreground truncate text-[0.8125rem] leading-tight font-medium">
          {AUTHOR}
        </span>
        <span className="text-fd-muted-foreground text-[0.6875rem] leading-tight">
          Built Pocket
        </span>
      </div>
      <ul className="ml-auto flex shrink-0 items-center gap-1">
        {PROFILES.map((profile) => (
          <li key={profile.label}>
            <a
              href={profile.href}
              target="_blank"
              rel="noreferrer noopener me"
              className="border-fd-border/25 hover:bg-fd-accent hover:border-fd-border/50 flex size-5 items-center justify-center rounded-full border transition-colors"
            >
              <Image
                src={profile.logo}
                alt=""
                width={16}
                height={16}
                aria-hidden
                className="size-2.5 shrink-0 opacity-70"
              />
              <span className="sr-only">{`${AUTHOR} on ${profile.label} (opens in a new tab)`}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
