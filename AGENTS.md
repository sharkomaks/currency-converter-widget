# Price Lens

A Chrome + Firefox extension: select an amount with a currency indicator on any host page, and the
overlay shows it in your own currency. The design corpus is the source of truth — read it before
changing anything:

- `PLAN.ru.md` — Part I is the plan (sections 1–17, 20 acceptance criteria); Part II is the decision
  history. Part I wins on any conflict.
- `AUDIT.ru.md` — the audit of the plan; §19 is the status table. All 46 findings are closed.
- `CONTEXT.md` — the domain glossary. Use its vocabulary exactly, including the warning that the
  English `Popup` and the Russian «попап» are **different** surfaces.
- `docs/adr/` — 21 decisions plus an index. Several carry an explicit "do not reintroduce X" line;
  read the index before proposing anything.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`, one file per ticket.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, label strings equal to their names: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

### Dev tooling

Lint and formatting use **oxc** only — `oxlint` (stable) and `oxfmt` (beta) — no ESLint/Prettier. A red
lint is a red build; it applies from the first ticket. Recorded in `PLAN.ru.md` §15.

### UI design

All four UI surfaces (overlay, popup converter, settings, onboarding) are designed under the
`frontend-design` skill — load it before writing any UI code. Where skill and plan conflict, the plan
wins: the two fixed themes (§13), the six error classes and their texts (§11), `Intl` number printing
(§12), and the result-only overlay are product decisions the skill does not revisit. Recorded in
`PLAN.ru.md` §15.
