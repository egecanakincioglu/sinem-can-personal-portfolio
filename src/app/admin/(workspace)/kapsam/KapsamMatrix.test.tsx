import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkCoverage, summarize } from '@/lib/field-registry';
import { publicFieldPaths, registry } from '../../registry';
import KapsamScreen from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const leaves = publicFieldPaths();
const summary = summarize(registry, leaves);

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('Kapsam screen', () => {
  it('answers not-found outside development', () => {
    expect(() => render(<KapsamScreen />)).toThrow('NEXT_NOT_FOUND');
  });

  it('renders the matrix with counts that match the registry', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<KapsamScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Kapsam matrisi' })).toBeTruthy();

    const readouts = Object.fromEntries(
      [...container.querySelectorAll('.a-readout')].map((r) => [
        r.querySelector('dt')?.textContent?.replace(' · türetilmiş', ''),
        Number(r.querySelector('dd')?.textContent),
      ]),
    );
    expect(readouts['Genel sitedeki alan']).toBe(leaves.length);
    expect(readouts['Düzenleyicisi hazır']).toBe(summary.ready);
    expect(readouts['Düzenleyicisi planlanan']).toBe(summary.planned);
    expect(readouts['Düzenleyicisi hazır'] + readouts['Düzenleyicisi planlanan']).toBe(readouts['Genel sitedeki alan']);
    expect(readouts['Kayıt defterinde karşılığı olmayan alan']).toBe(checkCoverage(registry, leaves).uncovered.length);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(summary.rows.length);
    expect(screen.getAllByText('Hazır', { selector: '.a-chip' })).toHaveLength(
      summary.rows.filter((r) => r.entry.status === 'ready').length,
    );
    expect(screen.getAllByText('Planlandı', { selector: '.a-chip' })).toHaveLength(
      summary.rows.filter((r) => r.entry.status === 'planned').length,
    );
  });

  it('groups rows by public page and links ready editors', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<KapsamScreen />);
    const home = screen.getByRole('table', { name: /Ana sayfa:/ });
    expect(within(home).getAllByRole('link', { name: /Ana sayfa › Hero/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: 'Projeler' })).toBeTruthy();
    const projects = within(screen.getByRole('table', { name: /Projeler:/ }));
    expect(projects.queryAllByText('Planlandı')).toHaveLength(0);
    expect(projects.getAllByRole('link', { name: /Kimlik/ }).length).toBeGreaterThan(0);
  });
});
