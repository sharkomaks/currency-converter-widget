# Space grouping settles thousands; the remaining separator is decimal

Status: accepted (2026-11-13)

An amount whose thousands are already separated by spaces is read in two steps. First every space-separated
group is checked: the first integer part is 1–3 digits, later integer parts are exactly 3, and a fractional
part may close only the last group. Then the spaces are removed; the single remaining separator is decimal,
even when exactly three digits follow it. `87 129.32 ₽` is 87129.32, `1 234.567` is 1234.567, while
`1 234.56 789` and `12.50 13.00` stay refusals.

Why: ADR 0018's digit-count rule answers "is this lone separator a thousands group?" for input that has no
space grouping. Once spaces have already grouped thousands, reading the remaining separator as thousands is
incoherent and it broke the commonest Russian price form: the old group check counted `129.32` as five
digits and rejected `87 129.32 ₽`, while `129.32 ₽` worked. The user reported exactly that pair. The fix
lets the space keep its one meaning — always thousands — instead of adding a currency or page-language
guess.

## Known cost

A malformed mix such as `1 234.567,89` is now refused instead of guessed at. Three-decimal currencies are
unchanged: their ambiguity is the ungrouped `1.234`, already reserved in ADR 0018.

Full reasoning: `PLAN.ru.md` §12.2; ADR 0018; `tests/parser.test.ts` and `tests/money.test.ts`.
