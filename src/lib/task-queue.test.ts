import { describe, expect, it } from 'vitest';
import { GROUP_DRAFT, GROUP_HONESTY, GROUP_VALIDATION, type Issue } from './admin-issues';
import type { RegistryEntry } from './field-registry';
import { fieldHref, groupIssues, taskRow } from './task-queue';

const issue = (group: string, fieldId: string, severity: Issue['severity'] = 'warning', text = 'x'): Issue => ({
  group,
  fieldId,
  path: fieldId,
  text,
  severity,
});

const entry: RegistryEntry = {
  id: 'hero.lead',
  path: 'draft.heroLead',
  label: 'Hero cümlesi',
  page: 'Ana sayfa',
  section: 'Hero',
  screen: 'ana-sayfa',
  editorSection: 'hero',
  status: 'ready',
  locale: 'bilingual',
  type: 'text',
};
const screens = [{ slug: 'ana-sayfa', title: 'Ana sayfa', sections: [{ id: 'hero', label: 'Hero' }] }];

describe('groupIssues', () => {
  it('orders groups as fixed and hides the empty ones', () => {
    const groups = groupIssues([
      issue(GROUP_HONESTY, 'a'),
      issue(GROUP_VALIDATION, 'b', 'error'),
      issue(GROUP_DRAFT, 'c'),
      issue(GROUP_HONESTY, 'd'),
    ]);
    expect(groups.map((g) => [g.group, g.issues.length])).toEqual([
      ['Onay bekleyen metinler', 1],
      ['Hatalar', 1],
      ['Uyarılar', 2],
    ]);
  });

  it('keeps every issue exactly once, including unknown groups', () => {
    const all = [issue('Eksik çeviri', 'a'), issue('Başka', 'b', 'error'), issue('Başka', 'c')];
    const groups = groupIssues(all);
    expect(groups.map((g) => g.group)).toEqual(['Eksik çeviri', 'Hatalar', 'Uyarılar']);
    expect(groups.flatMap((g) => g.issues)).toHaveLength(all.length);
  });

  it('returns nothing for no issues', () => {
    expect(groupIssues([])).toEqual([]);
  });
});

describe('taskRow', () => {
  it('names the field, screen and section, and links with the focus parameter', () => {
    const row = taskRow(
      issue(GROUP_DRAFT, 'hero.lead.tr', 'warning', 'Hero cümlesi: TR metni onaysız taslak.'),
      [entry],
      screens,
    );
    expect(row).toEqual({
      label: 'Hero cümlesi',
      where: 'Ana sayfa › Hero',
      text: 'TR metni onaysız taslak.',
      href: '/admin/ana-sayfa?alan=hero.lead.tr',
    });
  });

  it('falls back to the raw id when the registry has no entry', () => {
    expect(taskRow(issue(GROUP_DRAFT, 'zzz', 'warning', 'sorun'), [entry], screens)).toEqual({
      label: 'zzz',
      where: '',
      text: 'sorun',
      href: '/admin',
    });
  });
});

describe('fieldHref', () => {
  it('builds the route of the screen, or the overview for an empty slug', () => {
    expect(fieldHref('profil', 'a b')).toBe('/admin/profil?alan=a%20b');
    expect(fieldHref('', 'x')).toBe('/admin?alan=x');
  });
});
