# Money arithmetic is delegated to `big.js`

Status: accepted

Converting looked like one multiplication, and the temptation was to write it by hand with `Math.round`. We
pinned exactly one runtime dependency — `big.js` — and put every arithmetic operation on money behind
`shared/money.ts`, so no other file multiplies, divides or rounds an amount.

Why: the dangerous part is not JavaScript but `Number`, i.e. binary floating point. `big.js` does not use it:
amounts are decimal strings and the arithmetic is decimal. The whole expression is one line —
`new Big(amountText).times(new Big(rateText)).toFixed(digitsFromIntl)` — and there is no division anywhere.

## Considered options

- **`dinero.js`** — a money type we would not use: the amount is never stored, summed or compared, it is
  multiplied once and printed. Its currency table we would build ourselves anyway.
- **Twenty lines of integer arithmetic of our own** — those twenty lines become ours together with rounding,
  and rounding is the part that fails silently on one cent.

## Consequences

`Big.strict = true` and `Big.RM = Big.roundHalfUp` are global, mutable constructor settings, set once at
module load; `shared/money.ts` is the only place allowed to touch them. The version is pinned exactly, not
`^`: rounding is behaviour and must not change without our knowledge. The amount and the rate both enter as
strings; the number of digits comes from
`Intl.NumberFormat(lang, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits`
(2 USD / 0 JPY / 3 KWD), and the same formatter prints the result. `Big.DP` is irrelevant — it only limits
division.

Full reasoning: `PLAN.ru.md` §7, `AUDIT.ru.md` С12–С13.
