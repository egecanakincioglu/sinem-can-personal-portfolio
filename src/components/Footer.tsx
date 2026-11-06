import { getSiteContent, type SiteContent } from '@/content/site-content';
import { navKeys, sheetKeys } from '@/content/structure';
import { locales, type Copy, type Locale } from '@/content/types';
import { fullDate } from '@/lib/format';
import { HashLink } from './HashLink';
import { navHref, switchPath, type AltPaths, type PageKey } from '@/lib/routes';

/** Footer = the site's title block (antet). Every cell holds real information. */
export function Footer({
  locale,
  page = 'home',
  paths,
  content = getSiteContent(),
}: {
  locale: Locale;
  page?: PageKey;
  paths?: AltPaths;
  content?: SiteContent;
}) {
  const { dict, contact, lastRevision, ownerName, platforms } = content;
  const sections = dict.sections as Record<string, Copy>;
  const f = dict.footer;
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  const cells: { k: string; v: React.ReactNode; wide?: boolean }[] = [
    { k: f.drawnBy[locale], v: ownerName },
    { k: f.sheet[locale], v: sections[sheetKeys[page]][locale] },
    {
      k: f.contact[locale],
      wide: true,
      v: (
        <a href={`mailto:${contact.email}`} className="ulink whitespace-nowrap">
          {contact.email}
        </a>
      ),
    },
    { k: f.revision[locale], v: <span className="tnum">{fullDate(lastRevision, locale)}</span> },
    {
      k: f.language[locale],
      v: (
        <span className="inline-flex gap-2">
          {locales.map((l, i) => (
            <span key={l}>
              {i > 0 && (
                <span aria-hidden className="mr-2 text-kalem">
                  ·
                </span>
              )}
              <HashLink
                href={switchPath(page, l, paths)}
                hrefLang={l}
                lang={l}
                aria-label={dict.langNames[l]}
                aria-current={l === locale ? 'true' : undefined}
                className={l === locale ? '' : 'ulink text-kursun'}
              >
                {l.toUpperCase()}
              </HashLink>
            </span>
          ))}
        </span>
      ),
    },
    {
      k: f.links[locale],
      wide: true,
      v: (
        <span className="flex flex-wrap gap-x-3">
          {platforms
            .filter((p) => p.id === 'linkedin' || p.show.footer)
            .map((p) => (
              <a key={p.id} href={p.url} {...ext} className="ulink">
                {p.name}
              </a>
            ))}
        </span>
      ),
    },
  ];

  return (
    <footer className="on-pafta bg-pafta pb-8 pt-[var(--band)]">
      <div className="shell g12">
        <div className="col-[1/-1] lg:col-[1/7]">
          <p className="serif max-w-[24ch] text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[1.2]">{f.sentence[locale]}</p>
          <nav aria-label={dict.nav.label[locale]} className="mt-8 flex flex-wrap gap-x-6 text-[15px] font-medium">
            {navKeys.map((key) => (
              <a key={key} href={navHref(key, page, locale)} className="ulink inline-flex min-h-11 items-center">
                {dict.nav[key][locale]}
              </a>
            ))}
          </nav>
        </div>

        {/* 1px gaps over a hairline-coloured ground draw the cell dividers at any column count */}
        <dl className="col-[1/-1] mt-12 grid grid-cols-2 gap-px border-[1.5px] border-grafit bg-cizgi md:grid-cols-3 lg:col-[7/13] lg:grid-cols-2 lg:mt-0">
          {cells.map((c) => (
            <div
              key={c.k}
              className={`min-w-0 bg-pafta px-4 py-3.5${c.wide ? ' col-span-2 md:col-span-1 lg:col-span-2' : ''}`}
            >
              <dt className="t-meta">{c.k}</dt>
              <dd className="mt-1 text-[15px] leading-snug">{c.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="shell mt-14">
        <p className="hair t-caption pt-4">{f.rights[locale]}</p>
      </div>
    </footer>
  );
}
