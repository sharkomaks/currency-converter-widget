# Handoff — Price Lens design interview

Written 2026-11-06. Read this first, then the artifacts below. Do **not** re-litigate decisions
already recorded in them.

## What this session is

A **design interview**, not an implementation task. The user is designing a Chrome + Firefox
browser extension from an empty repo, and is being grilled one decision at a time. The only code so far is
`src/shared/currencies.ts` (the currency list), written at the user's request mid-interview. Implementation
proper starts only after the interview closes.

Product in one line: select an amount in page text (e.g. `$12.50`), and a small overlay appears
above it showing the value in the user's own currency.

## Artifacts (the state lives here — do not duplicate it)

- `PLAN.ru.md` — **the plan, in Russian** (the name is the user's; the file used to be `grill.ru.md`).
  Two parts: **I. План** (sections 1–17: decisions with round references, surfaces, storage shapes, flows,
  parser spec, theme algorithm, i18n, build layout, milestones, acceptance criteria) — what actually gets
  built; **II. Протокол** (section 0 and rounds 1–14а — the history, including recommendations the user
  overruled). Part I wins on any conflict. Open questions appear as `Открыто (код)` callouts inside the
  plan section they break.
- `AUDIT.ru.md` — **the audit of that plan, in Russian**, sections 18–26 carrying on the plan's numbering:
  method (§18), the 46-finding status table with 12 blocking (§19), findings grouped Б/С/Р/П/М (§20–24),
  what was checked and found sound (§25), and the closing order (§26). The codes in its findings are the
  same codes the plan's callouts use, so a callout and a finding can be matched by code alone. It was split
  out of `PLAN.ru.md` on the user's instruction, after an earlier pass had everything in one file — closing a
  finding still means editing the plan and flipping the status in `AUDIT.ru.md` §19.
- `ANSWER.ru.md` — the answer slot: exactly one open question plus an empty «Ваш ответ» line. The user
  writes there. After folding the answer into `PLAN.ru.md` (and flipping the status in `AUDIT.ru.md`),
  overwrite the whole file with the next question — never append, never leave two questions in it.
- `CONTEXT.md` — the domain glossary (English, deliberately narrow). Rules: only project-specific
  terms, one or two sentences, `_Avoid_` lists rejected synonyms. It is a glossary and nothing
  else — no specs, no implementation notes.
- `src/shared/currencies.ts` — **the first source file**: `CURRENCY_FLAGS`, a `Record<string, string>` of
  159 currency codes to flag emoji, whose keys *are* the supported list, plus `CURRENCY_CODES`,
  `isSupported`, `flagOf`. No symbols in it — those come from `Intl.NumberFormat`. Never regenerate it from
  memory of ISO tables: the codes were taken from a live `/v2/currencies` call, and the 22 exclusions
  (16 crypto, 4 metals, `CMD`, `XDR`) were decided in `PLAN.ru.md` §8.
- `docs/adr/` — **16 decisions, one file each**, English, at most a screen long, each ending with the plan
  section and audit codes it came from. `docs/adr/README.md` is the index. They restate *that* a decision was
  made and *why*, never the whole argument — the argument stays in the Russian files. Read the index before
  proposing anything: several ADRs carry an explicit "do not reintroduce X" line, because X was offered and
  refused. `0016` is the only `proposed` one: the decision is settled, its rationale is still owed.

Read Part I of `PLAN.ru.md` before touching the design, `AUDIT.ru.md` §19 before claiming anything is
settled, `docs/adr/README.md` before questioning an approach, and the last rounds of `PLAN.ru.md` Part II before
asking anything, so settled questions are not re-asked. If a file must be renamed again, note that the terminal is dead — the only way is a full rewrite
through read/write, which costs a lot.

## How this user wants to be grilled (learned, not assumed)

- **Answers go in the Russian file; chat stays English and short.** The user asked for this
  explicitly: substance in `PLAN.ru.md`, brief English in chat. Since the file split he answers in
  `ANSWER.ru.md`: one question sits there, I read it, apply it, then wipe the file and put the next
  question in it. **He also answers in chat, and still expects the file to move the same turn.** A turn that
  edits `PLAN.ru.md` but leaves `ANSWER.ru.md` untouched has already been read as "я говорю и ничего не
  меняется". So every turn: two or three lines at the top of `ANSWER.ru.md` saying what was just recorded and
  where, then the live question, then the empty `**Ваш ответ:**`.
- **One question at a time**, always with a recommendation **and** the alternative, so the user can
  override. They override often, and twice their override was better than the recommendation (see
  the Round 10 tie-break and the Round 11б scene).
- **Look facts up; never ask what you can verify.** Provider docs and MDN's MV3 divergence were
  checked in-session. One earlier assertion (`background.service_worker` valid in both browsers)
  was wrong and had to be retracted in-file — verify before asserting.
- **Do not decide for the user.** When an answer covers only part of a question, log the missing
  part as **undecided**, never as "no". This already happened with word-currencies (map item 5а).
- **Concede explicitly when the user is right**, and write down why. Two concessions are already
  recorded; the record is worth more than a defence.
- **No pick-list/button widgets.** An `AskUserQuestion` with options was cancelled early; ask in
  plain prose.

## Environment blockers

- **The terminal does not work.** The configured shell resolves to `C:\Program` and is not
  executable, so every shell command fails at process start. Use file tools only
  (Read/Grep/Glob/Search*) for lookups, and never imply a command was run.
- The workspace contains only `.idea/`, the markdown files, and one source file
  (`src/shared/currencies.ts`). No `package.json`, no `tsconfig.json`, no git repo — so nothing there is
  type-checked by a build yet; WebStorm reports no problems on that file.
- The project uses **bun** (per the user); Node 24.21.0 / npm 11.19.0 exist per IDE metadata.
- Writes are restricted to this workspace — do not try to write into the OS temp directory.

## Immediate next step

**The decisions are now in `docs/adr/` — 16 files plus an index — so a restart does not have to re-derive
anything.** That was the last thing done: the settled decisions were lifted out of the Russian corpus into one
English page each, linking back to the section and the audit codes instead of copying them. Nothing in
`PLAN.ru.md` or `AUDIT.ru.md` was removed; the ADRs are the "why", those two are the "what" and the "how sure
we are". `CONTEXT.md` was corrected in the same pass — `Minor units` and `Rounding` still described integer
arithmetic in minor units, which contradicts `big.js` in §7; they now match, and `Overlay` carries the
showcase rule.

**A new contradiction came out of that sweep: П6 — found and closed.** §12.1 accepts the full-width `￥`
alongside `¥` (the Р1 decision), but the noise regex in §12.3 — `/[^\p{L}\p{N}\s.,$€£¥₽]/gu` — did not keep
that character, so `￥1 500` was stripped to `1 500`, lost its indicator and was rejected outright. The user
was told it would be fixed next turn; he moved on without objecting, so it was applied as the enforcement of a
decision he already made, not as a new one: `￥` is in the class, criterion 17 has a `￥1 500` row, П6 is closed.
If asked, that is the framing — not "I changed the parser spec on my own".

**The interview is closed: the plan is `PLAN.ru.md`, its audit is `AUDIT.ru.md`.** Nothing else is a source
of truth.

**Vocabulary (settled by the user, do not re-argue):** «попап» is the **on-page answer window**; «приложение»
(«extension») is the **toolbar surface** with the manual converter. The documents were swept to match: §1 now
opens with both words, §8 is titled «Приложение», and `CONTEXT.md` carries the Russian name inside each
entry plus a warning that the English `Popup` and the Russian «попап» are **different** surfaces — in the
manifest `action.default_popup` is the toolbar one. Part II of `PLAN.ru.md` still says «оверлей»/«окно» in
old rounds; §1 states that those are the same thing as «попап», not a third surface.

**The overlay-recompute fork is settled — my proposal was rejected.** I suggested recomputing an open overlay
when the target currency changes; the user's answer was "нет / верная логика поменял валюту, выделяй заново
или считай в основном приложении". So the original rule stands and is now stated as a product principle in
§11 of `PLAN.ru.md` (row 35 of the registry): **the in-page overlay is a showcase, not a work surface —
changing a currency is work, and work happens in the app.** My two supporting arguments survive only as
consequences, not as the reason. What is also written down explicitly, because the user's real question was
about reloading: there is no reload anywhere — the popup writes the key, the content script drops its
snapshot on `storage.onChanged`, and the **next** selection in the same tab uses the new target immediately;
only the already-open overlay closes. Do not reintroduce recompute-in-place or an overlay-side currency picker
without asking again.

**Р5 is closed, and the rate cache left the disk.** The user's words: «я бы это вообще убрал, оставить только
кэш в нашей сессии и всё, сессия закончилась — новый запрос, мне кажется это логично и проще». Applied to
§7, §10, §11 and §17 of `PLAN.ru.md`, to Р5 and С7 in `AUDIT.ru.md`, and recorded as ADR
`docs/adr/0017-rate-cache-dies-with-the-session.md`. Two things went at once: the **age marker** (and with it
the «старый курс» state — the overlay is down to skeleton / number / error) and the **rate on disk**.

One fact decided the shape, and it is not a preference: a variable in the service worker is **not** a session
cache — MV3 unloads the worker after a short idle, so the cache would die every half minute and each selection
would fetch again. `storage.session` is the thing that means «наша сессия»: memory, survives worker unloading
and tab closing, cleared when the browser stops or the extension is disabled/updated, 10 MB, not visible to
content scripts by default (Chrome 102+, Firefox 115+, verified on MDN). So `storage.local` now appears
nowhere in the product: `sync` for settings, `session` for rates. С7 (the cache grew forever) is closed rather
than mitigated. Honest cost, written in two sections: **after a browser restart the first selection always
hits the network**, and the offline scenario is gone — on a plane the user sees «нет подключения» and a
button instead of yesterday's number with a marker.

**Р5а is closed — the window is six hours, and the number was derived after the user delegated it.** His
turn: «сколько живёт курс внутри сессии — лимит точно нужен, вдруг кто-то будет пользоваться, кто будет
неделю ничего не закрывать, нужно сделать чтобы кэш протухал, а время не знаю сколько, как ты посчитаешь
такое и ставь». So the *limit* is his decision and the *duration* is mine, and it is arithmetic rather than
taste: publications arrive once per business day, so a window `W` costs `24 / W` requests per pair per day and
spends `W² / 48` hours per day showing a number older than the published one (a publication lands inside the
window with probability `W / 24`, and then half the window is stale on average — savings linear, staleness
quadratic). A target of «under an hour a day on the old number» gives `W ≤ 6.9`, so **6 hours**: four
requests per pair per day against a 20-per-10-minutes ceiling. Condition is `now - fetchedAt < 6 h`, identical
inside the session and across its edge; an older record is not served (it is not deleted either), and there is
still no «stale but shown» path. Weekends are an accepted waste — no publication, so four re-fetches return
Friday's number — and no calendar is added for that. Written to `PLAN.ru.md` §7 (block + table), §10 (three
fields, three roles), criterion 19 and registry row 9; `AUDIT.ru.md` Р5а closed; ADR 0017 and the glossary's
`Freshness window` updated. Two stale lines were fixed in passing: `AUDIT.ru.md` §25 still said rates live in
`local`.

