# Roadmap

The phases of the project and their status. Details of each decision are in the [decision records](adr/README.md).

| Phase | Scope | Status |
|---|---|---|
| 1. Repository and tooling | Lint, type check, tests, CI, release flow, documentation | Done |
| 2. Site import with tests | Public site and admin interface moved into `src/`, with tests for the code in `src/lib` | Done |
| 3. Public site polish | Visual checks at all widths, accessibility, performance, empty states | Planned |
| 4. Admin UI | Admin screens on mock data, live preview | In progress |
| 5. Backend | Structured content, authentication, private file storage | Planned |
| 6. Security review and 1.0 | Review of the backend and the admin, first stable release | Planned |

Before 1.0.0, releases use MINOR versions ([ADR 0007](adr/0007-versioning-and-releases.md)).
