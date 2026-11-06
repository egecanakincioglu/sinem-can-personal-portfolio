import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@/content/projects/types';
import type { StateMessage } from '@/lib/preview-bridge';
import { PREVIEW_PROTOCOL } from '@/lib/preview-bridge';
import { toPublicProject } from '@/lib/projects';
import { LiveProject } from './LiveProject';

let message: StateMessage | undefined;
vi.mock('../live/useParentState', () => ({ useParentState: () => message }));
vi.mock('next/navigation', () => ({ usePathname: () => '/tr/dev-preview/live-project', notFound: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  message = undefined;
  vi.unstubAllGlobals();
});

const rec = (id: string, title: string, extra: Record<string, unknown> = {}): ProjectRecord =>
  ({
    id,
    slug: { tr: `${id}-tr`, en: `${id}-en` },
    title: { tr: title, en: title },
    kind: 'single-part',
    disciplines: ['cad-modelling'],
    status: 'completed',
    visibility: 'published',
    approved: true,
    ...extra,
  }) as ProjectRecord;

const real = toPublicProject(rec('real-1', 'Gerçek kayıt'));
const pool = [real, toPublicProject(rec('sample-1', 'Örnek biri')), toPublicProject(rec('sample-2', 'Örnek ikisi'))];
const msg = (projects?: string[]): StateMessage => ({
  type: 'state',
  v: PREVIEW_PROTOCOL,
  lang: 'tr',
  override: {},
  ...(projects ? { projects } : {}),
});
const shown = () => document.body.textContent ?? '';

describe('LiveProject', () => {
  it('shows only the real published records before any message', () => {
    render(<LiveProject locale="tr" projects={[real]} pool={pool} />);
    expect(shown()).toContain('Gerçek kayıt');
    expect(shown()).not.toContain('Örnek biri');
  });

  it('shows the pool records named by id and drops unknown ids', () => {
    message = msg(['sample-2', 'nope']);
    render(<LiveProject locale="tr" projects={[real]} pool={pool} />);
    expect(shown()).toContain('Örnek ikisi');
    expect(shown()).not.toContain('Örnek biri');
    expect(shown()).not.toContain('Gerçek kayıt');
  });

  it('shows the empty sheet for an empty id list', () => {
    message = msg([]);
    render(<LiveProject locale="tr" projects={[real]} pool={pool} />);
    expect(shown()).not.toContain('Gerçek kayıt');
    expect(screen.getByRole('heading', { level: 2, name: 'Pafta hazırlanıyor.' })).toBeTruthy();
  });

  it('keeps the baseline when the message has no id list', () => {
    message = msg();
    render(<LiveProject locale="tr" projects={[real]} pool={pool} />);
    expect(shown()).toContain('Gerçek kayıt');
  });

  it('applies the edited copy of the message', () => {
    message = { ...msg([]), override: { dict: { projects: { title: { tr: 'Arsiv§', en: 'Archive§' } } } } };
    render(<LiveProject locale="tr" projects={[]} pool={pool} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Arsiv§');
  });
});