**Refresh is per record, and that is a consequence, not an oversight** (the user asked directly: several
cached currencies — one refresh or one per record?). Each record carries its own `fetchedAt`, so nothing
«expires the cache»: one pair ages out, and only a later selection of *that* pair sends a request — no timer,
no background refresh, so an expired record costs nothing while it sits. N pairs in a session = N requests;
six hours later the same N again. A single request for the whole store is impossible by construction (a
`fetchedAt` per record). Batching exists and would *not* break the multiply-only law —
`GET /v2/latest?base=USD` returns a base table and `USD → EUR` is a cell read, not a quotient — but it brings
159 rows per request to save one or two requests per session against a 20-per-10-min ceiling, and it turns the
record from «a rate» into «a table of rates» (key and `RateSource` contract both change). Written into §7 and
into §25 of the audit as verified-sound rather than as a finding.

**Where the live question is right now: Р2, the separator rule — and my round-6 recommendation has turned out
to be the weaker one.** `ANSWER.ru.md` currently asks it. §12.2 says the currency is the arbiter for a single
separator, so for `€ ₽ RUB EUR` a dot means thousands: `€12.50` → 1250, `€1.5` → 15, `$12,50` → 1250. But a
thousands group is *always exactly three digits* in every convention we care about, so `12.50` cannot be a
grouping at all — the table guesses wrong precisely on the commonest way to write euros on an English page,
and always by a factor of a hundred. What is now recommended: **count the digits, not the currency** — a
separator is thousands when exactly three digits follow it up to the next separator or the end; two or more
identical separators are grouping separators regardless of group width (this is what keeps Indian
`1,00,000`); otherwise the single separator is decimal. That fixes `€12.50` → 12.50, `€1.5` → 1.5, `$12,50` →
12.50, `$1.234` → 1234 and leaves `€1.234` → 1234, `$1,234` → 1234, `1.234,56` → 1234.56 alone. It revises a
closed round-6 decision, which is why it is a question and not an edit. Known ceiling of the new rule: a
currency with three minor units (`KWD`, `BHD`) would break it (`1.234` dinars read as 1234); today's indicator
set has `2/2/2/0/2` decimals, so this is a note in §12.2 rather than a cost. Alternative on the table: keep
the table and record both cases as accepted errors. **Do not apply either before the answer.**

