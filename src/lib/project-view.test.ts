import { describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects.ts';
import { mergeSiteContent } from '@/content/site-content.ts';
import { toPublicProject } from './projects.ts';
import { titleBlockCells } from './project-view.ts';

const { dict } = mergeSiteContent({});
const base = toPublicProject(fixtureProjects[0]);
const labels = (cells: [string, string][]) => cells.map((c) => c[0]);

describe('titleBlockCells', () => {
  it('lists the cells that carry a value, in order, in the requested language', () => {
    const tr = titleBlockCells(base, 'tr', dict);
    const en = titleBlockCells(base, 'en', dict);
    expect(labels(tr)).toEqual([
      dict.projects.kind.tr,
      dict.projects.discipline.tr,
      dict.projects.context.tr,
      dict.projects.period.tr,
      dict.projects.status.tr,
      dict.projects.tools.tr,
      dict.projects.materials.tr,
      dict.projects.revision.tr,
    ]);
    expect(en[0]).toEqual([dict.projects.kind.en, dict.projects.kinds['single-part'].en]);
  });

  it('shows a year-precision period as the plain year', () => {
    const cells = titleBlockCells({ ...base, period: { start: '2026', precision: 'year' } }, 'en', dict);
    expect(cells.find((c) => c[0] === dict.projects.period.en)?.[1]).toBe('2026');
  });

  it('formats a finished month-precision period without an end as month and year', () => {
    const cells = titleBlockCells({ ...base, period: { start: '2026-03', precision: 'month' } }, 'en', dict);
    expect(cells.find((c) => c[0] === dict.projects.period.en)?.[1]).toBe('March 2026');
  });

  it('uses the period text for a period with an end or an unfinished project', () => {
    const ended = titleBlockCells(
      { ...base, period: { start: '2026-03', end: '2026-05', precision: 'month' } },
      'en',
      dict,
    );
    const ongoing = titleBlockCells(
      { ...base, status: 'in-progress', period: { start: '2026-03', precision: 'month' } },
      'en',
      dict,
    );
    const value = (cells: [string, string][]) => cells.find((c) => c[0] === dict.projects.period.en)?.[1] ?? '';
    expect(value(ended)).toContain('2026');
    expect(value(ended)).not.toBe('March 2026');
    expect(value(ongoing)).not.toBe('March 2026');
  });

  it('drops empty cells and adds the latest revision', () => {
    const bare = {
      ...base,
      context: undefined,
      period: undefined,
      tools: [],
      materials: undefined,
      revisions: [
        { rev: 'A', note: { tr: 'a', en: 'a' } },
        { rev: 'B', note: { tr: 'b', en: 'b' } },
      ],
    };
    const cells = titleBlockCells(bare, 'tr', dict);
    expect(labels(cells)).toEqual([
      dict.projects.kind.tr,
      dict.projects.discipline.tr,
      dict.projects.status.tr,
      dict.projects.revision.tr,
    ]);
    expect(cells[3][1]).toBe('B');
  });
});
