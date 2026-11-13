# Price Lens

A browser extension that reads amounts with a currency out of whatever text a person has
selected on a page they don't own, and shows the same amount in their own currency.

## Language

**Selection**:
The text a person has highlighted on a host page. The only input to the overlay path.
_Avoid_: highlight, mark, range

**Selection text**:
The plain text of a selection, taken as-is. The parser reads nothing else — no markup, no attributes.
_Avoid_: selection content, node text, innerText

**Host page**:
Any page the extension runs on. Its DOM, styles and existing overlays are not ours to change.
_Avoid_: site, target page, client

**Currency indicator**:
The token in a selection that says which currency an amount is in — a symbol (`$`) or an ISO code
(`USD`). A currency spelled as a word (`рублей`, `dollars`) is not an indicator. One sign can name two
currencies: `¥` is yen or yuan, decided by the page's declared language, and CNY when the page declares
nothing.
_Avoid_: currency sign, marker, prefix, currency word

**Amount expression**:
The part of a selection that names money: a numeral plus a currency indicator.
_Avoid_: number, value, sum, price

**Exact selection**:
A selection whose non-whitespace content is exactly one amount expression. Only an exact selection
produces an overlay; anything else is ordinary copying.
_Avoid_: valid selection, good selection, parse match, match

**Multiplier**:
A magnitude word attached to a numeral that scales it (`тыс.`, `млн`, `K`, `M`).
_Avoid_: suffix, magnitude word, unit

**Number convention**:
How the separators of an amount expression are read, decided by counting digits, never by currency:
when both separators appear, the rightmost is the decimal one; a separator that repeats is a thousands
separator; a lone separator is a thousands separator only when exactly three digits follow it.
_Avoid_: locale, number style, page language, currency rule

**Source currency**:
The currency an amount is expressed in, taken from the selection itself.
_Avoid_: from currency, input currency

**Target currency**:
The currency an amount is converted into.
_Avoid_: to currency, output currency, result currency

**Default target currency**:
The target currency a person picks at onboarding. Every overlay uses it until it is changed in
settings; the popup converter may use any pair. The first value comes from the browser region, and when
the region gives nothing it follows the interface language (`ru` → RUB, otherwise USD); changing the
language during onboarding moves it too, until the person picks a currency by hand.
_Avoid_: home currency, preferred currency, base currency

**Conversion**:
Expressing an amount in one currency as an amount in another, using a rate. A conversion is never
computed from memory — it always has a rate fetched for it.
_Avoid_: calculation, exchange

**Pair**:
A source currency and a target currency taken together — the unit a rate is quoted for.
_Avoid_: currency combination, direction, symbol

**Rate**:
The multiplier for one pair, fetched from the network: how much of the target currency one unit of the
source buys. A conversion multiplies by it and never divides. A rate is never invented and never assumed;
a fetched rate may be reused within its freshness window and no longer, and it never outlives the browser
session that fetched it.
_Avoid_: exchange rate value, price, quote, fx, divisor

**Freshness window**:
How long a fetched rate may be reused for its pair, counted inside the browser session that fetched it. It
bounds how often we ask, not how old the number is — the provider's own update cadence decides that. A rate
is never written to disk, so the window is the shorter bound and the browser session the longer one. Six
hours today, derived from the once-a-business-day publication in ADR 0017; a rate older than the window is
not served, though nothing deletes it.
_Avoid_: cache lifetime, expiry, staleness, ttl

**Browser session**:
The lifetime of one browser process. Memory in `storage.session` survives tab closing and the unloading of
the background worker, and ends when the browser stops — or when the extension is disabled or updated. A
fetched rate lives there and nowhere else. The popup's last selected pair also lives there; closing the popup
keeps it, while a browser restart resets it.
_Avoid_: tab session, page lifetime, worker lifetime

**Fixture**:
A number written into the onboarding scene in advance and used as-is: an amount and its conversion,
chosen to look plausible. It is not a rate and never appears outside the scene — an overlay on a host
page only ever shows what `getRate` brought.
_Avoid_: mock data, sample rate, demo value, example rate

**Overlay**:
The transient window anchored to a selection that shows that selection's conversion. It belongs to
the moment of selection and disappears with it — and it carries the result only, never the source
amount. It is a showcase, not a work surface: its only interaction is an error action, and a change of the
target currency closes it rather than recomputing it. Its Russian name is «попап», and that is what the
documents say.
_Avoid_: tooltip, popover, bubble, hint, widget

**Result**:
The converted amount in the target currency — the single number an overlay shows.
_Avoid_: answer, output, value, conversion output

**Minor units**:
The number of fractional digits a currency has — 2 for a dollar, 0 for a yen, 3 for a dinar. It comes from the
same formatter that prints the amount, never from a table of its own. Money is never held as a scaled integer:
an amount is a decimal string and `big.js` does the arithmetic.
_Avoid_: subunits, small units, raw number, float

**Rounding**:
Reducing a converted amount to the digits its currency has, half-up, a rule set once as `Big.RM` at module
load. It happens in exactly one place, after the multiplication and before printing.
_Avoid_: truncation, formatting precision, toFixed

**Extension theme**:
The appearance of the extension's own pages — settings, popup, onboarding. Independent of the overlay's
theme, because the two answer different questions: what my own settings look like, and what a window on
someone else's page looks like.
_Avoid_: app theme, UI theme, global theme, dark mode

**Overlay theme**:
The appearance the overlay takes on a host page: light, dark, or taken from the page it lands on. A
setting separate from the extension theme.
_Avoid_: popup theme, widget theme, bubble style

**Page theme**:
Whether a host page is light or dark: as the page itself **declares** it — `color-scheme` on `html`, then
whole class or attribute tokens on `html`, then on `body` — and, when the page declares nothing, as it
paints itself, from the first opaque background of `html` or `body`. The colour painted under a selection
is never sampled, and a page that neither declares nor paints has no page theme.
_Avoid_: page tone, brightness, background colour, site dark mode

**Popup**:
The extension's own surface, opened from the toolbar, holding the manual converter: two amount
fields and two currency pickers, for amounts with no currency indicator to read. The only
surface in the product with an input field — the overlay and the settings page have none.
Its Russian name is «приложение», which is also how the settings page refers to it.
_Avoid_: widget, panel, mini-app, main app

_Warning_: the English word and the Russian «попап» point at **different** surfaces. In the manifest,
`action.default_popup` is this one; in conversation, «попап» is the overlay. Never translate one into
the other.

**Interface language**:
The language every surface of the product speaks — one setting, chosen at onboarding and changeable
in settings. The browser's language only supplies its first value; after onboarding nothing reads it.
_Avoid_: browser language, system language, locale, UI locale

**Currency picker**:
Any surface where a person chooses a currency — search field first, then one row per currency
carrying its narrow currency symbol, its ISO code and its name in the interface language. The amount itself
is printed with the symbol, never with the code.
_Avoid_: dropdown, select, combobox, currency list

**Onboarding**:
The two-stage first run: settings (language, theme, default target currency), then the scene showing how
a selection produces an overlay. The overlay's own theme is not part of it.
_Avoid_: setup, first run, welcome screen, tutorial

**Onboarding scene**:
The second onboarding screen — a live component, not a picture of one. It embeds one fixed sentence about
a price, highlights only the amount with CSS, and keeps a real overlay beside it permanently on and
always **above** the sentence, reading the person's actual gap and theme. The two numbers in it are a
`Fixture`, printed by the same formatter the product uses.
_Avoid_: demo, preview, mockup, example screen
