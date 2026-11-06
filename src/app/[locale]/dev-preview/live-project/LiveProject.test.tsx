import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@/content/projects/types';
import type { StateMessage } from '@/lib/preview-bridge';
import { PREVIEW_PROTOCOL } from '@/lib/preview-bridge';
import { toPublicProject } from '@/lib/projects';
import { LiveProject } from './LiveProject';

const viewerProps: { modelSrc: string }[] = [];
vi.mock('@/components/projects/Viewer3D', () => ({
  Viewer3D: (props: { modelSrc: string }) => {
    viewerProps.push(props);
    return <div data-testid="viewer" />;
  },
}));

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
  viewerProps.length = 0;
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

  describe('model probe', () => {
    const poster = {
      id: 'po',
      kind: 'image' as const,
      src: '/p.png',
      width: 10,
      height: 10,
      alt: { tr: 'Poster', en: 'Poster' },
    };
    const withModel = rec('model-1', 'Modelli kayıt', {
      preview3d: { id: 'm', approved: true, poster, modelSrc: '/dev-model/UNAPPROVED.glb', sizeBytes: 1 },
    });
    const modelPool = [...pool, toPublicProject(withModel)];
    const probe = (glb: string | null, approved: boolean): StateMessage => ({
      ...msg(['model-1']),
      probe: { id: 'model-1', glb, approved },
    });

    it('shows the record page with the library model the id maps to, not the stored address', () => {
      message = probe('dev-flange', true);
      render(<LiveProject locale="tr" projects={[real]} pool={modelPool} />);
      expect(viewerProps.map((p) => p.modelSrc)).toEqual(['/dev-model/flange.glb']);
      expect(shown()).toContain('Modelli kayıt');
    });
    it('maps a declared-size sample to its address, which has no file behind it', () => {
      message = probe('size-18', true);
      render(<LiveProject locale="tr" projects={[real]} pool={modelPool} />);
      expect(viewerProps.map((p) => p.modelSrc)).toEqual(['/dev-model/size-18.glb']);
    });
    it('removes the viewer when the preview is not approved or has no model', () => {
      message = probe('dev-flange', false);
      const first = render(<LiveProject locale="tr" projects={[real]} pool={modelPool} />);
      expect(viewerProps).toHaveLength(0);
      first.unmount();
      message = probe(null, true);
      render(<LiveProject locale="tr" projects={[real]} pool={modelPool} />);
      expect(viewerProps).toHaveLength(0);
    });
    it('keeps the archive when the probed id is not in the pool', () => {
      message = { ...msg(['real-1']), probe: { id: 'nope', glb: 'dev-flange', approved: true } };
      render(<LiveProject locale="tr" projects={[real]} pool={modelPool} />);
      expect(viewerProps).toHaveLength(0);
      expect(shown()).toContain('Gerçek kayıt');
    });
  });
});
