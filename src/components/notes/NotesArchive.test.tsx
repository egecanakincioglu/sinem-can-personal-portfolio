import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { mergeSiteContent } from '@/content/site-content.ts';
import { NotesArchive } from './NotesArchive.tsx';

afterEach(cleanup);

describe('NotesArchive', () => {
  it.each(['tr', 'en'] as const)('shows the designed empty state when there are no notes (%s)', (locale) => {
    const d = dict.notes;
    const { container } = render(<NotesArchive locale={locale} notes={[]} dict={dict} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(d.title[locale]);
    expect(screen.getByRole('heading', { level: 2, name: d.emptyTitle[locale] })).toBeTruthy();
    expect(screen.getByText(d.emptyText[locale])).toBeTruthy();
    expect(screen.getByText(d.emptyAside[locale])).toBeTruthy();
    expect(screen.getByRole('link', { name: d.toProfile[locale] }).getAttribute('href')).toBe(
      locale === 'tr' ? '/tr/profil' : '/en/profile',
    );
    expect(screen.getByRole('link', { name: d.toProjects[locale] }).getAttribute('href')).toBe(
      locale === 'tr' ? '/tr/projeler' : '/en/projects',
    );
    // the ruled placeholder lines are decorative
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByText(d.read[locale])).toBeNull();
  });

  it('renders the copy it is given', () => {
    const edited = mergeSiteContent({ dict: { notes: { title: { tr: 'Notlar§', en: 'Notes§' } } } }).dict;
    render(<NotesArchive locale="en" notes={[]} dict={edited} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Notes§');
  });
});
