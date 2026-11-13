# The currency picker dialog keeps a fixed height while filtering

Status: accepted (2026-11-13)

The picker dialog is a modal list with a fixed height: `min(560px, calc(100vh - 36px))`. The search field,
the count and the top of the list stay in place; only the list scrolls when the query changes.

Why: with `max-height` and `margin: auto`, the dialog was sized by its content and re-centred whenever
filtering shrank the list. In the 360×600 popup, typing moved the search field from `top: 20` to `top: 227`
and shrank the dialog from 560 to 145 px. The person types into a field that is moving, which is worse than
empty space under a short result list. A picker is a modal surface; its frame should not resize per keystroke.

## Known cost

With one or zero matches the dialog keeps the full height and leaves empty space below the result. Accepted:
a `min-height` alone would still let the dialog jump between the minimum and maximum.

Full reasoning: `src/shared/picker.ts`; `PLAN.ru.md` §8 and §14; measurements in Chromium 158.
