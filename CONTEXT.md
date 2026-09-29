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

**Session start_time (epoch policy)**:
A session's `start_time` is stored as a Unix epoch. The single parser (`TimeUtils.parseSessionStart`) treats a numeric value **below 1e10 as SECONDS** (×1000) and **at or above 1e10 as MILLISECONDS**; non-positive or unparseable input falls back to the epoch (1970-01-01). Legacy/mock data may instead use a human date string ("2023-01-01 10:00"), parsed via `Date.parse`. All real exported data uses 10-digit seconds. There must be exactly one parser: an earlier second copy (`GameDetailStatsCalculator.parseSessionDate`) used a different rule and is now a re-export, so the seconds/ms decision lives in one place.
_Avoid_: adding a second timestamp parser with its own seconds/ms heuristic.

**Games-played ranking**:
The ranked "games played" list shared by Session History (per period) and My Rigs (per rig). One module (`GamesPlayedRanking`) owns the colour palette and the aggregate→rank→colour→percentage→row logic; callers supply pre-summed `{gameName, minutes, iconPath}` and receive ranked rows. Colour is assigned by **playtime rank index**, so a game's colour is not stable across different periods or rigs.
_Avoid_: re-declaring the palette per screen, or cross-importing it from another screen's module.
