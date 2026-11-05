# ADR 0005: CI and protection layers

Status: Accepted
Date: 2026-11-05

## Context

The repository is public. Nothing may reach `main` without checks, and the rules must work for every contributor on Windows and Linux. No check runs only on a developer machine, so CI must be the gate.

## Options

| Option | Pros | Cons |
|---|---|---|
| GitHub-hosted runners with required checks and branch protection | Free for public repositories; same result for everyone; enforced by GitHub | Each check costs run time |
| Checks on developer machines only | Fast feedback | Can be skipped; differs per machine |
| Self-hosted runners | Control | Maintenance; a security risk on a public repository |

## Decision

All checks run in GitHub Actions on GitHub-hosted runners. Branch protection on `main` requires a pull request and 12 checks: `policy`, `pr-text`, `tooling (linux)`, `tooling (windows)`, `quality`, `semgrep-registry`, `zizmor`, `test`, `build`, `site-audit (pages)`, `site-audit (mobile)` and `site-audit (desktop)`.

Rules:

1. Checks are strict: a branch must be up to date with `main`.
2. Commits are signed; force pushes and branch deletion are off; administrators are included.
3. Merges are merge commits only, and the branch is deleted after the merge.
4. The tooling job runs on Linux and Windows, because the repository tools must work on both.
5. Semgrep runs the project rules and the community rule sets. The community rules are not pinned, so `semgrep-registry` is a separate job from `quality`.
6. zizmor audits the workflow files.
7. Dependabot proposes updates to dependencies and workflow actions.
8. One re-run of a failed job is allowed per pull request for infrastructure failures only.

## Consequences

- Positive: the same rules apply to every change; a rule cannot be skipped locally.
- Negative: feedback arrives after a push, not before a commit. Contributors run `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test` first.
- A new upstream Semgrep rule can fail `semgrep-registry` without a change in the repository.
- The details for contributors are in the [Git workflow guide](../guides/git-workflow.md).

## Sources

- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://semgrep.dev/docs/
- https://docs.zizmor.sh/
