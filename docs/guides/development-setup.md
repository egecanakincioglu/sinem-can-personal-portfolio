# Development setup

This guide explains how to set up the project on your machine and which commands it has today.

## Supported environments

- **Windows:** Git Bash and PowerShell 5.1.
- **Linux:** the same commands.
- **Node:** 24 (`.node-version`). The `engines` field in `package.json` asks for Node 24.12.0 or newer, below version 25. All code in the project is TypeScript; there is no plain JavaScript.
- **Package manager:** pnpm, pinned in the `packageManager` field of `package.json`. Corepack provides it, so you do not install pnpm yourself.

## First setup

Once per clone.

1. Clone the repository and enter the folder: `git clone https://github.com/egecanakincioglu/sinem-can-personal-portfolio.git`, then `cd sinem-can-personal-portfolio`.
2. Enable Corepack: `corepack enable`. On Windows this can fail with `EPERM` when it writes to `C:\Program Files\nodejs`. Run it once in an administrator terminal.
3. Install the dependencies from the lock file: `corepack pnpm install --frozen-lockfile`.

The project needs no environment variables and no database today. The file `.env.example` only says so.

## Troubleshooting

- **`corepack enable` fails with `EPERM` on Windows.** Corepack cannot write to `C:\Program Files\nodejs`. Run the command once in an administrator terminal.
- **The Node version does not match.** The project asks for the version in `.node-version` (Node 24). Install that version, open a new terminal and check it with `node --version`.

## Daily commands

| Command                                               | Purpose                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| `corepack pnpm lint`                                  | ESLint, with zero warnings allowed          |
| `corepack pnpm typecheck`                             | TypeScript type check                       |
| `corepack pnpm test`                                  | Vitest with the coverage gate               |
| `corepack pnpm format` / `corepack pnpm format:check` | Write or check formatting with Prettier     |
| `corepack pnpm knip`                                  | Find unused files, exports and dependencies |

Run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check` and `corepack pnpm test` before you open a pull request.
