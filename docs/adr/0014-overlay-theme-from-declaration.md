# The overlay theme: page declaration first, page paint second

Status: accepted (amended 2026-11-08)

The overlay's theme comes from what the page **declares**: `color-scheme` on `html`, then whole class or
attribute tokens on `html`, then on `body`. When the page declares nothing, the page's own painted
background decides — the first opaque `background-color` of `html`, then `body`, by brightness; only a page
that neither declares nor paints gets the extension theme. The colour painted under the selection is never
sampled.

Why: the two questions are different — "what theme is this page" versus "what colour sits under this number".
Sampling paint makes the window change colour from block to block on one page, and answers a question nobody
asked.

## Consequences

- **Tokens are compared whole**, never as substrings: `darkroom` and `lightbox` are not themes. First
  declaration wins.
- **An opaque background, a shadow and a 1px border are mandatory**, because a light window on a light page
  has no other edge to lean on.
- **A page that is dark but declares nothing is read by its paint** — the first opaque `html`/`body`
  background, by brightness. Decided 2026-11-08 on the user's word closing Р8: «если тема попапа авто, то
  выбор идёт от цвета страницы». It is one more step in the chain, not a change of model: the declaration
  still comes first, and paint under the selection is still never sampled.
- **The extension's own pages keep their own theme**, which is a separate setting answering a separate
  question: what my interface looks like, not what a window on someone else's page looks like.

Full reasoning: `PLAN.ru.md` §13; `AUDIT.ru.md` Б5, Р8.
