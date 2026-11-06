import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSiteContent, mergeSiteContent } from '@/content/site-content.ts';
import { HomePage } from './HomePage.tsx';

type Captured = Record<string, unknown>;
const seen = vi.hoisted(() => ({ header: [] as Captured[], forces: [] as Captured[], beam: [] as Captured[] }));

vi.mock('./Header.tsx', () => ({
  Header: (props: Captured) => {
    seen.header.push(props);
    return null;
  },
}));
vi.mock('./ForceFigure.tsx', () => ({
  ForcesInteractive: (props: Captured) => {
    seen.forces.push(props);
    return null;
  },
}));
vi.mock('./BeamFigure.tsx', () => ({
  BeamFigure: (props: Captured) => {
    seen.beam.push(props);
    return null;
  },
}));

beforeEach(() => {
  seen.header.length = 0;
  seen.forces.length = 0;
  seen.beam.length = 0;
});
afterEach(cleanup);

const edited = () =>
  mergeSiteContent({
    contact: { email: 'edited@example.test' },
    dict: { forces: { heading: { tr: 'Kuvvetler§', en: 'Forces§' } }, approach: { heading: { tr: 'Y§', en: 'A§' } } },
  });

describe('HomePage', () => {
  it('passes no override to the client components without preview', () => {
    render(<HomePage locale="en" content={edited()} />);
    expect(seen.header[0]).toMatchObject({ ownerName: undefined, email: undefined, copy: undefined });
    expect(seen.forces[0]).toMatchObject({ copy: undefined });
    expect(seen.beam[0]).toMatchObject({ copy: undefined });
  });

  it('forwards the content to the client components in preview', () => {
    const content = edited();
    render(<HomePage locale="en" content={content} preview />);
    expect(seen.header[0]).toMatchObject({
      ownerName: content.ownerName,
      email: 'edited@example.test',
      copy: content.dict,
    });
    expect(seen.forces[0]).toMatchObject({ copy: content.dict.forces });
    expect(seen.beam[0]).toMatchObject({ copy: content.dict.approach });
  });

  it('renders the public content without preview and sends nothing extra to the client', () => {
    const { container } = render(<HomePage locale="en" content={getSiteContent()} />);
    expect(container.querySelector('#main')).not.toBeNull();
    expect(seen.header[0]?.copy).toBeUndefined();
  });
});
