import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NoteContent, NoteRecord } from '@/content/notes/types.ts';
import { mergeSiteContent } from '@/content/site-content.ts';
import type { PublicNote } from '@/lib/notes.ts';
import { NoteArticle, tocOf } from './NoteArticle.tsx';

afterEach(cleanup);

const content: NoteContent = {
  slug: 'props-note',
  title: 'Props note',
  summary: 'A note for the props test.',
  blocks: [
    { type: 'h2', id: 'first', text: 'First section' },
    { type: 'p', text: 'Body text with a note[^a] and a source [@r].' },
  ],
  footnotes: [{ id: 'a', text: 'A footnote.' }],
  references: [{ id: 'r', text: 'A reference.' }],
};

const record: NoteRecord = {
  id: 'props-note',
  status: 'published',
  approved: true,
  published: '2026-01-02',
  en: content,
};

const note: PublicNote = { record, locale: 'en', content };

const edited = mergeSiteContent({
  dict: {
    sections: { footnotes: { tr: 'Dipnotlar§', en: 'Footnotes§' }, references: { tr: 'Kaynaklar§', en: 'Sources§' } },
  },
});

describe('NoteArticle', () => {
  it('shows the supplied owner name and builds the mailto link from the supplied address', () => {
    render(
      <NoteArticle note={note} locale="en" dict={edited.dict} ownerName="Edited Owner" email="edited@example.test" />,
    );
    expect(screen.getAllByText('Edited Owner').length).toBeGreaterThan(0);
    const link = screen.getByRole('link', { name: edited.dict.notes.spotError.en });
    expect(link.getAttribute('href')).toMatch(/^mailto:edited@example\.test\?subject=/);
  });

  it('takes the end-section labels of the table of contents from the supplied dictionary', () => {
    const labels = tocOf(note, 'en', edited.dict).map((i) => i.label);
    expect(labels).toEqual(['First section', 'Footnotes§', 'Sources§']);
  });
});
