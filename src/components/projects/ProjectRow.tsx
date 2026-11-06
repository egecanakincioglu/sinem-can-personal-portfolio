import { dict } from '@/content/dictionary';
import type { Locale } from '@/content/types';
import type { ProjectCard } from '@/lib/projects';

/**
 * One archive row: title · type · tools · year · arrow. On mobile a 72px square thumbnail leads the
 * row — only when a real cover exists; rows without one are text-only (no placeholder tiles).
 */
export function ProjectRow({ card, locale }: { card: ProjectCard; locale: Locale }) {
  const meta = [card.kindLabel, ...card.disciplineLabels.slice(0, 1)].join(' · ');
  return (
    <li className="hair">
      <a
        href={card.href}
        className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 py-4 transition-colors duration-150 hover:bg-pafta md:py-6 lg:grid-cols-12 lg:gap-x-[var(--g)] lg:px-3 lg:-mx-3"
      >
        {card.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.cover.src}
            alt=""
            width={72}
            height={72}
            loading="lazy"
            className="size-[72px] object-cover lg:hidden"
            style={{ objectPosition: `${card.cover.focalX}% ${card.cover.focalY}%` }}
          />
        )}
        <span className={`min-w-0 ${card.cover ? '' : 'col-span-2'} lg:col-[1/7]`}>
          <span className="serif block text-[22px] leading-[1.15] tracking-[-0.01em] md:text-[26px] lg:text-[32px]">
            <span className="group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[6px]">
              {card.title}
            </span>
          </span>
          <span className="t-meta mt-1 block lg:hidden">{[meta, card.year].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="t-meta hidden lg:col-[7/10] lg:block">
          {card.kindLabel}
          {card.disciplineLabels[0] && <span className="mt-0.5 block font-normal">{card.disciplineLabels[0]}</span>}
        </span>
        <span className="t-meta hidden lg:col-[10/12] lg:block">{card.tools.join(', ')}</span>
        <span className="tnum t-meta hidden lg:col-[12/13] lg:block lg:text-right">{card.year}</span>
        <span aria-hidden className="justify-self-end text-xl text-kursun lg:hidden">
          →
        </span>
        {/* Desktop hover/focus preview — only for a real cover; revealed by :hover AND :focus-visible, never by hover alone. */}
        {card.cover && (
          <span
            aria-hidden
            className="row-preview pointer-events-none absolute right-20 top-1/2 z-10 w-44 -translate-y-1/2 border-[1.5px] border-grafit bg-kagit p-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.cover.src}
              alt=""
              width={card.cover.width}
              height={card.cover.height}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
              style={{ objectPosition: `${card.cover.focalX}% ${card.cover.focalY}%` }}
            />
          </span>
        )}
        {card.fixture && (
          <span className="t-meta col-[1/-1] mt-2 text-kirmizi">{dict.projects.fixtureShort[locale]}</span>
        )}
      </a>
    </li>
  );
}
