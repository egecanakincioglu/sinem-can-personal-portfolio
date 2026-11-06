import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NoteContent } from '@/content/notes/types.ts';
import { ArticleBody } from './ArticleBody.tsx';

afterEach(cleanup);

const note = (blocks: NoteContent['blocks'], extra: Partial<NoteContent> = {}): NoteContent => ({
  slug: 'test-note',
  title: 'Test note',
  summary: 'A test note.',
  blocks,
  ...extra,
});

describe('ArticleBody', () => {
  it('renders headings with anchors, paragraphs and lists', () => {
    render(
      <ArticleBody
        locale="en"
        content={note([
          { type: 'h2', id: 'first', text: 'First section' },
          { type: 'p', text: 'Plain paragraph.' },
          { type: 'ul', items: ['one', 'two'] },
        ])}
      />,
    );
    const h2 = screen.getByRole('heading', { level: 2, name: /First section/ });
    expect(h2.id).toBe('first');
    expect(h2.querySelector('a')?.getAttribute('href')).toBe('#first');
    expect(screen.getByText('Plain paragraph.').tagName).toBe('P');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['one', 'two']);
  });

  it('keeps markup typed into plain text inert', () => {
    const payload = '<script>window.__injected = true</script><img src=x onerror="window.__injected = true">';
    const { container } = render(
      <ArticleBody
        locale="en"
        content={note([
          { type: 'p', text: payload },
          { type: 'ul', items: [payload] },
          { type: 'quote', text: payload, cite: payload },
          { type: 'callout', kind: 'note', title: payload, paragraphs: [payload] },
          { type: 'table', caption: payload, head: [payload], rows: [[payload, payload]] },
        ])}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __injected?: boolean }).__injected).toBeUndefined();
    // the text itself is shown, as text
    expect(screen.getAllByText(payload, { exact: false }).length).toBeGreaterThan(0);
  });

  it('numbers footnotes in order of first citation and links back to the text', () => {
    render(
      <ArticleBody
        locale="en"
        content={note([{ type: 'p', text: 'Second cited[^b] and then first[^a].' }], {
          footnotes: [
            { id: 'a', text: 'Note A' },
            { id: 'b', text: 'Note B' },
          ],
        })}
      />,
    );
    const items = Array.from(document.querySelectorAll('.art-notes li'));
    expect(items.map((li) => li.id)).toEqual(['fn-b', 'fn-a']);
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('#fnref-b');
  });

  it('shows a table with column and row headers', () => {
    render(
      <ArticleBody
        locale="en"
        content={note([
          { type: 'table', caption: 'Values', head: ['Name', 'Value'], rows: [['a', '1']], align: ['l', 'r'] },
        ])}
      />,
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    expect(screen.getByRole('rowheader').textContent).toBe('a');
    expect(screen.getByRole('region').getAttribute('tabindex')).toBe('0');
  });
});
