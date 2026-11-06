import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { ownerName } from '@/content/site.ts';
import NotFound from './not-found.tsx';

afterEach(cleanup);

describe('locale not-found page', () => {
  it('shows the title and text in both languages', () => {
    const { container } = render(<NotFound />);
    const n = dict.notFound;
    expect(container.querySelector('h1 span[lang="tr"]')?.textContent).toBe(n.title.tr);
    expect(container.querySelector('h1 span[lang="en"]')?.textContent).toBe(n.title.en);
    expect(container.querySelector('p span[lang="tr"]')?.textContent).toBe(n.text.tr);
    expect(container.querySelector('p span[lang="en"]')?.textContent).toBe(n.text.en);
  });

  it('links to both language roots from a labelled navigation', () => {
    render(<NotFound />);
    const nav = screen.getByRole('navigation', { name: ownerName });
    expect(nav).toBeTruthy();
    const tr = screen.getByRole('link', { name: 'Türkçe' });
    const en = screen.getByRole('link', { name: 'English' });
    expect(tr.getAttribute('href')).toBe('/tr');
    expect(tr.getAttribute('hreflang')).toBe('tr');
    expect(en.getAttribute('href')).toBe('/en');
    expect(en.getAttribute('hreflang')).toBe('en');
  });
});
