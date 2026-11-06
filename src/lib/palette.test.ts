import { describe, expect, it } from 'vitest';
import type { RegistryEntry } from './field-registry';
import { fieldCommands, recordCommands, searchCommands } from './palette';

const entry = (id: string, label: string | undefined, extra: Partial<RegistryEntry> = {}): RegistryEntry => ({
  id,
  path: id,
  label,
  page: 'Ana sayfa',
  section: 'Hero',
  screen: 'ana-sayfa',
  status: 'ready',
  locale: 'bilingual',
  type: 'text',
  ...extra,
});

const registry = [
  entry('hero.lead', 'Hero cümlesi', { synonyms: ['slogan'] }),
  entry('contact.email', 'E-posta', { locale: 'shared' }),
  entry('later.field', 'Sonraki alan', { status: 'planned' }),
  entry('no.label', undefined),
];

describe('searchCommands', () => {
  const cmds = fieldCommands(registry, { 'hero.lead.tr': 'Çizerek düşünen biri' });

  it('finds a Turkish label from folded ASCII text', () => {
    expect(searchCommands(cmds, 'hero cumlesi').map((c) => c.label)).toEqual(['Alan: Hero cümlesi']);
  });

  it('needs every token, in any order', () => {
    expect(searchCommands(cmds, 'cumlesi hero')).toHaveLength(1);
    expect(searchCommands(cmds, 'hero posta')).toHaveLength(0);
  });

  it('matches synonyms and the value excerpt', () => {
    expect(searchCommands(cmds, 'slogan').map((c) => c.id)).toEqual(['f-hero.lead']);
    expect(searchCommands(cmds, 'dusunen').map((c) => c.id)).toEqual(['f-hero.lead']);
  });

  it('returns everything for an empty query', () => {
    expect(searchCommands(cmds, '  ')).toHaveLength(cmds.length);
  });
});

describe('fieldCommands', () => {
  it('lists only ready fields that have a label, each linking to its screen with the focus parameter', () => {
    const cmds = fieldCommands(registry, {});
    expect(cmds.map((c) => c.id)).toEqual(['f-hero.lead', 'f-contact.email']);
    expect(cmds[0]).toMatchObject({ group: 'Alanlar', href: '/admin/ana-sayfa?alan=hero.lead' });
  });

  it('shortens a long value to an excerpt', () => {
    const [c] = fieldCommands([registry[0]], { 'hero.lead.tr': 'a '.repeat(100) });
    expect(c.hint!.length).toBeLessThanOrEqual(61);
    expect(c.hint!.endsWith('…')).toBe(true);
  });
});

describe('recordCommands', () => {
  const projects = [{ id: 'p-1', title: { tr: 'Kiriş analizi' } }];

  it('finds a project by its title and opens its editor', () => {
    const cmds = recordCommands(projects);
    expect(searchCommands(cmds, 'kiris')).toEqual([
      { id: 'r-projeler-p-1', group: 'Kayıtlar', label: 'Proje: Kiriş analizi', href: '/admin/projeler/p-1' },
    ]);
  });

  it('includes notes when given and works without them', () => {
    expect(recordCommands([], [{ id: 'n 1', title: { tr: 'Not' } }])[0].href).toBe('/admin/notlar/n%201');
    expect(recordCommands([])).toEqual([]);
  });
});
