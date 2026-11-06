import { describe, expect, it } from 'vitest';
import type { PageKey } from '@/lib/routes';
import { navKeys, profileIndexIds, sectionIds, sheetKeys } from './structure';

const pages: PageKey[] = ['home', 'profile', 'projects', 'project', 'notes', 'note'];

describe('structure', () => {
  it('lists the primary navigation in order', () => {
    expect([...navKeys]).toEqual(['profile', 'projects', 'notes', 'contact']);
  });

  it('defines sections and a sheet key for every page', () => {
    for (const p of pages) {
      expect(sectionIds[p].length).toBeGreaterThan(0);
      expect(sheetKeys[p]).toBeTruthy();
    }
  });

  it('ends each page with the contact section where it has one', () => {
    for (const p of pages) expect(sectionIds[p].at(-1)).toBe('contact');
  });

  it('has unique, language-neutral section ids', () => {
    for (const p of pages) {
      expect(new Set(sectionIds[p]).size).toBe(sectionIds[p].length);
      for (const id of sectionIds[p]) expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('indexes only sections that the profile page defines', () => {
    for (const id of profileIndexIds) expect(sectionIds.profile).toContain(id);
  });
});
