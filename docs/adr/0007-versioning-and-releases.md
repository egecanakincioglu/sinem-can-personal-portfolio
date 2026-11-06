# ADR 0007: Versioning and releases

Status: Accepted
Date: 2026-11-05

## Context

Not every merge to `main` should go live. The project decides what is published and when, and each published state needs a version number. Deploys should also be traceable to a signed commit.

## Options

| Option | Pros | Cons |
|---|---|---|
| `main` deploys to production on every merge | No setup | Every merge goes live; no versions |
| A release tag deploys through a workflow | Only releases go live; versions are explicit; the tag is signed | Needs a deploy token stored as a repository secret |
| A separate release branch | No token | A second protected branch to manage |

## Decision

The project uses Semantic Versioning 2.0.0. Only a signed `vX.Y.Z` tag on the merge commit of `main` deploys to production. The version is the `version` field in `package.json`.

Rules:

1. `fix` raises PATCH, `feat` raises MINOR, a breaking change raises MAJOR. Before 1.0.0, MINOR is raised for a breaking change.
2. Versions below 1.0.0 are released as work completes. Version 1.0.0 is a separate decision, made for the first complete release.
3. `pnpm release:prepare` suggests the version, updates `package.json` and `CHANGELOG.md`, and writes a draft of `releases/vX.Y.Z.md`.
4. The release note is detailed: a first line `# vX.Y.Z — <theme>`, a summary, topic sections and technical notes. A note with a `<!-- fill in` comment is rejected.
5. The release pull request is named `chore(release): vX.Y.Z` on a branch `chore/release-vX-Y-Z`.
6. Before the tag, `release-rehearsal.yml` deploys the branch to a preview.
7. The `release` workflow checks that the tag is on `main` and equals the `package.json` version, deploys, and creates the GitHub release.
8. One full tag is pushed at a time. Tags are never deleted or moved. The GitHub release is never created by hand.
9. Rollback is promoting the previous deployment; the fix ships as a PATCH release ([runbook](../runbooks/release-and-rollback.md)).

## Consequences

- Positive: production changes only on purpose; every deploy maps to a tag.
- Negative: a release takes several steps and one repository secret must be kept current.
- Open item: when the backend exists, releases with database migrations need their own rules (planned).

## Sources

- https://semver.org/spec/v2.0.0.html
- https://keepachangelog.com/en/1.1.0/