**Р1 is closed, and a product decision came with it.** The user said "`¥` — дефолт китай": `¥`/`￥` resolve by
the page's declared language (`zh*` → CNY, `ja*` → JPY), and **CNY when the page declares nothing**. Recorded
honestly in §12.1: the error did not disappear, it changed sides — a Japanese price `¥1 500` on a page without
`lang` now under-reports ~20×. The parser takes a second input (page language); tests must pass it.

**New setting, from the same message: a currency flag in the overlay.** `showFlag: boolean`, default off, in
`storage.sync`; the number is still printed by one `Intl.NumberFormat` and the flag is a separate element after
it (`margin-left`, never a space inside the string), taken from `flagOf(target)` — the same module the picker
uses; `XAF`/`XOF`/`XCD` get the globe; no flag in the app, where the picker already names the currency. Two of
those rules are mine and marked vetoable (default off; nothing in the app). Р7 now bites on the product's main
surface: on Windows the flag renders as `US`, so the setting carries an explanation next to it.

**Б12 is closed** — the last blocking finding. The user approved the four-block example table ("да мне все
нравится"), including my two self-added refinements: codes are case-insensitive, and a "half-code" (`USDT` =
`USD` + letter) counts as a foreign ticker and rejects the selection, with the residual `$12.50 BUSD`
inaccuracy recorded. Applies as §12.1 of `PLAN.ru.md` (three rules + example table), registry row 36 and
criterion 17. **All 12 blocking findings Б1–Б12 are now closed**; §26 of `AUDIT.ru.md` was rewritten to point
at Р1/Р2/Р7/Р4 next, then С2–С9, then the text fixes.

