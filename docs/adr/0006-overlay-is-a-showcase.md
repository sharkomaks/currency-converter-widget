# The in-page overlay is a showcase, not a work surface

Status: accepted

Only an exact selection produces an overlay; the overlay carries the result and nothing else; the only
interaction it ever offers is the error action. A change of the target currency **closes** an open overlay
instead of recomputing it. The user's words: «поменял валюту, выделяй заново или считай в основном
приложении».

Why: changing a currency is work, and work belongs where the picker and the amount field are — in the app. A
number that renumbers itself while nobody is looking is a lie you only notice on return, and a recompute would
also fire a network request from a tab nobody is watching. A vanished overlay is not lying; a silently
renumbered one is.

## Consequences

- **No currency picker inside the overlay.** It would turn a window that lives seconds into a workshop, with a
  159-item list, search and additional closing rules.
- **No reload is involved anywhere.** Settings live in `storage.sync`: the popup writes the key, the tab's
  snapshot is invalidated, and the **next** selection in the same tab uses the new target immediately. Only
  the already-open overlay closes — the one that was answering the old question.
- **A recompute-in-place was designed, offered and rejected.** Do not reintroduce it, and do not add a
  currency switch to the overlay, without asking again.
- What the overlay does react to: theme and gap repaint in place; the flag setting appends or removes a flag;
  a change of language changes nothing, because the number is printed by `Intl`.

Full reasoning: `PLAN.ru.md` §11, registry row 35; `AUDIT.ru.md` Б11.
