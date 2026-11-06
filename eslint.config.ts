import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// The panel and its development preview are separate surfaces: public code must not reach into them, nor into
// the libraries that exist only for them. A new panel-only library is added to this list.
const panelOnlyLibs = [
  'preview-bridge',
  'field-registry',
  'public-snapshot',
  'profile-fields',
  'interface-strings',
  'glb',
  'project-edit',
  'publish',
  'admin-issues',
  'task-queue',
  'palette',
];

export default defineConfig([
  globalIgnores(['.next/**', 'coverage/**', 'docs/old-source-code/**', 'next-env.d.ts', 'tooling/semgrep/**']),
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/admin/**',
      'src/app/[[]locale]/dev-preview/**',
      ...panelOnlyLibs.map((name) => `src/lib/${name}{,.test}.ts`),
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/admin', '@/app/admin/**', '**/app/admin', '**/app/admin/**', '**/admin/**'],
              message: 'Public code must not import the admin panel.',
            },
            {
              group: ['**/dev-preview', '**/dev-preview/**'],
              message: 'Public code must not import the development preview.',
            },
            {
              group: panelOnlyLibs.flatMap((name) => [`@/lib/${name}`, `**/lib/${name}`, `./${name}`]),
              message: 'This library belongs to the panel and its preview.',
            },
          ],
        },
      ],
    },
  },
]);
