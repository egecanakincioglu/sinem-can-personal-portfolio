import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Copy } from '@/content/types.ts';
import { getSiteContent } from '@/content/site-content.ts';
import { profileIndexIds } from '@/content/structure.ts';
import { ProfileLayout } from './ProfileSections.tsx';

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const content = getSiteContent();
const sections = content.dict.sections as Record<string, Copy>;

describe('ProfileLayout', () => {
  it.each(['tr', 'en'] as const)('has one page heading and a headed section for every index entry (%s)', (locale) => {
    const { container } = render(<ProfileLayout locale={locale} content={getSiteContent()} />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);

    for (const id of profileIndexIds) {
      const section = container.querySelector(`section#${id}`);
      expect(section, id).not.toBeNull();
      const labelledBy = section!.getAttribute('aria-labelledby')!;
      const heading = container.querySelector(`#${labelledBy}`);
      expect(heading?.tagName === 'H1' || heading?.tagName === 'H2').toBe(true);
      if (id !== 'intro') expect(heading?.textContent).toBe(sections[id][locale]);
    }
  });

  it('keeps month and year of a record period together, breaking only after the dash', () => {
    const { container } = render(<ProfileLayout locale="tr" content={getSiteContent()} />);
    const text = container.querySelector('section#education')?.textContent ?? '';
    const nb = String.fromCodePoint(0xa0);
    expect(text).toContain(`Ekim${nb}2022${nb}– Temmuz${nb}2027`);
  });

  it('keeps the first record of a section clear of the hairline above it', () => {
    const { container } = render(<ProfileLayout locale="en" content={getSiteContent()} />);
    for (const row of container.querySelectorAll('section .hair')) expect(row.className).not.toContain('first:');
  });

  it('does not offer a CV download while no file is supplied', () => {
    const { container } = render(<ProfileLayout locale="en" content={getSiteContent()} />);
    expect(content.cvPdf).toBeNull();
    expect(container.querySelector('a[href$=".pdf"]')).toBeNull();
  });

  it('shows the portrait full width on phones', () => {
    const { container } = render(<ProfileLayout locale="en" content={getSiteContent()} />);
    const portrait = container.querySelector('#intro figure') as HTMLElement;
    expect(portrait.className).toContain('w-full');
    expect(portrait.className).not.toContain('w-[88%]');
  });

  it('pads the current-activity row like the records below it', () => {
    const { container } = render(<ProfileLayout locale="en" content={getSiteContent()} />);
    const now = container.querySelector('#intro dl.hair') as HTMLElement;
    expect(now.className).toContain('py-6');
  });
});
