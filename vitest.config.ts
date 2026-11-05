import { defineConfig } from 'vitest/config';
import thresholds from './tooling/coverage-thresholds.json' with { type: 'json' };

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/server/**', 'src/lib/**'],
      thresholds,
    },
  },
});
