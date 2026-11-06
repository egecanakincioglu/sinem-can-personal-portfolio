import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { mergeSiteContent } from '@/content/site-content.ts';
import type { ProjectCard } from '@/lib/projects.ts';
import { Featured } from './Featured.tsx';

afterEach(cleanup);

const card: ProjectCard = {
  id: 'p1',
  href: '/en/projects/p1',
  title: 'Sample',
  kind: 'single-part',
  kindLabel: 'Academic',
  disciplines: [],
  disciplineLabels: [],
  statusLabel: 'Done',
  tools: [],
  fixture: false,
};

describe('Featured', () => {
  it('renders the copy it is given', () => {
    const { dict } = mergeSiteContent({ dict: { projects: { featured: { tr: 'Secili§', en: 'Picked§' } } } });
    render(<Featured card={card} locale="en" dict={dict} />);
    expect(screen.getByText('Picked§')).toBeTruthy();
  });
});
