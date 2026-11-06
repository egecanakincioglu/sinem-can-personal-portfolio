# ADR 0008: License, noncommercial code and reserved personal content

Status: Accepted
Date: 2026-11-05

## Context

The repository is public so that others can read the code. The site is a personal portfolio. Its code may be studied and reused for noncommercial purposes. Its personal content must not be reused at all.

## Options

| Option | Pros | Cons |
|---|---|---|
| MIT | Widely accepted | Allows commercial use |
| PolyForm Noncommercial 1.0.0 | Allows reading, study and noncommercial reuse; forbids commercial use | Not an OSI-approved license, so the project is source-available, not open source |
| All rights reserved | Full control | Others cannot reuse the code |

## Decision

The code is licensed under the PolyForm Noncommercial License 1.0.0 (`LICENSE`, with the line `Required Notice: Copyright Egecan Akıncıoğlu`). Commercial use is prohibited. `NOTICE.md` states that the license covers the code only. The photo, biography, CV and personal text of Sinem CAN are all rights reserved and are not licensed.

Rules:

1. The project calls itself source-available, never open source.
2. Contributions are accepted under the same license ([CONTRIBUTING.md](../../CONTRIBUTING.md)).
3. Personal content is not added to the repository by contributors.
4. CodeQL is not available for code that is not under an OSI-approved license. The `semgrep-registry` and `zizmor` jobs cover static analysis instead ([ADR 0005](0005-ci-and-protection-layers.md)).
5. Production dependencies must have permissive licenses.

## Consequences

- Positive: the license matches the aim; commercial use needs a separate agreement with the author.
- Negative: some registries and lists accept only OSI-approved licenses. Semgrep registry rules are pattern-based and find fewer problems than CodeQL data-flow analysis.
- A fork must replace the personal content with its own.

## Sources

- https://polyformproject.org/licenses/noncommercial/1.0.0/
- https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html
- https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md
