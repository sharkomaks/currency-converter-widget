# `onboarded` lives in `sync` and skips onboarding on a second machine

Status: accepted

Settings are stored in `storage.sync`, including the single `onboarded` flag, and the absence of that flag is
the only signal that onboarding has not been passed.

Why: settings synced to a second browser are already the person's own, so there is nothing to explain there —
the settings page is a decent first screen. The flag also fixes an older bug: onboarding used to be shown
based on "no settings at all", which lied after a partial write, after a cleared `sync`, and after someone
edited storage by hand.

## Consequences

- **A second computer gets the extension with no explanation.** That is the accepted price; the reminder lives
  on the settings page («как это работает»), not at install.
- **Partial writes and hand-edited storage no longer break onboarding**, because nothing else is inspected.
- **Rates are not settings and are not synced**: they live in `storage.session` and die with the browser
  (`0017`). Syncing a rate across machines would be both pointless and harmful.
- Target currency saved on one machine but no longer in our supported list falls back to `USD` through the
  migration rule, which is a decision of `0004`, not of this one.

Full reasoning: `PLAN.ru.md` §10; `AUDIT.ru.md` Р6.
