# Frankfurter v2 is the only rate provider

Status: accepted

`api.frankfurter.dev/v2`, no API key, daily mid-market rates, no documented quotas. That combination decides
it: a key shipped inside an extension is a public key, and the product needs one number per pair, not a
stream.

## Consequences

- **One request per pair, cached.** The provider itself advises caching; our freshness window bounds how
  often we ask, not how old the number is, because the rate changes once a day. The pair call is
  `GET /v2/rate/{from}/{to}`; it returns `{ date, base, quote, rate }`, and `rate` crosses the seam as a
  string.
- **`rateDate` is stored apart from `fetchedAt`** — the day the rate is *for* is not the day we *asked*.
  Nothing shows either of them any more (the age marker is gone, `0017`), but the contract still carries the
  two, so a marker can come back without touching the adapter.
- **No conversion endpoint, by design.** The docs say it plainly: "There's no conversion endpoint. Fetch the
  rate and convert in a few lines of code." That is the multiplication we already own (`0001`), and it is why
  typing an amount in the popup does not hit the network per keystroke.
- **The provider's error status codes are not documented.** We checked the docs and found no table of them.
  So the six error classes (`0007`) are keyed to what is observable — `fetch` threw, an 8 s timer expired, a
  status family, a 2xx without `rate` — rather than to asserted 404/422 semantics, and the detail line quotes
  the status verbatim instead of paraphrasing it.

Full reasoning: `PLAN.ru.md` §7, `AUDIT.ru.md` С10.
