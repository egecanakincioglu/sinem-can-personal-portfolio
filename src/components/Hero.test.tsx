import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getSiteContent } from '@/content/site-content.ts';
import { angleText } from '@/lib/format.ts';
import { resultant } from '@/lib/physics.ts';
import { Hero } from './Hero.tsx';

afterEach(cleanup);

const content = getSiteContent();

describe('Hero', () => {
  it('names the owner as the page heading', () => {
    render(<Hero locale="en" content={getSiteContent()} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.getAttribute('aria-label')).toBe(content.ownerName);
  });

  it('lists the areas of interest in both languages', () => {
    for (const locale of ['tr', 'en'] as const) {
      render(<Hero locale={locale} content={getSiteContent()} />);
      expect(screen.getByText(content.dict.hero.direction[locale])).toBeTruthy();
      for (const it of content.interests) expect(screen.getAllByText(it[locale]).length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it('shows the boundary note only on demand', () => {
    const { container } = render(<Hero locale="en" content={getSiteContent()} />);
    const mark = screen.getByRole('button', { name: new RegExp(content.dict.hero.whatIs.en) });
    expect(mark.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(mark);
    expect(mark.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.sn-body')?.textContent).toContain(content.draft.isolationNote.en);
  });
  it('shows the computed resultant angle with the shared formatting, never a typed value', () => {
    const R = resultant(content.forceRecords);
    for (const locale of ['tr', 'en'] as const) {
      const { container } = render(<Hero locale={locale} content={getSiteContent()} />);
      expect(container.textContent).toContain(angleText(R.angleDeg, locale));
      cleanup();
    }
  });

  it('keeps the graduation month and year on one line', () => {
    for (const locale of ['tr', 'en'] as const) {
      const { container } = render(<Hero locale={locale} content={getSiteContent()} />);
      expect(container.textContent).toMatch(/[^\s ] \d{4}/);
      cleanup();
    }
  });

  it('keeps only dt/dd groups directly inside the definition list', () => {
    const { container } = render(<Hero locale="en" content={getSiteContent()} />);
    for (const dl of container.querySelectorAll('dl')) {
      for (const child of Array.from(dl.children)) {
        expect(child.tagName).toBe('DIV');
        expect(Array.from(child.children).map((c) => c.tagName)).toEqual(['DT', 'DD']);
      }
    }
  });
});
