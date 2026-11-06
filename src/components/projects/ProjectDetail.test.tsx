import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects.ts';
import { mergeSiteContent } from '@/content/site-content.ts';
import { toPublicProject } from '@/lib/projects.ts';
import { ProjectDetail } from './ProjectDetail.tsx';

afterEach(cleanup);

describe('ProjectDetail', () => {
  it('renders the copy it is given', () => {
    const { dict } = mergeSiteContent({ dict: { projects: { back: { tr: 'Geri§', en: 'Back§' } } } });
    render(<ProjectDetail project={toPublicProject(fixtureProjects[0])} locale="en" dict={dict} />);
    expect(screen.getByText(/Back§/)).toBeTruthy();
  });

  it('uses the shared arrow style for the back link', () => {
    const { dict } = mergeSiteContent({});
    render(<ProjectDetail project={toPublicProject(fixtureProjects[0])} locale="en" dict={dict} />);
    const back = screen.getByRole('link', { name: dict.projects.back.en });
    expect(back.className).toContain('cta-back');
    expect(back.querySelector('.arrow')).not.toBeNull();
  });
});
