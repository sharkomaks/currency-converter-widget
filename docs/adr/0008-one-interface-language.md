# One interface language, from the setting

Status: accepted

`lang` in storage is the only source of interface language for every surface — labels, currency names, sort
order, search index, number formats — with one entry point, `shared/i18n.ts`. The browser's language supplies
its first value once, at onboarding, and is never read again. Every `Intl` call receives its locale
explicitly.

Why: `chrome.i18n.getMessage` reads the browser's language and cannot see our setting; and it is not one call
but a class of defaults — `localeCompare()` without an argument, `new Intl.Collator()`, `new Intl.DisplayNames()`,
`new Intl.PluralRules()`, `toLocaleString()` — all silently fall back to the browser. The failure has no error
in it: you get a list in the wrong order, sorted by an alphabet its labels are not written in.

## Consequences

- **Dictionaries are imported at build time**, one module per language, chosen by the setting. No runtime
  fetch, no `_locales` lookup at runtime.
- **Message keys in the JSON are ASCII `[A-Za-z0-9_]` only.** Chrome validates them and refuses to load the
  extension when a key contains a dot. The dictionaries therefore use `settings_title`, while code keeps
  `t('settings.title')` and the lookup maps dots to underscores. A build test checks the charset as well as
  key parity.
- **A change of `lang` is not a label swap** — it rebuilds a picker's names, order and search index.
- **`lang` on our own `<html>`** follows the setting, not the browser.
- **The store listing is not our surface**: the browser substitutes `__MSG_` and translates it into *its* own
  language. That is the one place our law does not reach, and it is out of scope.
- Keys missing from a dictionary surface as their own name and fail a build check, so a missing translation
  is loud rather than silently English.

Full reasoning: `PLAN.ru.md` §14; `AUDIT.ru.md` С11.
