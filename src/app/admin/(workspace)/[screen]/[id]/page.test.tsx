import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import RecordStub from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/content/media-manifest', async (orig) => {
  const actual = await orig<typeof import('@/content/media-manifest')>();
  const { fixtureProjects } = await import('@/content/fixtures/projects');
  return { ...actual, devFixtureProjects: () => fixtureProjects };
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const open = async (screen: string, id: string) => {
  vi.stubEnv('NODE_ENV', 'development');
  return render(await RecordStub({ params: Promise.resolve({ screen, id }) }));
};

describe('record route', () => {
  it('says the editor comes later for a development sample', async () => {
    const { container } = await open('projeler', fixtureProjects[0].id);
    expect(container.textContent).toContain('geliştirme örneğidir');
    expect(container.textContent).not.toContain('bulunamadı');
  });

  it('keeps the not-found wording for any other project id', async () => {
    const { container } = await open('projeler', 'nope');
    expect(container.textContent).toContain('“nope” kaydı bulunamadı.');
  });

  it('keeps the not-found wording for a note id, even one equal to a sample id', async () => {
    const { container } = await open('notlar', fixtureProjects[0].id);
    expect(container.textContent).toContain('kaydı bulunamadı.');
  });

  it('is a 404 for a screen without records and outside development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await expect(RecordStub({ params: Promise.resolve({ screen: 'medya', id: 'x' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    vi.stubEnv('NODE_ENV', 'test');
    await expect(RecordStub({ params: Promise.resolve({ screen: 'projeler', id: 'x' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
