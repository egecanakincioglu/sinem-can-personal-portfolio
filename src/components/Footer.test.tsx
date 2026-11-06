import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getSiteContent } from '@/content/site-content.ts';
import { Footer } from './Footer.tsx';

afterEach(cleanup);

const content = getSiteContent();

describe('Footer', () => {
  it('links the contact address and marks the active language', () => {
    render(<Footer locale="tr" page="profile" content={getSiteContent()} />);
    const mail = screen.getByRole('link', { name: content.contact.email });
    expect(mail.getAttribute('href')).toBe(`mailto:${content.contact.email}`);

    const en = screen.getByRole('link', { name: `EN, ${content.dict.langNames.en}` });
    const tr = screen.getByRole('link', { name: `TR, ${content.dict.langNames.tr}` });
    expect(tr.getAttribute('aria-current')).toBe('true');
    expect(en.getAttribute('aria-current')).toBeNull();
    expect(en.getAttribute('hreflang')).toBe('en');
    expect(en.getAttribute('lang')).toBe('en');
    expect(en.getAttribute('href')).toBe('/en/profile');
  });

  it('keeps the current hash when switching language', () => {
    window.location.hash = '#iletisim';
    render(<Footer locale="tr" page="profile" content={getSiteContent()} />);
    const en = screen.getByRole('link', { name: `EN, ${content.dict.langNames.en}` }) as HTMLAnchorElement;
    en.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(en);
    expect(en.getAttribute('href')).toBe('/en/profile#iletisim');
    window.location.hash = '';
  });

  it('gives language, e-mail and profile links a 44px hit area', () => {
    render(<Footer locale="en" content={getSiteContent()} />);
    const links = [
      screen.getByRole('link', { name: content.contact.email }),
      screen.getByRole('link', { name: `TR, ${content.dict.langNames.tr}` }),
      screen.getByRole('link', { name: `EN, ${content.dict.langNames.en}` }),
      ...Array.from(document.querySelectorAll<HTMLAnchorElement>('dl a[target="_blank"]')),
    ];
    for (const a of links) expect(a.className, a.textContent ?? '').toContain('min-h-11');
    expect(screen.getByRole('link', { name: `TR, ${content.dict.langNames.tr}` }).className).toContain('min-w-11');
  });

  it('opens external profile links safely', () => {
    render(<Footer locale="en" content={getSiteContent()} />);
    const external = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'));
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) expect(a.rel).toBe('noopener noreferrer');
  });

  it('offers the primary navigation in the active language', () => {
    render(<Footer locale="en" content={getSiteContent()} />);
    const nav = screen.getByRole('navigation', { name: content.dict.nav.label.en });
    expect(within(nav).getByRole('link', { name: content.dict.nav.projects.en }).getAttribute('href')).toBe(
      '/en/projects',
    );
    expect(within(nav).getByRole('link', { name: content.dict.nav.contact.en }).getAttribute('href')).toBe('#contact');
  });

  it('gives every navigation link a 44px hit area without moving its text', () => {
    render(<Footer locale="tr" content={getSiteContent()} />);
    const nav = screen.getByRole('navigation', { name: content.dict.nav.label.tr });
    for (const a of within(nav).getAllByRole('link')) {
      expect(a.className, a.textContent ?? '').toContain('min-h-11');
      expect(a.className).toContain('px-2');
      expect(a.className).toContain('-mx-2');
    }
  });
});
