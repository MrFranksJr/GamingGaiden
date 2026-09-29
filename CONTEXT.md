# Gaming Gaiden

Gaming Gaiden tracks time spent playing games and presents it back to the player as a set of dashboards (Summary, All Games, My Rigs, Session History). This glossary captures the domain terms those screens share.

## Language

**Session**:
A single continuous stretch of play of one game, with a start time and a duration in minutes. The backend splits a session at midnight, so a session never spans two calendar days.
_Avoid_: Play, run, entry

**Active day / Active month**:
A calendar day (or month) that has any recorded play data. Days and months with zero play are *inactive* and are excluded from averages and rankings.
_Avoid_: Played day, gaming day (informal UI copy may still say "gaming day", but the concept is "active day")

**Active daily average / Active monthly average**:
Mean playtime computed over active days (or active months) only — total playtime divided by the count of days/months that have data, never by the full calendar span. This keeps "above average" honest: idle calendar days don't drag the baseline down and make ordinary sessions look exceptional.
_Avoid_: Daily average, average day (unqualified — they wrongly imply a calendar-day denominator)

**Rig**:
A computer system the player games on, tracked across its lifecycle (when it entered and left service, what it cost, how much play it accumulated). Canonical UI and domain noun. Games are tagged to the rig they were played on, so a rig aggregates its games, sessions, playtime, age, and cost. This is the vocabulary the whole app is converging on — the next-gen frontend adopts it first, and the PowerShell backend will follow.
_Persisted synonym_: **Gaming PC** — the term used in the stored data model (`gaming_pcs`, `gaming_pc_name`) and the legacy report. Treat it as the storage-layer name for a Rig, not a separate concept.
_Avoid_: PC, machine, computer (unqualified), build (a "build" is the hardware spec, not the tracked entity).

**Period insight**:
A single line at the bottom of a Session History period sidebar (a day or a month). It is a *hybrid*: when the period genuinely earns one it shows a **milestone** (an all-time record, or a top rank among active periods), otherwise it shows an always-true, non-superlative **"Did you know?"** factoid (ratio versus the active average, most-played game, distinct-game count, etc.), falling back to a neutral "solid session" line only when nothing else is true. Distinct from the Summary screen's **Milestone Highlight** (library-completion progress), though both reuse the same `.milestone-card` visual shell.
_Avoid_: Blurb, banner, achievement. (A "milestone" is now only the top tier of a period insight, not the whole feature.)
