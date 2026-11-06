# Development setup

This guide explains how to set up and run the project on your machine. The Git rules are in the [Git workflow guide](git-workflow.md). The reasoning behind the technology choices is in the [architecture decision records](../adr/README.md).

## Supported environments

- **Windows:** Git Bash and PowerShell 5.1. The setup script (`.sh`) runs in Git Bash. The Node tools (`node tooling/scripts/...ts`) run in both shells.
- **Linux:** the same commands. CI runs on Linux (`ubuntu-latest`). The `tooling (windows)` job also tests the repository tools on Windows.
- **Node:** 24 (`.node-version`). The `engines` field in `package.json` asks for `>=24.12.0 <25`. Node 24 runs `.ts` files without a build step. All code in the project is TypeScript; there is no plain JavaScript.
- **Package manager:** pnpm, pinned in the `packageManager` field of `package.json`. Corepack provides it, so you do not install pnpm yourself.

## First setup

Once per clone, to run the site.

1. Clone the repository and enter the folder: `git clone https://github.com/egecanakincioglu/sinem-can-personal-portfolio.git`, then `cd sinem-can-personal-portfolio`.
2. Enable Corepack: `corepack enable`. On Windows this can fail with `EPERM` when it writes to `C:\Program Files\nodejs`. Run it once in an administrator terminal.
3. Install the dependencies from the lock file: `corepack pnpm install --frozen-lockfile`.
4. Start the site with `corepack pnpm dev` and open http://localhost:3000. The root path redirects to `/tr`.

The site needs no environment variables and no database today. The admin interface is at `/admin` and works on mock data in development only. In any other mode it answers 404, because production builds do not contain the panel routes. Route files for the panel, the preview and the model route use the `.dev.tsx` or `.dev.ts` extension.

Only if you plan to commit:

5. Set up commit signing: `bash tooling/scripts/setup-commit-signing.sh`. Your Git identity (`user.email`) must be set; if it is not, the script stops. An existing `user.signingkey` is kept. Commits are signed with an SSH key.

## Troubleshooting

- **`corepack enable` fails with `EPERM` on Windows.** Corepack cannot write to `C:\Program Files\nodejs`. Run the command once in an administrator terminal.
- **The Node version does not match.** The project asks for the version in `.node-version` (Node 24). Install that version, open a new terminal and check it with `node --version`.

## Daily commands

| Command | Purpose |
|---|---|
| `corepack pnpm dev` | Development server |
| `corepack pnpm build` | Production build |
| `corepack pnpm lint` | ESLint, with zero warnings allowed |
| `corepack pnpm typecheck` | Next.js type generation, then `tsc` for the application and the tooling |
| `corepack pnpm test` | Vitest with the coverage gate |
| `corepack pnpm format` / `corepack pnpm format:check` | Write or check formatting with Prettier |
| `corepack pnpm knip` | Find unused files, exports and dependencies |
| `corepack pnpm site-audit` | Page audit: overflow, accessibility, console errors, Lighthouse |
| `corepack pnpm admin-audit` | Local sweep of the panel screens (see below) |
| `corepack pnpm release:prepare` | Prepare a release (see the [release runbook](../runbooks/release-and-rollback.md)) |

The `site-audit` command is optional locally. The audit is switched off in CI until `enabled` is `true` in `tooling/site-audit/thresholds.json`. The audit loads every page with the browser cache off, so each page is measured as a first visit.

The `admin-audit` command runs only on your machine. It needs Chrome (set `CHROME_PATH`). It starts `next dev` on a free port, or uses the server at `ADMIN_AUDIT_URL`. It writes its report to the file named in `ADMIN_AUDIT_OUT`, or prints it. It checks overflow, headings, accessibility, console errors, touch targets, input font size and the command palette keys on every panel screen at the review sizes. Exit code 0 means no findings, 1 means findings, and 2 means a setup problem. The sweep takes its routes from the side panel of `/admin`, not from source files, and exits with code 2 when it finds none.

Tooling files do not import app source, except an allowlist that a test checks.

Run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check` and `corepack pnpm test` before you open a pull request. CI runs the full set of checks.

## Documentation checks

- `node tooling/scripts/check-docs-language.ts` checks that documentation is English and that file names follow the rules.
- `node tooling/scripts/check-doc-links.ts` fails on a relative Markdown link that points to a missing file.
- `node tooling/scripts/check-doc-commands.ts` checks that the commands named in the documentation exist.

## Visual checks

A change to the user interface is checked in a browser at these widths: 360, 390, 768, 1024, 1440 and 1920. The `site-audit` jobs check overflow, touch target size, accessibility and console errors automatically ([ADR 0006](../adr/0006-quality-targets-and-thresholds.md)).
