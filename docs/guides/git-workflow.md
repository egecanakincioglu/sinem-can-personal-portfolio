# Git workflow

This guide describes how a change travels from a branch to `main`, and which check enforces each step. CI is the gate; the reasons are in [ADR 0005](../adr/0005-ci-and-protection-layers.md). Commands for running the checks locally are in the [development setup guide](development-setup.md).

## Flow

1. Each piece of work gets its own branch: `git switch -c <type>/<kebab-case>` (for example `feat/notes-list`). The `policy` job checks the branch name. Direct commits to `main` are not allowed.
2. Split the change into atomic commits: one logical change per commit.
3. Run the checks locally: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
4. Push the branch: `git push -u origin <branch>`.
5. Open a pull request and fill in `.github/pull_request_template.md`.
6. Queue the merge: `gh pr merge <N> --auto --merge --delete-branch`.
7. GitHub merges and deletes the branch when all required checks are green.
8. Update the local `main`: `git switch main && git pull --ff-only`.

Pull requests are merged with a merge commit only. To update a branch with `main`, use `git merge origin/main`, not a rebase: pushed history is never rewritten.

## Commit messages

- Header: `<type>(<scope>)?: <lowercase summary>`, at most 72 characters, no trailing period, ASCII only.
- Types: `feat` `fix` `docs` `chore` `refactor` `test` `ci` `perf` `build` `style` `revert`.
- After the header, one blank line and at least one line of English body. Merge commits are exempt.
- No trailers. Lines such as `Signed-off-by` and any other `...-by:` line are rejected.
- Commits are signed. A commit without a verified signature cannot be merged.

Example:

```text
feat(notes): add the notes archive page

List published notes by date with a topic filter.
```

## Tests for source changes

- A pull request that adds or changes TypeScript under `src/` also adds or changes tests. Pull requests that only delete code, or only change styles, content or documentation, are exempt.
- Line coverage of `src/lib` and `src/server` cannot drop below 80%. The thresholds are in `tooling/coverage-thresholds.json` and only go up; CI rejects a lower value.

## User interface changes

- A pull request that touches the user interface is checked in a browser at 360, 390, 768, 1024, 1440 and 1920 pixels wide.
- The "Visual check" section of the pull request template is filled in.
- Overflow, touch target size, accessibility, image sizes and console errors are checked automatically by the `site-audit` jobs ([ADR 0006](../adr/0006-quality-targets-and-thresholds.md)).

## Documentation

- Everything under `docs/` is written in English. File and folder names are ASCII kebab-case (`README.md` is the only uppercase name).
- The docs check in the `policy` job requires English text and these names.
- A change and the documentation that describes it go in the same pull request.
- A change that affects setup, commands, environment, routes or deployment updates the README and the matching docs in the same pull request. A reader must always be able to clone and run the project by following the README.

## Not allowed

- Merging with `--admin`, or changing repository settings from a workflow.
- Committing, merging or pushing directly to `main`.
- Force pushes and rewriting pushed history.
- Committing secrets, `.env` files, keys, certificates or database dumps.

## CI checks

Every pull request to `main` runs these checks:

| Check | What it verifies |
|---|---|
| `policy` | Branch name; every commit message in the pull request; signed commits; source changes come with tests; coverage and site-audit thresholds only go up; documentation links, commands and language; secret scan; the `packageManager` pin; forbidden paths |
| `pr-text` | Pull request title (Conventional Commits) and text |
| `tooling (linux)`, `tooling (windows)` | Tests of the repository tools on both operating systems |
| `quality` | Type check, Prettier, ESLint, Semgrep rule tests and scan, dependency audit, production licenses, unused code and dependencies |
| `semgrep-registry` | Community Semgrep rule sets. The rules are fetched at run time and are not pinned, so a new upstream rule can fail this job without a change in the repository |
| `zizmor` | Security audit of the workflow files |
| `test` | Vitest tests with the coverage gate |
| `build` | `pnpm build` |
| `site-audit (pages)`, `site-audit (mobile)`, `site-audit (desktop)` | Page audit: overflow, axe, console errors, and Lighthouse on mobile and desktop |

The `build` and `site-audit` jobs skip themselves while the site is not in the repository.

The checks are strict, commits must be signed, force pushes and branch deletion are off, and administrators are included. A newer push to a pull request cancels the older CI run of that pull request.

## Infrastructure failures

- For a failure of the infrastructure (a lost runner, a network timeout or a GitHub outage), run `gh run rerun <id> --failed` at most once per pull request.
- A real test, lint or build failure is not rerun; fix the code instead.

## Parallel pull requests

- If a branch falls behind (the checks are strict), update it with `git merge origin/main`.
- If a conflict appears in a code or content file, abort the merge and resolve the conflict deliberately.
