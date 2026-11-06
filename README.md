# Sinem CAN

The bilingual (Turkish and English) portfolio site of Sinem CAN, a senior mechanical engineering student at Doğuş University.

## Status

The repository is being set up. Tooling, documentation and the site follow in the next changes.

## Run it

Requirements: Git, Node 24 and pnpm. Corepack provides pnpm.

```bash
git clone https://github.com/egecanakincioglu/sinem-can-personal-portfolio.git
cd sinem-can-personal-portfolio
corepack enable
corepack pnpm install --frozen-lockfile
```

There is no site to open yet. No environment variables and no database are needed today. These scripts exist:

| Script                       | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `corepack pnpm lint`         | Run ESLint                                  |
| `corepack pnpm typecheck`    | Type check the project                      |
| `corepack pnpm test`         | Run the tests with the coverage gate        |
| `corepack pnpm format`       | Format the files with Prettier              |
| `corepack pnpm format:check` | Check the formatting without changing files |
| `corepack pnpm knip`         | Find unused files, exports and dependencies |
| `corepack pnpm release:prepare` | Prepare a release (version, changelog, release note draft) |

More detail is in the [development setup guide](docs/guides/development-setup.md).

## Deployment

Production runs on Vercel. A release deploys it: a signed `vX.Y.Z` tag on the merge commit of `main` starts the `release` workflow, which deploys the tagged commit and publishes the GitHub release. There is no other route to production. Vercel's Git deployments are off in `vercel.json`. The steps are in the [release runbook](docs/runbooks/release-and-rollback.md).

A copy of the project needs:

- a Vercel project
- `VERCEL_TOKEN` as a repository secret
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repository variables
- `ENABLE_EXPERIMENTAL_COREPACK=1` as an environment variable in the Vercel project, so that Vercel builds with the pnpm version pinned in `package.json`

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: one branch per piece of work, signed Conventional Commits in English, a pull request, and all required CI checks green. The [Git workflow guide](docs/guides/git-workflow.md) has the details. To report a security problem, follow [SECURITY.md](SECURITY.md).

## License

The source code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Personal content is not covered; see [NOTICE.md](NOTICE.md).
