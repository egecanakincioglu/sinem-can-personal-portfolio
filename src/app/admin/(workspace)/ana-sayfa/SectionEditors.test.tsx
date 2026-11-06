import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminProvider } from '../../ui/store';
import { WorkshopEditor } from './SectionEditors';

afterEach(cleanup);

describe('Workshop editor', () => {
  it('shows the Uyguladım and Gözlemledim headings read-only and keeps the hints editable', () => {
    const { container } = render(
      <AdminProvider>
        <WorkshopEditor />
      </AdminProvider>,
    );
    expect(container.textContent).toContain('“Uyguladım” başlığı · korumalı');
    expect(container.textContent).toContain('“Gözlemledim” başlığı · korumalı');
    expect(container.textContent).toContain('applied');
    expect(screen.queryByLabelText(/“Uyguladım” başlığı/)).toBeNull();
    expect(screen.queryByLabelText(/“Gözlemledim” başlığı/)).toBeNull();
    expect(screen.getAllByLabelText(/“Uyguladım” alt açıklaması/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/“Gözlemledim” alt açıklaması/).length).toBeGreaterThan(0);
  });
});
