# Separator arbitration counts digits, not the currency

Status: accepted

How the separators of an amount expression are read is decided by the shape of the number, in three lines:
both separators present — the rightmost is the decimal one; a separator that repeats is a thousands
separator; a lone separator is a thousands separator only when exactly three digits follow it.

Why: a thousands group is always exactly three digits in both conventions this product reads, so `€12.50`
cannot be a grouping under any rule — yet the currency table (Round 6) read it as 1250, silently and ×100,
on the commonest way an English page writes euros. On well-formed numbers the digit rule and the currency
table agree; they differ only on malformed input, and there the digit rule guesses right.

This reverses the user's own Round 6 decision, at his word on 2026-11-08 (closing Р2): «лучше счёт цифр».
The digit rule had been the first recommendation of that round, then set aside twice — first for "the
rightmost separator is always decimal", which misread `1.234 ₽` a thousandfold, then for the currency
table, which misread `€12.50` a hundredfold. The history is why the rule looks the way it does.

## Known cost

A currency with three minor units (`KWD`, `BHD`) writes `1.234` as one-and-234-thousandths; the rule reads
1234. No such currency has an indicator in the list (the five indicators carry 2, 2, 2, 0, 2 digits), so a
fourth line is reserved, not written.

Full reasoning: `PLAN.ru.md` §12.2 and Round 6; `AUDIT.ru.md` Р2.
