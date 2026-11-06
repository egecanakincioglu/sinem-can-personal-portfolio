import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { Header } from './Header.tsx';

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});

const menuButton = () => screen.getByRole('button', { name: dict.nav.menu.en });

describe('Header', () => {
  it('has a fully opaque paper background and a 44px logo link', () => {
    const { container } = render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    const bar = container.querySelector('header') as HTMLElement;
    expect(bar.className).toContain('bg-kagit');
    expect(bar.className).not.toMatch(/\/0\./);
    expect(screen.getByRole('link', { name: 'Test Owner' }).className).toContain('min-h-11');
  });

  it('marks the language links with hreflang, lang and aria-current on the active one', () => {
    render(<Header locale="en" page="profile" ownerName="Test Owner" email="a@example.test" />);
    const group = screen.getAllByRole('group', { name: dict.nav.language.en })[0];
    const tr = within(group).getByRole('link', { name: `TR, ${dict.langNames.tr}` });
    const en = within(group).getByRole('link', { name: `EN, ${dict.langNames.en}` });

    expect(tr.getAttribute('hreflang')).toBe('tr');
    expect(tr.getAttribute('lang')).toBe('tr');
    expect(tr.getAttribute('href')).toBe('/tr/profil');
    expect(tr.getAttribute('aria-current')).toBeNull();
    expect(en.getAttribute('hreflang')).toBe('en');
    expect(en.getAttribute('lang')).toBe('en');
    expect(en.getAttribute('aria-current')).toBe('true');
  });

  it('points the language switch at the record paths given for a detail page', () => {
    render(
      <Header
        locale="tr"
        page="note"
        paths={{ tr: '/tr/notlar/bir', en: '/en/notes/one' }}
        ownerName="Test Owner"
        email="a@example.test"
      />,
    );
    const group = screen.getAllByRole('group', { name: dict.nav.language.tr })[0];
    expect(
      within(group)
        .getByRole('link', { name: `EN, ${dict.langNames.en}` })
        .getAttribute('href'),
    ).toBe('/en/notes/one');
  });

  it('keeps the visible language code inside the accessible name of each switch link', () => {
    render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    const group = screen.getAllByRole('group', { name: dict.nav.language.en })[0];
    for (const link of within(group).getAllByRole('link')) {
      expect(link.getAttribute('aria-label')).toContain(link.textContent);
    }
  });

  it('names the desktop navigation apart from the footer navigation', () => {
    render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    expect(screen.getByRole('navigation', { name: dict.nav.menu.en })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: dict.nav.label.en })).toBeNull();
  });

  it('opens the mobile menu as a modal dialog with focus inside, and locks scrolling', () => {
    render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(menuButton());
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('link', { name: 'a@example.test' }).getAttribute('href')).toBe('mailto:a@example.test');
  });

  it('closes on Escape, returns focus to the menu button and releases the scroll lock', () => {
    render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    fireEvent.click(menuButton());
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(menuButton());
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps Tab and Shift+Tab inside the open menu', () => {
    render(<Header locale="en" ownerName="Test Owner" email="a@example.test" />);
    fireEvent.click(menuButton());
    const dialog = screen.getByRole('dialog');
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button'));
    const first = items[0];
    const last = items[items.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
