# Contributing

Thank you for looking at this project. The rules below are short on purpose. The [Git workflow guide](docs/guides/git-workflow.md) has the details and shows which check enforces each rule.

## Issues

Issues are welcome: bug reports, questions about the architecture and ideas for the roadmap. Use the issue tracker for anything that is not a security problem. For security problems, follow [SECURITY.md](SECURITY.md) instead.

## Language

Code, documentation, commit messages, pull request titles and bodies, and issues are written in English. The only Turkish text is the Turkish content of the site itself.

## Content

The personal content of Sinem CAN (photo, biography, CV, personal text) is not part of the license. Do not add, invent or change it in a pull request. See [NOTICE.md](NOTICE.md).

## Setup

See the [development setup guide](docs/guides/development-setup.md) for Node 24, pnpm, commit signing and the daily commands. The [README](README.md) has a short version of the steps.

## Pull request rules

- One branch per piece of work, named `<type>/<kebab-case>` (for example `feat/notes-list`). Work is never done on `main`.
- Commits are atomic and follow Conventional Commits in English. The header is at most 72 characters, lowercase, without a trailing period, and the body contains at least one English line.
- Commits are signed. Commit trailers and co-author lines are not allowed.
- Any change under `src/` comes with tests in the same pull request. Line coverage of `src/lib` and `src/server` must not drop below its threshold.
- A pull request does one thing. If it changes the user interface, the "Visual check" section of the template is filled in.
- Documentation changes go in the same pull request as the change they describe. A change that affects setup, commands, environment, routes or deployment updates the README and the matching docs in that pull request. A reader must always be able to clone and run the project by following the README.
- All required CI checks must be green before a pull request is merged. Merges use a merge commit only, and branches are deleted after the merge.
- Do not use force pushes or history rewrites on pushed branches.

By contributing, you agree that your contribution is provided under the same license as the code, the PolyForm Noncommercial License 1.0.0 (see [LICENSE](LICENSE)).

Fill in the pull request template (`.github/pull_request_template.md`).

## Local checks

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```
