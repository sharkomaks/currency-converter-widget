# Two static manifests, two Vite passes

Status: accepted

`vite` builds the extension twice: the content script as `iife` with a fixed file name, everything else as
`esm` plus html. The manifests are static files copied into the build — one for Chrome
(`background.service_worker`), one for Firefox (`background.scripts` plus
`browser_specific_settings.gecko.id`).

Why: MV3's background is genuinely different in the two engines and cannot be written in one file; MV3's CSP
forbids `eval` and `new Function`, so there is no runtime template compilation; and a content script cannot be
an ES module in MV3 without extra machinery.

## Considered options

- **WXT** — a framework that solves exactly this, but unknown tooling at MVP time. For a small extension the
  risk of an unfamiliar build outranks the tedium it removes.
- **Generating the manifest from code** — a second language for a file edited once in a while.

## Consequences

- **The two manifests will drift.** Only `background` and `browser_specific_settings` may differ; everything
  else is expected to match, and a test comparing all other keys is still outstanding (`AUDIT.ru.md` М7).
- **Plain TypeScript, one runtime dependency.** `big.js` and nothing else (`0001`).
- **`iife` is why the content script feels constrained**: no top-level `await`, no dynamic import. This is the
  price of not fighting the platform.
- **Firefox on a release channel needs an AMO-signed build** even for a friend: a temporary add-on lives only
  until restart, and an unsigned `.xpi` does not install at all (`AUDIT.ru.md` Р9).

Full reasoning: `PLAN.ru.md` §15.