**Б11 is closed — as a session-lived state, not an observer.** The user's words: "да как глобальное состояние
которое живет пока сессия активна, и в него складываем все нужное". Two of my earlier versions of that
answer were wrong and the record says so: "subscribe and recompute" was too heavy; "re-read on every overlay
open" violated the ordering constraint the user himself spotted (the overlay theme must be known before the
first paint, `storage.get` is async, so a read in the hot path buys a flash or a skeleton on the product's most
frequent event). What is now in §6: one state per tab holding the settings snapshot, a `dirty` flag, the
current selection (currency, amount, anchor rect) and the overlay phase; **no rate** — the rate lives in the
background and in `storage.session`, and a second cache would mean a second owner of freshness. `storage.onChanged`
(area `sync`) only marks the snapshot dirty — in Firefox it arrives with all keys of the area and sometimes with
no change at all (bug 1833153), so it must not be interpreted; re-reads happen on the next open and on
`visibilitychange`. With an overlay open: theme/gap repaint, **target currency closes it**, language does
nothing. Also recorded: there is no cross-surface global state — content script, popup and settings page are
three contexts with three snapshots, sharing only storage. Honest hole in writing: if neither the event nor the
visibility return arrives, the snapshot stays stale until the page reloads.

**The provider now sits behind one method — the user asked for an abstraction "вдруг её нужно будет поменять",
and it is applied as a narrow seam, not a layer.** Contract: `RateSource { name; fetchRate(from, to, signal)
→ RateResult }`, where `RateResult` is either `{ ok: true; rate: string; rateDate: string }` (a decimal
string, never a number) or `{ ok: false; kind: ErrorKind; status?: number }`. Four rules make it a boundary:
the adapter (`background/sources/frankfurter.ts`) owns URL, JSON field names, status codes and the mapping
to our six error classes; the rate crosses as a **string**; no cache, rate ceiling, backoff or pair direction
inside the adapter — `rate.ts` owns all of those; the choice is one constant `const source: RateSource =
frankfurter`.

