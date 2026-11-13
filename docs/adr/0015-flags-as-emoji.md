# Currency symbols, not flags

Status: accepted (replaced 2026-11-13)

Flags were emoji in `shared/currencies.ts`, and an opt-in `showFlag` appended the target currency's flag to
the overlay. Both are gone. Windows does not render regional-indicator emoji: it shows two boxed letters
(`US`), so the picker row read `US USD` and the overlay `16,10 $ US`. Rendering real flags would mean a
`code → asset` map and 159 images to maintain. The user's ruling was: if that is hard, drop flags.

The replacement is a **narrow currency symbol** from `Intl.NumberFormat(..., { currencyDisplay:
'narrowSymbol' })`: `RUB → ₽`, `USD → $`, `BOB → Bs`. When Intl has no narrow symbol (`CHF`), the column shows
`¤`, and the ISO code beside it names the currency. The converter's amount fields and the picker both use it;
the overlay still prints its result through `Intl`.

## Consequences

- **No `showFlag`, no `flagOf`, no flag column.** A browser font cannot make flags appear on Windows, and the
  project does not carry image assets for them.
- **Symbols are still Intl's**, not a hand-maintained table: `formatToParts` supplies the glyph and the
  decimal formatter supplies the number with the currency's digits.
- **The ISO code stays next to the symbol** in every picker row and trigger, because `$` is USD, CAD, AUD and
  more.
- **Reintroducing flags needs images**, not emoji, and therefore a new asset pipeline and a manifest change.
  Do not put emoji flags back on Windows.

Full reasoning: `PLAN.ru.md` §8, §9, registry row 38; `CONTEXT.md` — Currency picker.
