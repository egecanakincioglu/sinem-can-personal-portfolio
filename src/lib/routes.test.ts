import { describe, expect, it } from 'vitest';
import { navHref, notePath, pagePath, projectPath, slugs, switchPath } from './routes';

describe('routes', () => {
  it('maps the localised slugs', () => {
    expect(pagePath('profile', 'tr')).toBe('/tr/profil');
    expect(pagePath('profile', 'en')).toBe('/en/profile');
    expect(pagePath('projects', 'tr')).toBe('/tr/projeler');
    expect(pagePath('projects', 'en')).toBe('/en/projects');
    expect(pagePath('notes', 'tr')).toBe('/tr/notlar');
    expect(pagePath('notes', 'en')).toBe('/en/notes');
    expect(slugs.notes).toEqual({ tr: 'notlar', en: 'notes' });
  });

  it('keeps the home page at the bare locale', () => {
    expect(pagePath('home', 'tr')).toBe('/tr');
    expect(pagePath('home', 'en')).toBe('/en');
  });

  it('builds detail paths under the localised list slug', () => {
    expect(projectPath('a-b', 'tr')).toBe('/tr/projeler/a-b');
    expect(projectPath('a-b', 'en')).toBe('/en/projects/a-b');
    expect(notePath('x', 'tr')).toBe('/tr/notlar/x');
    expect(notePath('x', 'en')).toBe('/en/notes/x');
  });

  describe('switchPath', () => {
    it('lands on the equivalent static page in the other language', () => {
      expect(switchPath('profile', 'en')).toBe('/en/profile');
      expect(switchPath('profile', 'tr')).toBe('/tr/profil');
      expect(switchPath('home', 'en')).toBe('/en');
    });

    it('uses the record own path on detail pages', () => {
      const alt = { tr: '/tr/projeler/bir', en: '/en/projects/one' };
      expect(switchPath('project', 'en', alt)).toBe('/en/projects/one');
      expect(switchPath('note', 'tr', { tr: '/tr/notlar/a', en: '/en/notes/b' })).toBe('/tr/notlar/a');
    });

    it('falls back to the list page when no alternate is given', () => {
      expect(switchPath('project', 'en')).toBe('/en/projects');
      expect(switchPath('note', 'tr')).toBe('/tr/notlar');
    });

    it('can be combined with a hash and keeps it', () => {
      const href = `${switchPath('profile', 'en')}#skills`;
      expect(href).toBe('/en/profile#skills');
    });
  });

  describe('navHref', () => {
    it('points contact at the in-page anchor', () => {
      expect(navHref('contact', 'home', 'tr')).toBe('#contact');
    });

    it('points other keys at their localised page', () => {
      expect(navHref('profile', 'home', 'tr')).toBe('/tr/profil');
      expect(navHref('notes', 'profile', 'en')).toBe('/en/notes');
    });
  });
});
