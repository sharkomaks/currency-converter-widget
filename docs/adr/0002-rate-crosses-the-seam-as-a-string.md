# A rate crosses the provider seam as a decimal string

Status: accepted

The provider was asked for once and is now reached through one method, so that swapping it is one file plus
one constant rather than a hunt through the codebase. The seam's whole surface:

```ts
interface RateSource {
  readonly name: string;                                     // 'frankfurter'
  fetchRate(from: string, to: string, signal: AbortSignal): Promise<RateResult>;
}

type RateResult =
  | { ok: true; rate: string; rateDate: string }             // how much `to` for one `from`, decimal string
  | { ok: false; kind: ErrorKind; status?: number };
```

Rules without which this would be a rename rather than a boundary: the adapter owns everything provider-
specific (URL, JSON field names, statuses, status→class mapping); **the rate leaves as a string**, because
`Big.strict` rejects `number`s and the boundary belongs where the value is born; the adapter holds no cache,
no rate ceiling, no backoff and no pair reversal — `background/rate.ts` owns those; the choice is one
constant, `const source: RateSource = frankfurter`, and `background/sources/frankfurter.ts` is the only file
importing the provider.

## What the seam does not promise

A different provider may not be expressible in these two types — a "base → all currencies" table instead of
one pair, another rate date, another weekend behaviour — and then the contract changes, not just the file.
The manifest is outside the seam: the provider's address also lives in `host_permissions` in two files, so a
swap touches **three** places (adapter, constant, manifests).

## Considered options

An interface per provider entity — rates, currency list, names. Two of them would be empty: nothing but the
rate is taken from the provider at runtime, because the currency list is a module of our own (`0004`).

## Why it earns its keep beyond "what if"

A fake `RateSource` makes all six error classes testable without a network: the test throws, answers `404`,
answers `200` without `rate`, and asserts texts and buttons. Without the seam that test would mock `fetch`
and check our strings through someone else's JSON.

Full reasoning: `PLAN.ru.md` §7, registry row 33.