**This changed storage too:** `storage.session` now keeps `{ value: string, rateDate: string, fetchedAt: number }`,
not `value: number`, and §7's pipeline reads `new Big(rateText)` with no `String()` conversion. That was a
hole in the `Big.strict` rule found while wiring the seam — do not reintroduce a numeric rate anywhere.

**Be honest about what the seam does not promise.** A different provider may only offer base→all-currencies
tables, a different rate date, different weekend behaviour, different statuses; if it cannot be expressed by
those two types, the *contract* changes, not just the file. And the manifest is outside the seam:
`host_permissions` carries the provider address twice. Net claim: three places know about a swap (adapter,
constant, manifest). Its bigger payoff is testability — a fake `RateSource` that throws, returns `404`, or
returns `200` without a field drives all six error classes without network. Registry row 33, criterion 15,
and the §15 structure (`background/sources/frankfurter.ts`) record it.

**Б10 is closed on the user's word "ошибки должны быть информативными" — and that was wider than my
recommendation.** I proposed three error classes with a retry on all of them; what landed is **six classes**
and three parts per message: what happened (short title), with which pair and why (detail including the
HTTP status), what to do (a button that actually helps). Classes: no network, 8 s timeout, `429`, `5xx`,
other `4xx`, and `2xx` without `rate`. Two consequences worth keeping: a `4xx` has **no retry button**
(replaced by "другая валюта" → settings), because a false button is worse than none; and the status code is
shown to the person in the detail line, since it is the only fact that cannot be paraphrased into sympathy.
The 8 s timer is started by the overlay, and the retry always bypasses the cache. Same rule was applied to
the app's invalid input ("это диапазон, а не сумма" instead of "невалидное значение") and to a stale cache
(number stays, with a line saying why it could not be refreshed). Registry row 32, §11, §8, criterion 5 and
§6's callout were updated in the same pass; С9 stays open but is no longer invisible.

**С12 and С13 are closed: `big.js` is the only dependency, and `dinero.js` is out.** The user's words:
"да супер берем только big.js". Do not re-litigate either — the two questions were "does a library do the
arithmetic" (yes) and "which one" (`big.js`). What replaced the Dinero pipeline in §7 is one line with
three conditions: `new Big(amountText).times(new Big(String(rate))).toFixed(digitsFromIntl)`. Both operands
enter as **strings**, enforced by `Big.strict = true` which makes the constructor throw on a `number`;
`String(rate)` is the shortest exact decimal round-trip; digits come from
`Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` (`2`/`0`/`3`); rounding is
`Big.RM = Big.roundHalfUp`, set once at module load in `shared/money.ts`, and `Big.DP` is irrelevant because
nothing divides. Registry row 31, §15's dependency paragraph and criterion 14 were rewritten in the same
pass — criterion 14 now also demands that `new Big(0.1)` throws. Gone with Dinero: the bigint build,
`multiply`/`transformScale`, hand-built currency objects.

