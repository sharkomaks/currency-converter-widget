# UI surfaces are designed under the frontend-design skill; the plan wins

Status: accepted

All four UI surfaces — the overlay, the popup converter, the settings page, onboarding with its scene —
are designed under the `frontend-design` skill, which is loaded before the first line of UI code. Where
the skill and the plan disagree, the plan wins: the fixed theme system (§13), the six error classes and
their texts (§11), `Intl` number printing (§12), and the result-only overlay are product decisions the
skill does not revisit.

Why: the skill's brief is deliberate, non-templated visual design — palette, typography, layout. An
unconstrained run would either drift to generic defaults or re-litigate settled product rules, and an
agent building UI without this record has no way to know which parts are open to design judgment. The
hierarchy was written down before any UI code exists so the conflict is never resolved silently at
implementation time.

## Consequences

- The skill gets freedom where the plan is silent: type, colour inside the two fixed themes, spacing,
  composition, motion.
- The rule lives in `AGENTS.md` and `PLAN.ru.md` §15; every ticket touching a surface inherits it
  without restating it.
- Recorded as an ADR because the hierarchy (skill vs plan) is a standing answer to a conflict that will
  recur in every UI ticket, not a one-off choice.

Full reasoning: `PLAN.ru.md` §15; `.scratch/mvp/spec.md` Implementation Decisions.
