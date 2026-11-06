import { afterEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));

import { assertDevOnly } from './guard.ts';

describe('assertDevOnly', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it('passes in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => assertDevOnly()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each(['production', 'test'])('answers not-found in %s', (env) => {
    vi.stubEnv('NODE_ENV', env);
    expect(() => assertDevOnly()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
