# The parser reads the selection text, plus the page language

Status: accepted

The parser's input is `selection.toString()` and exactly one fact about the page — its declared language. No
markup, no attributes, no styles, no sampling of what is painted.

Why: the currency of a number is written in the text the person can see and copy. Reading the DOM would make
the result depend on how each site structures prices, and would break on the first shop that renders money in
spans or pseudo-elements — a class of failure with no visible clue.

## Consequences

- **The page language is a second input** only because `¥` is two currencies (`0012`). Tests must pass it
  explicitly; a test that omits it is not testing the same function the product runs.
- **Normalization is one regex**, not a list of wrappers: everything except letters, digits, whitespace, dot,
  comma and the five indicator symbols is deleted, so quotes, brackets, dashes and ellipses stop being special
  cases. A trailing dot or comma (`$12.50.`) is trimmed afterwards — the regex cannot know it belongs to no
  number.
- **A range is rejected before the dash is stripped**: a digit touching a dash on both sides — `12.50–13.00`,
  `1 234 — 1 500` — makes the whole selection ordinary copying. Any other dash is just punctuation.
- **Separator reading is out of scope here.** Which of a dot and a comma is decimal is `Number convention` in
  `CONTEXT.md` and §12.2 of the plan; a change to it is pending in `ANSWER.ru.md`.
- **Iframes are out of MVP**, but the content script stays frame-agnostic: nothing in the parser assumes it
  owns the top frame.

Full reasoning: `PLAN.ru.md` §12, §2.
