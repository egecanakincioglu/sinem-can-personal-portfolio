# Sinem CAN

The bilingual (Turkish and English) portfolio site of Sinem CAN, a senior mechanical engineering student at Doğuş University. The repository also holds a private admin panel for editing the content.

The site presents the profile, projects and notes of an engineering student. Its signature interactions come from the subject itself: a free-body hero with a computed resultant, a beam with support reactions and a bending moment diagram, and a force polygon.

## Status

The public site and the admin interface work on mock data. The admin panel answers 404 outside development until real authorization exists. The backend is planned and not built yet. See the [roadmap](docs/roadmap.md).

The site shows only content that is published and approved. The project does not invent projects, notes, awards or skill levels. Where no approved content exists, the site shows a designed empty state.

## Stack

- Next.js 16 (App Router), React 19, TypeScript in strict mode
- Tailwind CSS 4 with design tokens
- Own `[locale]` routing with localized slugs and a typed dictionary; no i18n library
- three.js for an optional 3D viewer that loads only on click
- Vitest and Testing Library for tests
- GitHub Actions for CI; Vercel deploys by version tag

## Run it

Requirements: Git, Node 24 and pnpm. Corepack provides pnpm.

```bash
git clone https://github.com/egecanakincioglu/sinem-can-personal-portfolio.git
cd sinem-can-personal-portfolio
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The root path redirects to `/tr`; the English site is under `/en`. No environment variables and no database are needed today.

During development, the admin interface is at http://localhost:3000/admin. It works on mock data and saves nothing. In production it answers 404. More detail is in the [development setup guide](docs/guides/development-setup.md).

## Scripts

| Script | Purpose |
|---|---|
| `corepack pnpm dev` | Start the development server |
| `corepack pnpm build` | Build for production |
| `corepack pnpm lint` | Run ESLint |
| `corepack pnpm typecheck` | Type check the application and the tooling |
| `corepack pnpm test` | Run the tests with the coverage gate |
| `corepack pnpm format` | Format the files with Prettier |
| `corepack pnpm format:check` | Check the formatting without changing files |
| `corepack pnpm knip` | Find unused files, exports and dependencies |
| `corepack pnpm site-audit` | Audit the built pages (overflow, accessibility, Lighthouse) |
| `corepack pnpm release:prepare` | Prepare a release (version, changelog, release note draft) |

## Deployment

Production runs on Vercel. A release deploys it: a signed `vX.Y.Z` tag on the merge commit of `main` starts the `release` workflow, which deploys the tagged commit and publishes the GitHub release. There is no other route to production. Vercel's Git deployments are off in `vercel.json`. The steps are in the [release runbook](docs/runbooks/release-and-rollback.md).

A copy of the project needs:

- a Vercel project
- `VERCEL_TOKEN` as a repository secret
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repository variables
- `ENABLE_EXPERIMENTAL_COREPACK=1` as an environment variable in the Vercel project, so that Vercel builds with the pnpm version pinned in `package.json`

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: one branch per piece of work, signed Conventional Commits in English, a pull request, and all required CI checks green. The [Git workflow guide](docs/guides/git-workflow.md) has the details. To report a security problem, follow [SECURITY.md](SECURITY.md).

The page audit is switched off in CI until `enabled` is `true` in `tooling/site-audit/thresholds.json`.

## Documentation

The [docs folder](docs/README.md) has the architecture, the roadmap, the decision records, the guides and the runbooks.

## License

The code is licensed under the PolyForm Noncommercial License 1.0.0 (see [LICENSE](LICENSE)). Commercial use is not permitted. The license covers the code only. The photo, biography, CV and personal text of Sinem CAN are all rights reserved. See [NOTICE.md](NOTICE.md).
