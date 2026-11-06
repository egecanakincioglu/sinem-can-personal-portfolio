import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PortraitSource } from '@/content/portrait.ts';
import { Portrait } from './Portrait.tsx';

afterEach(cleanup);

const source: PortraitSource = {
  src: '/images/test-portrait.jpg',
  width: 800,
  height: 1000,
  focalX: 40,
  focalY: 30,
  zoom: 1.2,
  alt: { tr: 'Test portresi', en: 'Test portrait' },
};

describe('Portrait', () => {
  it('renders the photograph with alternative text in the active language', () => {
    render(<Portrait locale="en" sizes="100vw" source={source} />);
    expect(screen.getByRole('img', { name: 'Test portrait' })).toBeTruthy();
    cleanup();
    render(<Portrait locale="tr" sizes="100vw" source={source} />);
    expect(screen.getByRole('img', { name: 'Test portresi' })).toBeTruthy();
  });

  it('falls back to a typographic frame, hidden from assistive technology, when there is no photograph', () => {
    const { container } = render(<Portrait locale="en" sizes="100vw" source={null} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('SC');
  });
});
