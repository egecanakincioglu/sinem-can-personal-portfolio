# Development setup

This guide explains how to set up the project on your machine and which commands it has today. The Git rules are in the [Git workflow guide](git-workflow.md).

## Supported environments

- **Windows:** Git Bash and PowerShell 5.1. The setup script (`.sh`) runs in Git Bash. The Node tools (`node tooling/scripts/...ts`) run in both shells.
- **Linux:** the same commands. CI runs on Linux (`ubuntu-latest`). The `tooling (windows)` job also tests the repository tools on Windows.
- **Node:** 24 (`.node-version`). The `engines` field in `package.json` asks for Node 24.12.0 or newer, below version 25. All code in the project is TypeScript; there is no plain JavaScript.
- **Package manager:** pnpm, pinned in the `packageManager` field of `package.json`. Corepack provides it, so you do not install pnpm yourself.

## First setup

Once per clone, to install the project.

1. Clone the repository and enter the folder: `git clone https://github.com/egecanakincioglu/sinem-can-personal-portfolio.git`, then `cd sinem-can-personal-portfolio`.
2. Enable Corepack: `corepack enable`. On Windows this can fail with `EPERM` when it writes to `C:\Program Files\nodejs`. Run it once in an administrator terminal.
3. Install the dependencies from the lock file: `corepack pnpm install --frozen-lockfile`.

The project needs no environment variables and no database today. The file `.env.example` only says so.

To run the site:

4. Start the development server: `corepack pnpm dev`. Open http://localhost:3000. The root path redirects to `/tr`; the English site is under `/en`.

Only if you plan to commit:

5. Set up commit signing: `bash tooling/scripts/setup-commit-signing.sh`. Your Git identity (`user.email`) must be set; if it is not, the script stops. An existing `user.signingkey` is kept. Commits are signed with an SSH key.

## Troubleshooting

- **`corepack enable` fails with `EPERM` on Windows.** Corepack cannot write to `C:\Program Files\nodejs`. Run the command once in an administrator terminal.
- **The Node version does not match.** The project asks for the version in `.node-version` (Node 24). Install that version, open a new terminal and check it with `node --version`.

## Daily commands

| Command                                               | Purpose                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| `corepack pnpm dev`                                   | Development server                          |
| `corepack pnpm build`                                 | Production build                            |
| `corepack pnpm start`                                 | Serve the production build                  |
| `corepack pnpm lint`                                  | ESLint, with zero warnings allowed          |
| `corepack pnpm typecheck`                             | TypeScript type check                       |
| `corepack pnpm test`                                  | Vitest with the coverage gate               |
| `corepack pnpm format` / `corepack pnpm format:check` | Write or check formatting with Prettier     |
| `corepack pnpm knip`                                  | Find unused files, exports and dependencies |
| `corepack pnpm release:prepare` | Prepare a release (see the [release runbook](../runbooks/release-and-rollback.md)) |

Run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check` and `corepack pnpm test` before you open a pull request. CI runs the full set of checks.

## Documentation checks

- `node tooling/scripts/check-docs-language.ts` checks that documentation is English and that file names follow the rules.
- `node tooling/scripts/check-doc-links.ts` fails on a relative Markdown link that points to a missing file.
- `node tooling/scripts/check-doc-commands.ts` checks that the commands named in the documentation exist.
