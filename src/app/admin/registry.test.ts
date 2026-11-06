import { describe, expect, it } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { fixtureProjects } from '@/content/fixtures/projects';
import { checkCoverage, summarize } from '@/lib/field-registry';
import { copyFields } from '@/lib/preview-bridge';
import { partlyBuiltScreens, plannedScreens, publicFieldPaths, recordFieldPaths, registry } from './registry';
import { screens } from './screens';

const leaves = publicFieldPaths();

describe('field registry coverage', () => {
  it('has an entry for every public field', () => {
    expect(checkCoverage(registry, leaves).uncovered).toEqual([]);
  });

  it('has no entry that points to a public field that does not exist', () => {
    expect(checkCoverage(registry, leaves).stale.map((e) => e.path)).toEqual([]);
  });

  it('has unique ids and paths', () => {
    expect(checkCoverage(registry, leaves).duplicates).toEqual([]);
  });

  it('registers every text field of the Homepage editor table', () => {
    const ids = new Set(registry.map((e) => e.id));
    expect(Object.values(copyFields).filter((f) => !ids.has(f.id))).toEqual([]);
  });

  it('covers the record fields of every sample project and note', () => {
    const known = new Set(recordFieldPaths);
    const seen = [
      ...fixtureProjects.flatMap((p) => Object.keys(p).map((k) => `project.${k}`)),
      ...fixtureNotes.flatMap((n) => Object.keys(n).map((k) => `note.${k}`)),
    ].filter((p) => !p.startsWith('note.tr') && !p.startsWith('note.en'));
    expect(seen.filter((p) => !known.has(p))).toEqual([]);
    const noteContent = fixtureNotes.flatMap((n) => [n.tr, n.en].flatMap((c) => Object.keys(c ?? {})));
    expect(noteContent.filter((k) => !known.has(`note.content.${k}`))).toEqual([]);
  });
});

describe('field registry entries', () => {
  const slugs = new Set(screens.map((s) => s.slug));

  it('point to existing admin screens and sections', () => {
    for (const e of registry) {
      expect(slugs.has(e.screen), e.path).toBe(true);
      if (e.editorSection) {
        const sections = screens.find((s) => s.slug === e.screen)?.sections.map((s) => s.id);
        expect(sections, e.path).toContain(e.editorSection);
      }
    }
  });

  it('are ready only on a built screen and planned only on a placeholder screen', () => {
    for (const e of registry) {
      if ((partlyBuiltScreens as readonly string[]).includes(e.screen)) continue;
      const placeholder = (plannedScreens as readonly string[]).includes(e.screen);
      expect(e.status === 'planned', e.path).toBe(placeholder);
    }
  });

  it('edit the portrait fields from Medya, keeping their saved ids', () => {
    const portrait = registry.filter((e) => e.path.startsWith('portrait.') && e.status === 'ready');
    expect(portrait.map((e) => e.path).sort()).toEqual([
      'portrait.alt',
      'portrait.focalX',
      'portrait.focalY',
      'portrait.zoom',
    ]);
    for (const e of portrait) {
      expect(e.screen).toBe('medya');
      expect(e.id.startsWith('profil.portrait.')).toBe(true);
    }
  });

  it('sum to the summary totals', () => {
    const s = summarize(registry, leaves);
    expect(s.ready + s.planned).toBe(s.total);
    expect(s.total).toBe(leaves.length);
    expect(s.ready).toBeGreaterThan(0);
    expect(s.planned).toBeGreaterThan(0);
  });
});
