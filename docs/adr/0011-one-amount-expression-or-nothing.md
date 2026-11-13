# One amount expression, with designations that agree

Status: accepted

A selection is accepted only if it is exactly one amount expression carrying a currency. Several designations
are allowed only when they point at one currency — `$12.50 USD` and `usd 12.50` are one sum; `$12.50 CAD` and
`12.50 USD EUR` are rejected. An ISO code counts only where no letter touches it, so `USD 12.50`, `12.50USD`,
`RUB100` and `USD-12.50` are accepted while `USDT 100`, `USDT12.50` and `12.50 USDX` are not. A "half-code" —
starts with one of our codes and continues with a letter — is a foreign ticker and rejects the selection, so
`$12.50 USDT` shows nothing.

Why: choosing one of two disagreeing designations is a coin flip presented as an answer. And `USDT 100` read
as `USD 100` would be a plausible number on an unsupported currency — the exact failure class this product
spends its rules avoiding.

## Consequences

- **Codes are case-insensitive.** Lowercase codes are written in the wild, and `usd` almost never appears as a
  word.
- **One inaccuracy is accepted and recorded:** `$12.50 BUSD` still reads as dollars, because `BUSD` begins
  with none of our codes. Catching it needs a crypto ticker dictionary the MVP does not have.
- **Everything else stays ordinary copying:** two sums, a sum without a designation, a range, a phrase
  containing a price.
- Multipliers (`тыс.`, `млн`, `K`, `M`) scale the number and may stand on either side of it; a multiplier does
  not by itself make a selection inexact.

Full reasoning: `PLAN.ru.md` §12.1, §12.3, §12.4; `AUDIT.ru.md` Б12.
