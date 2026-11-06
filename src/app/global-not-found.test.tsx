import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { ownerName } from '@/content/site.ts';

vi.mock('next/font/google', () => ({
  Newsreader: () => ({ variable: 'font-newsreader-class' }),
  Hanken_Grotesk: () => ({ variable: 'font-hanken-class' }),
}));
vi.mock('./globals.css', () => ({}));

const { default: GlobalNotFound } = await import('./global-not-found.tsx');

describe('global not-found page', () => {
  const html = renderToStaticMarkup(<GlobalNotFound />);

  it('renders the document shell with the font classes', () => {
    expect(html.startsWith('<html lang="tr"')).toBe(true);
    expect(html).toContain('font-newsreader-class');
    expect(html).toContain('font-hanken-class');
    expect(html).toContain('<body>');
  });

  it('shows the title and text in both languages', () => {
    const n = dict.notFound;
    expect(html).toContain(`<span lang="tr">${n.title.tr}</span>`);
    expect(html).toContain(`lang="en">${n.title.en}</span>`);
    expect(html).toContain(`<span lang="tr">${n.text.tr}</span>`);
    expect(html).toContain(`<span lang="en">${n.text.en.replaceAll("'", '&#x27;')}</span>`);
    expect(html).toContain(`aria-label="${ownerName}"`);
  });

  it('links to the project lists and home pages of both languages', () => {
    expect(html).toMatch(/<a href="\/tr\/projeler" hrefLang="tr"/);
    expect(html).toMatch(/<a href="\/en\/projects" hrefLang="en"/);
    expect(html).toMatch(/<a href="\/tr" hrefLang="tr"/);
    expect(html).toMatch(/<a href="\/en" hrefLang="en"/);
  });
});
