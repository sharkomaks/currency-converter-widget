# The currency list is a TypeScript module, not an API call

Status: accepted

`src/shared/currencies.ts` holds an **array of supported currency codes** (159 of the 181 the provider
knows), and the runtime never fetches `/v2/currencies`. Symbols and names come from `Intl` at render time —
`formatToParts` with `currencyDisplay: 'narrowSymbol'` for the symbol, `DisplayNames` for the name, `Collator`
for the order.

Why: a picker that needs the network fails exactly when the network is what failed. And a listed currency
with no rate is a state we can describe; an empty picker is not.

## Consequences

- **The list is ours to maintain.** It can drift from the provider's coverage. A listed pair the provider has
  no rate for shows an error with no number; the currency stays in the picker so the list does not flicker.
- **A currency removed from the list is migrated to `USD`** by the migration rule, not silently dropped.
  There is no table of semantic replacements (`BGN → EUR`, `ANG → XCG`); one rule beats two tables, and the
  price is accepted: a Bulgarian user ends up with dollars even though their currency is now euro.
- **No flags** (`0015`): Windows does not render regional emoji, so the picker and the fields lead with the
  narrow currency symbol. When Intl has no narrow symbol, the column shows `¤` and the code next to it does
the naming.
- **No `/v2/currencies` means no `symbol` field**: the symbol must come from the formatter, so "one glyph,
  another number" is impossible by construction rather than by agreement.

Full reasoning: `PLAN.ru.md` §8, `AUDIT.ru.md` С1, С10, М5.
