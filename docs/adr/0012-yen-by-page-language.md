# A yen sign is resolved by the page language, defaulting to CNY

Status: accepted

`¥` and full-width `￥` mean CNY when the page declares `zh*`, JPY when it declares `ja*`, and **CNY** when the
page declares nothing. The user's decision: «¥ — дефолт китай».

Why: one sign, two currencies, and the difference is about twentyfold — `¥199` is roughly $28 in yuan and
roughly $1.3 in yen. The page's declared language is the only statement about the page that tells the truth
about its currency, and it costs one property read (`documentElement.lang`).

## Consequences

- **The error did not disappear; it changed sides.** Before this decision Chinese prices were misread on
  Chinese pages; now a Japanese price on a page without `lang` under-reports about twentyfold. That case
  exists (an English article quoting Japanese prices) and is written down so a later bug hunt starts here
  rather than in the parser.
- **The parser takes two inputs** — the selection text and the page language (`0010`). Tests must pass both.
- **Codes are the reliable route:** `JPY` and `CNY` always work without guessing, and both currencies are in
  our list.
- **The alternative was silence** for a page that declares nothing; it was on the table, priced, and rejected
  in favour of the Chinese default.
- **The full-width `￥` needed a fix in the noise regex.** The parser's normalization kept `¥` but not `￥`, so
  `￥1 500` was stripped to `1 500` and the selection was rejected. The character is now in the class and in
  criterion 17's test table (contradiction П6).

Full reasoning: `PLAN.ru.md` §12.1, registry row 37; `AUDIT.ru.md` Р1.
