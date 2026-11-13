# Architecture decisions

One file per decision that would be expensive to reverse, surprising without context, and the result of a
real trade-off. Each is a record of *that* a decision was made and *why* — not a copy of the plan.

The full reasoning stays in the Russian design corpus:

- `PLAN.ru.md` — the plan, by section
- `AUDIT.ru.md` — findings, risks and contradictions, by id (`Б…`, `С…`, `Р…`, `М…`)
- `HANDOFF.md` — where the conversation stopped
- `CONTEXT.md` — the vocabulary

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-money-arithmetic-in-bigjs.md) | Money arithmetic is delegated to `big.js` | accepted |
| [0002](0002-rate-crosses-the-seam-as-a-string.md) | A rate crosses the provider seam as a decimal string | accepted |
| [0003](0003-frankfurter-v2-only-provider.md) | Frankfurter v2 is the only rate provider | accepted |
| [0004](0004-currency-list-is-a-module.md) | The currency list is a TypeScript module, not an API call | accepted |
| [0005](0005-settings-snapshot-in-tab-memory.md) | Settings live as a snapshot in tab memory | accepted |
| [0006](0006-overlay-is-a-showcase.md) | The in-page overlay is a showcase, not a work surface | accepted |
| [0007](0007-six-error-classes.md) | Six error classes, a visible status, a retry that can help | accepted |
| [0008](0008-one-interface-language.md) | One interface language, from the setting | accepted |
| [0009](0009-two-manifests-two-vite-passes.md) | Two static manifests, two Vite passes | accepted |
| [0010](0010-parser-reads-selection-text.md) | The parser reads the selection text, plus the page language | accepted |
| [0011](0011-one-amount-expression-or-nothing.md) | One amount expression, with designations that agree | accepted |
| [0012](0012-yen-by-page-language.md) | A yen sign is resolved by the page language, defaulting to CNY | accepted |
| [0013](0013-onboarded-flag-syncs.md) | `onboarded` lives in `sync` and skips onboarding on a second machine | accepted |
| [0014](0014-overlay-theme-from-declaration.md) | The overlay theme: page declaration first, page paint second | accepted (amended 2026-11-08) |
| [0015](0015-flags-as-emoji.md) | Currency symbols from Intl, not flags | accepted (replaced 2026-11-13) |
| [0016](0016-automatic-overlay-no-trigger.md) | The overlay is automatic — no button, no gate | proposed (reason owed) |
| [0017](0017-rate-cache-dies-with-the-session.md) | The rate cache lives in `storage.session` and dies with the browser | accepted |
| [0018](0018-separator-arbitration-by-digit-count.md) | Separator arbitration counts digits, not the currency | accepted (amended 2026-11-13) |
| [0019](0019-oxlint-and-oxfmt.md) | Lint and formatting use oxc — never ESLint or Prettier | accepted |
| [0020](0020-ui-design-under-frontend-design-skill.md) | UI is designed under the frontend-design skill; the plan wins | accepted |
| [0021](0021-chrome-namespace-in-chromium.md) | Chromium uses `chrome`; Firefox uses `browser` | accepted (2026-11-13) |
| [0022](0022-space-grouping-keeps-decimal-separator.md) | Space grouping settles thousands; the remaining separator is decimal | accepted (2026-11-13) |
