import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { ProjectsArchive } from './ProjectsArchive.tsx';

afterEach(cleanup);

describe('ProjectsArchive', () => {
  it.each(['tr', 'en'] as const)('shows the designed empty state when there are no projects (%s)', (locale) => {
    const d = dict.projects;
    const { container } = render(<ProjectsArchive locale={locale} projects={[]} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(d.title[locale]);
    expect(screen.getByRole('heading', { level: 2, name: d.emptyTitle[locale] })).toBeTruthy();
    expect(screen.getByText(d.emptyText[locale])).toBeTruthy();
    expect(screen.getByText(d.statusPreparing[locale])).toBeTruthy();
    expect(screen.getByRole('link', { name: d.toProfile[locale] }).getAttribute('href')).toBe(
      locale === 'tr' ? '/tr/profil' : '/en/profile',
    );
    // the placeholder drawing is decorative
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
