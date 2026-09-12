import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

/**
 * Every screenshot is captured from a running dashboard at the same size.
 *
 * @remarks Declared once rather than passed per image. They are taken by one
 * script against one viewport, so a page that had to state the dimensions
 * would be stating the same two numbers a dozen times and getting them wrong
 * the first time one changed.
 */
const SIZE = { width: 2880, height: 1800 };

/** One screenshot of the product. */
export interface ShotProps {
  /** File name under `public/screens`, without the extension. */
  src: string;
  /** What the screen shows, for anyone who cannot see it. */
  alt: string;
  /** The line under the image, saying what to look at. */
  caption: string;
  /**
   * Load this one immediately rather than when it scrolls into view.
   *
   * @remarks For the first image on a page, which is usually the largest thing
   * above the fold and so decides the page's paint time. Everything below it
   * stays lazy, which is the whole reason the default is the other way round.
   */
  priority?: boolean;
}

/**
 * A screenshot of the dashboard, framed the way the site frames a diagram.
 *
 * Black hairline, 1rem radius, caption underneath — the same materials the
 * flow diagrams use, so a page that mixes the two does not look like it was
 * assembled from two design systems.
 *
 * Click to enlarge. The captures are two-up at 1440 CSS pixels wide, which
 * inside a documentation column is small enough that a reader looking for one
 * field would otherwise be leaning towards the screen.
 *
 * @param props The image, its description and its caption.
 */
export function Shot({ src, alt, caption, priority = false }: ShotProps) {
  return (
    <figure className="my-6 flex flex-col">
      <ImageZoom
        src={`/screens/${src}.png`}
        alt={alt}
        width={SIZE.width}
        height={SIZE.height}
        priority={priority}
        className="!my-0 w-full rounded-lg border border-black bg-white"
      />
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-[#6b6b6b]">
        {caption}
      </figcaption>
    </figure>
  );
}
