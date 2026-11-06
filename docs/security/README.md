# Security

Security notes for the project. To report a vulnerability, follow [SECURITY.md](../../SECURITY.md).

## Current state

- The site is not in the repository yet; the repository holds the tooling and configuration.
- No backend, database or authentication exists yet (planned).
- Private files must be authorized on the server when the backend arrives. A `public` flag in the front end is not a security boundary.

## Automated checks

CI runs Semgrep (project rules and registry rule sets), zizmor on the workflow files, a dependency audit, a license check for production dependencies, and a secret scan. The project Semgrep rules allow inner HTML only from the escaped MathML helper or a constant string, and environment access only for `NODE_ENV` until the validated env module exists. The secret scan allows only the placeholder `user:pw@` in test files, where URL validation tests use it. See [ADR 0005](../adr/0005-ci-and-protection-layers.md).

## Review

A security review is planned before 1.0. Its findings will be added to this folder.
