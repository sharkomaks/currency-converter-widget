# Settings live as a snapshot in tab memory

Status: accepted

The content script reads settings once when it loads and keeps **one state per tab**: the settings snapshot, a
`dirty` flag, the current selection (currency, amount, anchor rectangle) and the overlay's phase. Opening an
overlay performs no storage read at all. `storage.onChanged` (area `sync`) only marks the snapshot dirty; the
re-read happens on the next overlay open or when the tab becomes visible again (`visibilitychange`).

Why: the overlay's theme must be known **before the first paint**, and `storage.get` is asynchronous. A read
per selection in the hot path buys either a flash (painted in one theme, repainted in another) or a skeleton —
on the product's most frequent event, to pick up a setting that changes once a week.

## Consequences

- **The event is a hint, not a description.** In Firefox the listener arrives with every key of the area the
  write went to, and may fire with no change at all (bug 1833153). So the handler does not interpret changes;
  it invalidates and we re-read.
- **`visibilitychange` is the safety net.** Background tabs get frozen, so the event may never arrive.
- **The rate is deliberately absent.** It belongs to the background and to `storage.session` (`0017`); a
  second copy in the tab would be a second place where it goes stale.
- **There is no cross-surface global state.** Content script, popup and settings page are three contexts with
  three snapshots; the only thing they share is storage.
- **Honest hole:** if the browser delivers neither the event nor the visibility return, the snapshot stays
  stale until the page reloads. The cost is one overlay in an old theme or with an old target currency.

Full reasoning: `PLAN.ru.md` §6, §10; `AUDIT.ru.md` Б11.
