# Release and rollback

How a release reaches production, and how to undo a bad one. The full release steps are in the [Git workflow](../guides/git-workflow.md#releases) and the decision is in [ADR 0007](../adr/0007-versioning-and-releases.md). This runbook adds the checks and the recovery steps.

## When to use it

- To ship the work merged into `main`. Merging alone publishes nothing; only a `vX.Y.Z` tag deploys to production. Versions below 1.0.0 are released as work completes. Version 1.0.0 is a separate decision for the first complete release.
- To recover when a release is live and something is wrong.

## Before a release

1. Check that the checks on `main` are green and that no pull request that belongs in the release is still open.
2. Check that the deploy credentials exist in the repository settings (the deploy token as a secret, the organization and project identifiers as variables). If the token is old, replace it first.
3. Check that the admin interface still answers 404 in production. It must stay closed until real authorization exists.
4. Check that the Vercel project sets the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1`, so that Vercel builds with the pnpm version pinned in `package.json`.

## Release steps

1. Branch `chore/release-vX-Y-Z` and run `pnpm release:prepare` (`--dry-run` only prints the result, `--version X.Y.Z` sets another version).
2. Fill in every `<!-- fill in` comment in `releases/vX.Y.Z.md`, commit as `chore(release): vX.Y.Z` and open the pull request. Do not enable auto-merge yet.
3. Rehearse: `gh workflow run release-rehearsal.yml -f ref=chore/release-vX-Y-Z`. The workflow deploys the branch to a preview. Open the preview address and read the build log.
4. Merge the pull request with `gh pr merge <N> --auto --merge --delete-branch`.
5. On `main`, tag the merge commit and push exactly that tag: `git tag -s vX.Y.Z -m "vX.Y.Z"` and `git push origin vX.Y.Z`.
6. The `release` workflow checks that the tag is on `main` and equals the `package.json` version, deploys the tagged commit to production, and creates the GitHub release. Watch it with `gh run list --workflow release.yml` and `gh run view <id>`.

If the workflow fails after the deploy step, production stays live on the new version and only the GitHub release is missing; rerun the failed job.

## Checks after a release

- The `release` workflow run is green and the GitHub release page shows the new version.
- Open the live site in both languages (`/tr`, `/en`): the home page, the profile, the projects list and the notes list.
- `/admin` answers 404 on the live site.
- The 3D viewer, if a project has a model, loads only after a click.

## Roll back the application

Pick one.

- **Promote the previous deployment (fast).** In the hosting dashboard, open the Deployments list, pick the last good production deployment and promote it. No tag, workflow or code change is involved.
- **Ship a new patch release (the fix).** Fix the problem on a branch, merge it, and release `vX.Y.(Z+1)` with the steps above. A promoted old deployment is a stop-gap; the repository still has the bad version as the latest tag until the patch release is out.

Do not delete or move a tag, and do not create or edit a GitHub release by hand.

## After the backend exists

The site has no database today, so a release has no migration step. When the backend arrives (planned), this runbook gets a section on migrations: they move forward only, and a promotion of an old deployment does not undo a schema change.