**Two objections of mine died on verification and must not be repeated:** `XCG` **is** in Dinero's
currency table (only `CNH`, `GGP`, `IMP`, `JEP` are non-ISO), and their own multilingual formatting guide
hands `toDecimal`'s value to `Intl.NumberFormat`. That finding is recorded in the closed С12 text so the
same wrong claim is not made a third time.

**Б9 is closed on the user's answer** ("всегда лучше умножать"): one formula, `result = amount ×
rate(source → target)`, `getRate` returns the normalised multiplier, division nowhere. His own observation —
that the product is usually a repeating decimal and therefore rounds — became the second half of the rule:
rounding is explicit, to the target currency's digits, half up, and the digit count comes from the same
`Intl.NumberFormat` that prints (so `2`/`0`/`3` for `USD`/`JPY`/`KWD`), not from a second table. Criterion 14
requires a `USD → JPY` / `JPY → USD` test that fails if a division appears. Provider support for the answer:
Frankfurter has **no** conversion endpoint ("There's no conversion endpoint. Fetch the rate and convert in a
few lines of code") and its own example does `amount * d.rate` — so his answer is not one of two equal
options, it is the only one the provider allows.

**Б8 is closed on the user's answer:** the MVP is for himself and friends, stores come afterwards as a **new
stage M6** (Chrome Web Store + AMO, rights justifications, privacy policy, screenshots). M5 therefore ends
with an unpacked folder in Chrome and a temporary add-on in Firefox, criterion 10 was rewritten to say so,
and §2 lists store publication under what is out. What is still done now because changing it later is
dearer: `gecko.id`, `version`, `default_locale`, name/description via `__MSG_`, icons — plus three promises
that must be true from the first line of code because they *are* the future policy: only currency pairs leave
the tab, no analytics, no remote code. The cost is risk **Р9**: on a release Firefox a friend cannot install
it at all — temporary add-ons die on restart, unsigned `.xpi` does not install, and only AMO signs, even for
self-distribution.

**Б7 is closed, and that one was my call, not his**: iframes are out of the MVP. `all_frames` is not set, so
the content script lives in the top document only; the cost is stated plainly — on sites whose prices sit in
embedded widgets the extension works half-way and stays silent. The code must never assume it is the top
frame (no `parent`/`top`, own `document`/`window`, anchor from the same document's `getBoundingClientRect`),
so turning frames on later is one manifest line. Closing Б7 also closed **П5** (criterion 1 now says
"http/https pages where the selection yields text; not obliged in PDF, `file://` or iframes") and **М3**.

**Б6 is closed on the user's answer, and again it overrode mine**: the scene is hardcoded, the sentence is
`The book costs 14,50 € today.` and the popup shows `16,10` US dollars (an `EUR → USD` pair around 1.1103).
No network in the scene at all. The scene is a **live component**, not a mock — embedded text, CSS-only
highlight, popup permanently on and always **above** the sentence, reading the real `gap` and theme — so only
the numbers are fixed. Two consequences worth remembering: the fixture is the *numbers* `14.5` and `16.1`,
never the string `$16,10`, because per §12.2 a comma after `$` means thousands — the popup prints through
`Intl.NumberFormat` (`16,10 $` in Russian, `$16.10` in English); and the scene shows dollars even when the
person chose tenge, covered by one footnote line under it. The glossary gained `Fixture` (a pre-set number
that is not a rate), which closes contradiction П1.

**Б5 is closed on the user's answer, and it overrode mine twice**: the popup has exactly two ready-made
themes, and the page's *declaration* selects one (`color-scheme` on `html`, then whole class/attribute
tokens on `html`, then `body`); nothing declared → the app theme. Painted `background-color` under the
selection is **not** consulted at all — that was my invented layer, and it answered "what is under the
number" rather than "what theme does the page have". Matching must be by whole token: `darkroom` and
`lightbox` are not themes. The cost is filed as risk **Р8**: a page with a dark background and no declaration
gets the app theme, i.e. a light popup on a dark site — the very case the split was introduced for.

