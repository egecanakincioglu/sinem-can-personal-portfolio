import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getSiteContent } from '@/content/site-content.ts';
import { Hero } from './Hero.tsx';

afterEach(cleanup);

const content = getSiteContent();

describe('Hero', () => {
  it('names the owner as the page heading', () => {
    render(<Hero locale="en" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.getAttribute('aria-label')).toBe(content.ownerName);
  });

  it('lists the areas of interest in both languages', () => {
    for (const locale of ['tr', 'en'] as const) {
      render(<Hero locale={locale} />);
      expect(screen.getByText(content.dict.hero.direction[locale])).toBeTruthy();
      for (const it of content.interests) expect(screen.getAllByText(it[locale]).length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it('shows the boundary note only on demand', () => {
    const { container } = render(<Hero locale="en" />);
    const mark = screen.getByRole('button', { name: new RegExp(content.dict.hero.whatIs.en) });
    expect(mark.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(mark);
    expect(mark.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.sn-body')?.textContent).toContain(content.draft.isolationNote.en);
  });
});
