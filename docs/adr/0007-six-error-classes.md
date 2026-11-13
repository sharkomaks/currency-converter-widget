# Six error classes, a visible status, and a retry that can help

Status: accepted

Every failure falls into exactly one of six classes, decided by what can be observed in this order: `fetch`
threw → an 8 s timer expired → the response arrived, look at the status (`429`, `5xx`, other `4xx`) → 2xx
without a `rate` field. Each message carries three facts: a title saying what happened, a detail naming the
pair and the status code, and an action that actually helps. The button exists only where it helps — so no
retry on `4xx`, where a second request returns the same answer; instead «другая валюта» leads to settings.
Retry always bypasses the cache.

Why: the requirement was «ошибки должны быть информативными». «Что-то пошло не так» says nothing, and
«попробуйте позже» hides that retrying will not help.

## Consequences

- **The status code is shown to the person**, in the detail line rather than the title. It is the one fact in
  an error that cannot be retold as sympathy.
- **Texts are two dictionary keys per class** with the pair and the code substituted; sentences are never
  assembled from fragments, or the translation breaks on the first language with a different word order.
- **The timer runs in the overlay, not in the background.** The background may have been unloaded mid-request,
  and the person must still see one and the same state.
- **Retry is disciplined:** the button is disabled while a request is in flight, then for
  `min(2ⁿ, 30)` seconds times a random factor in `[0.5, 1)` — jitter, so a provider-wide outage does not turn
  every client into one synchronised wave. The per-pair ceiling (3 / 10 s, 20 / 10 min) lives in the
  background, because tabs are many and the ceiling must be per pair, not per window.
- **A stale cache is still shown**, with a second line saying why it is old; hiding a number to show an error
  is a loss.
- Provider status codes are undocumented, so the classes are keyed to observables (`0003`).

Full reasoning: `PLAN.ru.md` §11; `AUDIT.ru.md` Б10, С9.
