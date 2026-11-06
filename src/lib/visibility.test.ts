import { describe, expect, it } from 'vitest';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { isPublicNote, isPublicProject } from './visibility';

const states = ['published', 'draft'] as const;
const flags = [true, false] as const;

const expected = (state: string, approved: boolean, fixture: boolean, dev: boolean) =>
  state === 'published' && approved && (!fixture || dev);

describe('visibility truth table', () => {
  for (const state of states)
    for (const approved of flags)
      for (const fixture of flags)
        for (const dev of flags) {
          const label = `${state} approved=${approved} fixture=${fixture} dev=${dev}`;
          const want = expected(state, approved, fixture, dev);

          it(`project: ${label} -> ${want}`, () => {
            const p = { visibility: state, approved, fixture: fixture || undefined } as ProjectRecord;
            expect(isPublicProject(p, dev)).toBe(want);
          });

          it(`note: ${label} -> ${want}`, () => {
            const n = { status: state, approved, fixture } as NoteRecord;
            expect(isPublicNote(n, dev)).toBe(want);
          });
        }

  it('treats a missing fixture flag as not a fixture', () => {
    expect(isPublicNote({ status: 'published', approved: true } as NoteRecord, false)).toBe(true);
  });
});