**The picker changed shape mid-interview, on a screenshot the user brought.** His `example/` PNG shows a
search field on top and rows of *flag · ISO code · currency name*. That overturns the earlier "no names"
decision: names must come from `Intl.DisplayNames(lang, { type: 'currency', style: 'long' })`, never from a
dictionary, and sorting must use `Intl.Collator(lang).compare` — a bare `localeCompare()` sorts by the
browser's language, not by our `lang` setting, which is the kind of bug nobody reports. Search matches code,
name, and prefixes of either; the amount itself still prints only the symbol.

**Interface language is one setting, and the plans must not sound like they have exceptions.** The browser
language is read exactly once, at onboarding, to seed `lang`. After that, no surface, no picker, no overlay and
no background script reads it — not via `navigator.language`, and not via the silent defaults either:
`localeCompare()` with no argument, `new Intl.Collator()`, `new Intl.DisplayNames()`, `new Intl.PluralRules()`,
`toLocaleString()` all fall back to the browser's language. `shared/i18n.ts` is the only source of a locale; we
say so once, in `PLAN.ru.md` §14, registry row 26, glossary `Interface language`, acceptance criterion 12 and
closed finding С11 — instead of re-explaining it next to each sort or label, which is what read as hedging.
The one place the browser still picks a language is the store card, translated from `__MSG_` by the browser
itself; it is not our surface.

The next step is **not another design round**: it is answering the **12 blocking items (Б1–Б12)** — small
individually, but each one forces a programmer to guess. Ten are now closed (Б1–Б10); the remaining ones
(Б11 live settings updates, Б12 mixed indicators and `USD` inside `USDT`)
need nothing but a yes/no. Fix them in place: edit the plan section, remove its `Открыто` callout, flip
the status in the `AUDIT.ru.md` §19 table. Then the substantial ones (С1–С13 — С1, С10, С11, С12 and С13
are already closed), the five document
contradictions (П1–П5), and only then the hygiene list. The Round 2 ADR is still owed and still needs the
user's own rationale.

**13а — a theme split the user proposed himself, and it is better than what it replaced.** Round 13 kept
merging two questions — "how do *our* pages look" and "how does a window on *someone else's* page
look" — and his own example exposed it: he likes dark, sets dark, opens a light site, and gets a dark
blot. So there are now two settings:

| Setting | Describes | Values | Default |
| --- | --- | --- | --- |
| Extension theme | settings, popup, onboarding | `light`, `dark` | browser value, dark fallback |
| Overlay theme | the window on a host page | `light`, `dark`, `auto` | `auto` |

