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

More detail is in the [development setup guide](docs/guides/development-setup.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: one branch per piece of work, signed Conventional Commits in English, a pull request, and all required CI checks green. The [Git workflow guide](docs/guides/git-workflow.md) has the details.

## License

The source code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Personal content is not covered; see [NOTICE.md](NOTICE.md).
