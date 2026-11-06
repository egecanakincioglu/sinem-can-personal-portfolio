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
    const { container } = render(<ProfileLayout locale={locale} />);
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

  it('does not offer a CV download while no file is supplied', () => {
    const { container } = render(<ProfileLayout locale="en" />);
    expect(content.cvPdf).toBeNull();
    expect(container.querySelector('a[href$=".pdf"]')).toBeNull();
  });
});
