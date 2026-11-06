import { describe, expect, it } from 'vitest';
import { dict } from '@/content/dictionary';
import { langStatus } from './note-view';

describe('langStatus', () => {
  it('reports both languages when the note has two', () => {
    expect(langStatus(['tr', 'en'], 'en')).toBe(dict.notes.langBoth.en);
  });

  it('reports the missing language when only Turkish exists', () => {
    expect(langStatus(['tr'], 'en')).toBe(dict.notes.langOnlyTr.en);
    expect(langStatus(['tr'], 'tr')).toBe(dict.notes.langOnlyTr.tr);
  });

  it('reports the missing language when only English exists', () => {
    expect(langStatus(['en'], 'tr')).toBe(dict.notes.langOnlyEn.tr);
  });
});
