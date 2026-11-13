# Price Lens

Select an amount with a currency indicator on any page — `$12.50`, `14,50 €`, `¥1 500` — and a small
window beside it shows the same amount in your own currency. A toolbar app holds the manual converter for
amounts with no indicator.

Chrome and Firefox, Manifest V3, plain TypeScript with no framework. The design corpus is `PLAN.ru.md`
(Part I is the plan), `AUDIT.ru.md` and `docs/adr/`; the domain vocabulary is `CONTEXT.md`.

## Install (for friends)

You need [bun](https://bun.sh) to build. Then:

```bash
bun install
bun run build
```

The build writes two ready folders: `dist/chrome` and `dist/firefox`. The toolbar icon is a gold dollar sign
tilted on the blue frame.

**Chrome** — two minutes:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and pick `dist/chrome`.

**Firefox** — temporary add-on:

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`.

Honest limitation: a temporary add-on disappears when Firefox restarts, and a release Firefox will not
install an unsigned `.xpi`. Signing goes through AMO; that is the publication stage, not this MVP. For
day-to-day use, Chrome or Firefox Developer Edition is the practical path.

## Use

- On a page, highlight **just the amount** (`$12.50`), not the sentence. The window appears automatically;
  a phrase with a price inside stays ordinary copying.
- The window shows only the result. A change of target currency closes it — change the currency in the app
  or in settings, then select again.
- The toolbar app converts a typed amount with two fields and two currency pickers. `12,50` and `12.50` both
  mean twelve and a half, for every currency; `1.234` means 1234. The chosen pair is remembered for the
  browser session; after a browser restart it returns to the default target.
- The fields and the pickers lead with the narrow currency symbol (`₽`, `$`, `Bs`) and the ISO code; there
  are no flags, because Windows does not render regional emoji.
- Settings: language, extension theme, overlay theme, target currency, distance from the selection.
  **How to use** replays the two-screen onboarding and its live scene. Settings and onboarding open
  **inside the same popup** — there are no separate settings or onboarding tabs.

## Development

```bash
bun install
bun run lint       # oxlint
bun run fmt        # oxfmt
bun test           # bun test
bun run typecheck  # tsc --noEmit
bun run build      # lint + tests + two Vite passes + dist folders
```

### If the window does not appear

Open the toolbar app → gear → the pulse icon (**Diagnostics**); the **?** next to it opens **How to use**.
The diagnostics view says whether the content script is running on the current tab and prints what it saw:
the raw selection, the parser's answer, the anchor, the placement and the rate result. **Copy report** puts
the whole text on the clipboard.

Status `The page did not answer` means the script never ran there: browser pages, the extension stores,
PDF and `file://` are closed to content scripts, Chrome may have site access set to **On click** (check
`chrome://extensions` → Details → Site access), or the page was not reloaded after the extension was
reloaded. Status `…has not seen a selection` means the script is alive but `selectionchange` did not fire
for the selection. The event log shows a rejected parse together with the exact text it received.

The UI font is Roboto, committed as two local woff2 files in `public/fonts` — there is no request to Google
Fonts and no runtime fetch. Rates come from [Frankfurter v2](https://frankfurter.dev), one request per pair, reused for six hours
inside the browser session and never written to disk. The currency list is a module (`src/shared/currencies.ts`),
not a network call.

## Privacy

Three promises, and they are the future policy too:

1. **Only currency pairs leave the tab.** No selected text, no page addresses, no history.
2. **No analytics**, no telemetry, no accounts.
3. **No remote code.** Everything runs from the packaged extension.

Permissions in the manifest are only `storage` and `https://api.frankfurter.dev/*`.
