# Lint and formatting use oxc — oxlint and oxfmt, never ESLint or Prettier

Status: accepted

The user's decision (2026-11-08): code is linted by `oxlint` and formatted by `oxfmt`. ESLint and
Prettier are not introduced at all — not as a fallback, not per-surface.

The surprising part, written down so nobody "fixes" it later: `oxfmt` was adopted deliberately while in
beta (beta since February 2026, stable release pending), after verification in-session. The risk was
accepted for a project with exactly one runtime dependency; the recorded rollback is swapping one dev
dependency, so a beta breakage is an inconvenience, not an architecture change.

## Consequences

- A red lint is a red build, from the first ticket on: lint runs inside the build, not beside it.
- No lint or formatting config is allowed to sneak in from another toolchain (no `.eslintrc`, no
  `.prettierrc`) — the toolchain is oxc, full stop.
- Formatting style lives in `.oxfmtrc.json` — the user's own rules (tabs, width 120, single quotes),
  not bare formatter defaults. Everything the config does not name is still oxfmt's decision: the
  project does not maintain a style guide that fights the formatter. Markdown is outside the
  formatter's reach entirely: the Russian design corpus is hand-managed, and one oxfmt pass broke a
  table row in `PLAN.ru.md` before the ignore landed.

Full reasoning: `PLAN.ru.md` §15; `.scratch/mvp/spec.md` Implementation Decisions.