`auto` takes the **page's** tone, not the system's: walk up from the selection to the first opaque
`background-color`, compute luminance, threshold it — and give the overlay the **same** tone (light page
→ light overlay). The user explicitly rejected the contrasting scheme ("окно повторяет тон страницы, а не
спорит с ним"): separation comes from a shadow and a 1px border, not from colour. Mandatory consequences:
the overlay background is **opaque** (never translucent over an unknown page), and it always carries a
shadow plus hairline border so a light card on a light page still reads. The overlay theme stays **out of
onboarding** — a `?` with a hover explanation instead (`aria-describedby`, not a native `title`). Glossary
now carries `Extension theme`, `Overlay theme`, `Page tone`.

Only one thing was unresolved in 13а: what to show when the page tone cannot be determined. **The user
chose the extension theme** — not the system's `prefers-color-scheme`, which I had recommended. His
reasoning beats mine: a system setting is a signal the person may not know about and which can
contradict the choice they made in our settings, whereas the extension theme is a choice they made
themselves. So `auto` is now a total function: read the page; if the page cannot be read (image,
gradient, video background, cross-origin iframe, closed shadow root), fall back to the extension theme.
Accepted side effect: on unreadable pages a dark-extension user gets a dark overlay on a light site —
exactly what the whole split was meant to avoid, limited to the cases where the colour is physically
unobservable.

**14 — closed.** Settings live in `storage.sync` (language, extension theme, overlay theme, target
currency, gap); rates stay in `storage.local` because they are a cache, not a setting. Three consequences
recorded in-file that will otherwise be missed during implementation:

1. `storage.sync` has a **write-rate** quota (1800/hour, 120/minute), not just a size quota — a gap slider
   dragged emits dozens of writes per second. Persist the gap on slider release or behind a few-hundred-ms
   debounce, never on every `input` event.
2. Deciding whether to show onboarding requires an **async** storage read. Render nothing (or the chrome,
   not the content) until that read resolves, or the person sees onboarding flash and get replaced.
3. If the person is not signed into the browser, `storage.sync` behaves like local storage. Not an error,
   and not worth a message in the UI.

**14а — closed.** Gap is 0–20px, step 1, default 4, slider plus the number, identical in settings and in
the onboarding scene. The user cut my proposed 32 down to 20; his reason is worth keeping — at 32 the window
visibly detaches from the selection, so the slider would promise behaviour the product does not have.

**5а — closed.** Currency words are **out of MVP**: `100 рублей` is plain text to the parser. Recorded as a
decision, not an oversight. State the cost plainly if it resurfaces — a Russian article writing
`100 рублей` yields nothing, and that reads as "the extension is broken" in the very language the UI is
translated into. Mitigation: `100 ₽` / `100 RUB` is usually nearby, and the popup converter handles amounts
with no indicator at all. Reversing it is one row in a stem table plus one test — no architectural change.

- **12 — closed.** One JSON per language, `_locales/ru/messages.json` / `_locales/en/messages.json`
  (the user's "как все"). The user's model, confirmed explicitly: the browser language is read **once**
  at onboarding, written into our settings, and runtime reads **only** our setting — the browser is
  never consulted again. Consequence: `chrome.i18n.getMessage` is not used at all (it reads the
  browser's UI language and cannot see a setting), and there is no runtime `fetch` either — both
  dictionaries are **statically imported at build time** and chosen by our setting. Do not reintroduce
  `fetch(runtime.getURL(...))`: a content script runs in the page's origin, so that path would drag in
  `web_accessible_resources` for no gain.
- **12б — closed, the user's own answer.** `Intl.NumberFormat(нашЯзык, { style: 'currency', currency:
  нашаВалюта })` and nothing else: one cached formatter per language+currency, separators per interface
  language, decimal digits per currency (`JPY` → 0), symbol placement per language. Map item 15 (a setting
  for decimal places) is retired — the currency decides. An earlier edit wrongly recorded this as my
  decision after misreading "напиши в файл свой ответ"; that is now corrected in both files, and the user
  then confirmed the choice himself. Keep the authorship honest: this one is his.

## Owed before implementation

- **One rationale, for ADR `0016`.** The user rejected every gate on automatic triggering ("100% automatic"),
  which is a deliberate departure from the obvious path and deserves a record. `docs/adr/0016-automatic-
  overlay-no-trigger.md` is written and marked `proposed`; it is blocked on one thing: **the user's own
  rationale.** Do not invent it. He has now been asked twice in plain prose and answered neither time, so do not
  ask a third identical question — the ADR already offers three candidate rationales (zero learning cost / a
  confidence gate fails silently / value must arrive before any setup). Let him pick one, combine them, or
  correct them, then flip the status to `accepted` and the row in `docs/adr/README.md`.
- ADR format: `docs/adr/` with sequential numbering, one paragraph is enough. See the domain-modeling skill's
  `ADR-FORMAT.md`. Offer a new ADR only when all three hold — hard to reverse, surprising without context, a
  real trade-off — and **never** copy the plan into it: link the section instead.

## Suggested skills

- **grilling** — to continue the interview in the established shape: one question, a
  recommendation, wait for the answer, act only after confirmation.
- **domain-modeling** — every resolved term belongs in `CONTEXT.md` immediately, and the owed ADR is
  that skill's other deliverable. Its rules: challenge fuzzy terms, cross-check the code, keep the
  glossary free of implementation.
- **grill-with-docs** — the umbrella skill combining the two above; this session is its instance.
- Later, once the interview closes and scope must be cut into work: **to-spec**, then
  **to-tickets**. Do not invoke them mid-interview.

## Tone notes

No emojis. The user writes Russian; answer English in chat and Russian in the file, keeping Russian
orthography correct, `ё` included. Be blunt: this user rewards a direct "your rule breaks on this
concrete case" over hedging.
