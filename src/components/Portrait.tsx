import Image from 'next/image';
import type { PortraitSource } from '@/content/portrait';
import type { Locale } from '@/content/types';

/**
 * Editorial 4:5 portrait. Shows the real photograph from content/portrait.ts (passed in as `source`);
 * when none has been supplied it shows a deliberate typographic frame (initials on drawing-sheet construction lines) —
 * never a stand-in person. `priority` is for above-the-fold use only (Profile).
 */
export function Portrait({
  locale,
  priority = false,
  sizes,
  className = '',
  source,
}: {
  locale: Locale;
  priority?: boolean;
  sizes: string;
  className?: string;
  source: PortraitSource | null;
}) {
  return (
    <figure className={className}>
      <div className="relative aspect-[4/5] w-full overflow-hidden border-[1.5px] border-grafit bg-pafta">
        {source ? (
          <Image
            src={source.src}
            alt={source.alt[locale]}
            width={source.width}
            height={source.height}
            sizes={sizes}
            priority={priority}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${source.focalX}% ${source.focalY}%`,
              transformOrigin: `${source.focalX}% ${source.focalY}%`,
              transform: `scale(${source.zoom})`,
            }}
          />
        ) : (
          <div aria-hidden className="absolute inset-0">
            <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
              <line x1="0" y1="250" x2="400" y2="250" className="svg-axis" />
              <line x1="200" y1="0" x2="200" y2="500" className="svg-axis" />
              <rect x="64" y="90" width="272" height="320" className="svg-ghost" />
            </svg>
            <span className="serif absolute inset-0 flex items-center justify-center text-[clamp(4rem,14vw,7.5rem)] font-[360] italic leading-none tracking-[-0.03em] text-grafit">
              SC
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
