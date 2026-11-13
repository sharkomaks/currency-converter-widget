# The rate cache lives in `storage.session` and dies with the browser

Status: accepted

The user's rule: «оставить только кэш в нашей сессии и всё, сессия закончилась — новый запрос». A fetched rate
is kept in `storage.session` and nowhere else: it is memory, not disk, and **on the disk there is no rate at
all**.

Why not a plain variable in the service worker: MV3 unloads the worker after a short idle, so a worker-scoped
cache would die every half minute and the same pair would be fetched again for every selection. `storage.session`
is the thing that actually means "our session" — memory, but it survives worker unloading and tab closing, and
is cleared when the browser stops (and also when the extension is disabled or updated). 10 MB per area, which a
pair-keyed cache will never approach. Supported in Chrome 102+ and Firefox 115+, per MDN.

## Consequences

- **The age marker is gone**, and with it the "stale cache" state: a window that shows a number now has no
  reason to also explain how old it is. §11 of the plan lost two states.
- **`storage.local` leaves the project.** Settings in `sync`, rates in `session` — two areas, one role each.
  Finding С7 (the cache grew on every pair and was never swept) loses its subject: a session is its own bound.
- **The offline case is a loss, not an oversight.** With a disk cache, yesterday's number plus a marker rescued
  you on a plane. Now the first selection after a browser restart with no network is «нет подключения» and a
  button. Recorded in §7 and §11 so a later bug hunt starts in the decision, not in the fetch code.
- **More requests per session** — one per pair per session instead of one per six hours across restarts. The
  per-pair rate ceiling in `rate.ts` still stands, so this is a slower drip, not a flood.
- **`rateDate` stays in the session record but is no longer shown.** It is a fact about the rate rather than
  decoration, and keeping it means a future marker does not change the provider contract.
- **Six hours is the freshness window, inside the session as well** (Р5а). A browser left open for a week
  would otherwise show a week-old number with no marker on it — the marker this decision removed. Six hours is
  derived, not chosen: publications arrive once per business day, so a window `W` costs `24 / W` requests per
  pair per day and spends `W² / 48` hours per day showing a number older than the published one (a publication
  lands inside the window with probability `W / 24`, and then half the window is stale on average). A target of
  «under an hour a day on the old number» gives `W ≤ 6.9`, so 6 h. The same condition reads `fetchedAt` and
  never serves an older record; nothing deletes it.
- **Weekends are an accepted waste** — no publication happens, so every re-fetch returns Friday's number with
  the same `rateDate`. Skipping weekends would save eight identical answers per pair and still be the wrong
  calendar: the ECB also skips TARGET closing days, which are not Saturdays.

## Considered options

- **A variable in the worker** — simplest to write, but it dies on unload, which is the exact case the cache
  exists for.
- **`storage.local` with a TTL and a sweep** — what this replaces: a marker, a cleanup job, a migration question
  and a disk copy of a number that changes once a day.
- **No cache at all, fetch per selection** — one request per selection, and the app recomputes on every
  keystroke without a cache to read.

Full reasoning: `PLAN.ru.md` §7, §10, §11, criterion 19; `AUDIT.ru.md` Р5, Р5а, С7.
