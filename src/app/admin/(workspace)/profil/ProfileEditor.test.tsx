import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminProvider } from '../../ui/store';
import { ProfileEditor } from './ProfileEditor';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/profil' }));

afterEach(cleanup);

describe('Profile editor', () => {
  it('names the records by their content, never by their internal ids', () => {
    const { container } = render(
      <AdminProvider>
        <ProfileEditor />
      </AdminProvider>,
    );
    const metas = [...container.querySelectorAll('.a-rec-meta .a-sfx')].map((e) => e.textContent ?? '');
    expect(metas.length).toBeGreaterThan(5);
    for (const id of ['dogus', 'imkb', 'ferre-femas', 'ieee-ras']) {
      expect(container.textContent).not.toContain(id);
    }
    expect(metas.some((m) => m.endsWith(' · korunan'))).toBe(true);
    expect(metas.every((m) => m.trim() !== '')).toBe(true);
    expect(screen.getByText(/“Korunan” etiketli kayıtlar/)).toBeTruthy();
  });
});
