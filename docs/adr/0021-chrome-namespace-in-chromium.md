# Chromium uses `chrome`; Firefox uses `browser`

Status: accepted (2026-11-13)

Chrome 148+ exposes a `browser` namespace alongside `chrome`. For a while both were available in
Chromium: `browser.runtime.id`, `browser.storage`, and the promise-based methods our code relies on all
existed. The extension picked `browser` whenever `runtime.id` was present, because that was originally the
Firefox detector.

That detector was wrong. In Chrome 157 the content script selected the `browser` alias and stopped before
the overlay was created: selecting an amount on a page produced nothing, with no error shown to the person.
The popup still worked, and every automated test still passed — the bundled Chromium used for tests did not
have the alias. The failure was invisible in the place the tests looked.

The decision: `extensionApi()` returns **`chrome`** unless the Firefox-only
`browser.runtime.getBrowserInfo` exists (and `browser.storage` is present); then it returns `browser`.
There is no user-agent sniffing and no feature-by-feature fallback.

Why this shape:

- **Firefox needs the promise-based `browser` namespace.** Its `chrome` namespace is not the contract this
  code is written against; `browser` is.
- **Chromium's MV3 `chrome` namespace is already promise-based** for `storage`, `runtime`, and `tabs`, so
  the Firefox path is the only one that needs a different object.
- **`runtime.id` is not a browser detector.** Chrome 148+ made it true in Chromium too.
- **`runtime.getBrowserInfo` is Firefox-only** and is stable; that is the one discriminator used.

## Consequences

- Chrome and Firefox each run on the namespace they actually support; no polyfill, no dual-callback layer.
- A test that only runs in the bundled Chromium cannot prove this boundary. The extension was re-checked in
  installed Chrome 157 via the CDP `Extensions.loadUnpacked` path after this change.
- Do not "simplify" this back to `browser ?? chrome` or `runtime.id` detection. It will pass the bundled
  tests and break the browser the product is used in.
- The font `@font-face` injection in the content shadow is guarded separately: a font failure must not
  prevent the overlay from existing.

Full reasoning: this ADR, the regression it records; `PLAN.ru.md` §6; the `src/shared/webext.ts` boundary.
