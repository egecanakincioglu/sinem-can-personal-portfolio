import type { SiteContent } from '@/content/site-content';
import type { PublicProject } from '@/content/projects/types';
import type { Locale } from '@/content/types';
import { cachedMonthYear as monthYear, cachedPeriodText as periodText } from './format';

/** Title block of a project page: only the cells that carry a real value, as [label, value] pairs. */
export function titleBlockCells(p: PublicProject, locale: Locale, dict: SiteContent['dict']): [string, string][] {
  const d = dict.projects;
  const latestRev = p.revisions?.[p.revisions.length - 1];
  return [
    [d.kind[locale], d.kinds[p.kind][locale]],
    [d.discipline[locale], p.disciplines.map((x) => d.disciplines[x][locale]).join(', ')],
    [d.context[locale], p.context && d.contexts[p.context][locale]],
    [
      d.period[locale],
      p.period &&
        (p.period.end
          ? periodText(p.period, locale)
          : p.status === 'in-progress'
            ? periodText(p.period, locale)
            : p.period.precision === 'year'
              ? p.period.start
              : monthYear(p.period.start, locale)),
    ],
    [d.status[locale], d.statuses[p.status][locale]],
    [d.tools[locale], p.tools?.join(', ')],
    [d.materials[locale], p.materials?.map((m) => m[locale]).join(', ')],
    [d.revision[locale], latestRev?.rev],
  ].filter((c): c is [string, string] => !!c[1]);
}
