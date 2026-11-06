import type { SiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import type { ProjectCard } from '@/lib/projects';
import { Cta } from '../linework';

// Client-safe view: imports only the ProjectCard TYPE from lib/projects (erased at build), so the Homepage
// preview bundle never reaches the server-side project accessors or fixtures.

function MiniAntet({ card, locale, dict }: { card: ProjectCard; locale: Locale; dict: SiteContent['dict'] }) {
  const d = dict.projects;
  const cells = [
    [d.kind[locale], card.kindLabel],
    [d.year[locale], card.year],
    [d.status[locale], card.statusLabel],
    [d.tools[locale], card.tools.join(', ')],
  ].filter((c): c is [string, string] => !!c[1]);
  return (
    <dl className="mt-8 grid grid-cols-2 border-[1.5px] border-grafit">
      {cells.map(([k, v], i) => (
        <div
          key={k}
          className={`min-w-0 px-3 py-2.5 ${i % 2 ? 'border-l border-cizgi' : ''} ${i > 1 ? 'border-t border-cizgi' : ''} ${cells.length % 2 && i === cells.length - 1 ? 'col-span-2' : ''}`}
        >
          <dt className="t-meta">{k}</dt>
          <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The featured block (cover 1–7, title + mini antet 8–12). `embedded`: used inside another section's grid (Homepage Work). */
export function Featured({
  card,
  locale,
  dict,
  embedded = false,
}: {
  card: ProjectCard;
  locale: Locale;
  dict: SiteContent['dict'];
  embedded?: boolean;
}) {
  const d = dict.projects;
  const H = embedded ? 'h3' : 'h2';
  return (
    <div className={embedded ? 'g12 col-[1/-1] mt-12 lg:mt-16' : 'shell g12 mt-14 lg:mt-20'}>
      {card.cover && (
        <a href={card.href} className="col-[1/-1] block lg:col-[1/8]" tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.cover.src}
            alt=""
            width={card.cover.width}
            height={card.cover.height}
            className="aspect-[3/2] w-full object-cover"
            style={{ objectPosition: `${card.cover.focalX}% ${card.cover.focalY}%` }}
          />
        </a>
      )}
      <div className={`col-[1/-1] mt-6 lg:mt-0 ${card.cover ? 'lg:col-[8/13]' : 'lg:col-[1/9]'}`}>
        <p className="t-meta">{d.featured[locale]}</p>
        <H className="t-display-m mt-3">
          <a href={card.href} className="hover:underline hover:decoration-1 hover:underline-offset-[8px]">
            {card.title}
          </a>
        </H>
        {card.subtitle && <p className="t-lead mt-4 max-w-[34ch] text-kursun">{card.subtitle}</p>}
        <MiniAntet card={card} locale={locale} dict={dict} />
        {card.fixture && (
          <p className="t-meta mt-3 w-fit border border-grafit px-2 py-1 text-grafit">{d.fixtureLabel[locale]}</p>
        )}
        <div className="mt-6">
          <Cta href={card.href}>{d.view[locale]}</Cta>
        </div>
      </div>
    </div>
  );
}
