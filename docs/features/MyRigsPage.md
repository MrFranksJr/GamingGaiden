# My Rigs page

Replaces the legacy **Gaming Time** tab in the next-gen frontend. A read-only, rig-by-rig detail
screen: pick a **Rig** (see `CONTEXT.md`) and see everything about that one machine — its playtime,
games, sessions, age, and cost.

This document records the design decisions reached in a grill-with-docs session. It is a feature spec,
not an ADR (this repo has no `docs/adr/` yet); decisions are captured inline below.

## Why it exists

The Gaming Time tab (a last-30-days daily-playtime table) is redundant now that Summary and Session
History present playtime far more richly. Meanwhile the app already stores per-machine data
(`gaming_pcs`) and tags each game to the machine it was played on (`gaming_pc_name`), but the next-gen
frontend renders none of it. My Rigs surfaces that data for the first time.

The whole app is converging on the **Rig** vocabulary: the frontend adopts it first; the PowerShell
backend is expected to follow when it is revamped. Until then, the persisted data model keeps its
"Gaming PC" names (`gaming_pcs`, `gaming_pc_name`) — treat those as the storage-layer synonym for Rig.

## Page job

Answer, for a single selected rig: **"What have I played on this machine, and what has it cost me?"**
The spine is one rig in depth. Comparing many rigs side by side is explicitly *not* the job — that
becomes valuable only with several rigs and mostly needs per-rig timelines the data does not have.

## Screen shape

- Single route `#my-rigs`, single component. No separate detail route.
- An in-page **rig switcher** selects which rig is shown:
  - With one rig: the switcher collapses to a static title; the rig's detail shows immediately.
  - With several rigs: a compact row of rig chips, current rig pre-selected.
- Nav: label **"My Rigs"**, route `#my-rigs`, icon `fa-computer`, occupying the sidebar slot vacated by
  Gaming Time.

## Rig detail anatomy

1. **Hero header**: rig icon, name, status pill, age/service line.
   - Status pill: green **"In use"** (mirrors the mockup's "Playing" pill) or muted **"Retired"**.
   - Active rig: live age line ("In use for 4 years, 10 months", `start_date` → now).
   - Retired rig: fixed service span ("Nov 2020 – Mar 2024", `start_date` → `end_date`) instead of a
     live-counting age.
2. **Stat-card row** (reuses Summary's `.stat-card`): **Total Playtime · Games Played · Total Sessions ·
   Cost-per-hour**. Raw cost is shown in the hero or a card alongside cost-per-hour.
3. **"Games on this rig"**: a ranked list (poster + playtime + share bar) reusing the Session History
   "Games played" panel styling.

## Default rig selection & sort order

Reuse the legacy ordering so frontend and backend agree: **in-use first, then most-recent `end_date`**
(`ORDER BY in_use DESC, end_date DESC`). The default hero is the first rig in that order.

## Data model & honesty constraints

Available per rig (`GamingPC`): `name`, `in_use` ("TRUE"/"FALSE"), `icon_path`, `cost` (string),
`currency` (string, e.g. "€ "), `start_date` (epoch seconds), `end_date` (epoch; `0` while in use),
`total_play_time` (minutes). Games link via `Game.gaming_pc_name`.

- **Playtime headline** uses the rig's stored `total_play_time` — it is what the backend maintains and
  what the legacy report trusted. The per-game list beneath is a game-tagging view; if the aggregated
  game playtime diverges from the stored total, prefer the stored total and do not show a conflicting
  number.
- **Games-played** and **session counts** are derived by aggregating the games tagged to the rig (sum of
  `session_count`, count of games). This is an attribution by game tagging, not a per-session record.
- **No per-rig day/month timeline.** Sessions and `daily_playtime` are global, not tagged per rig.
  Inventing a per-rig timeline would repeat the "false precision" mistake corrected in the Period
  insight feature. Every number on the page must be truthful to the data model.

## Cost & value

- `cost` is a string and `currency` may carry whitespace ("€ "); parse defensively — trim, coerce to
  number, guard `NaN`.
- When `cost > 0` **and** hours `> 0`: show raw cost ("€2500") and a derived **cost-per-hour**
  ("€6.64/h") — a metric that improves the more the rig is played.
- When cost is missing/zero: show cost as **"Not recorded"** and **suppress** cost-per-hour (never print
  "€0.00/h").

## Games-to-rig matching

`gaming_pc_name` may be a comma-joined list ("MINWU,OLDPC") — the documented multi-PC workflow (one DB
synced across machines, see `Manual.md`). Split on comma and trim, so a game shared across rigs appears
under **each** rig it is tagged to. Untagged games appear under no rig (we do not know where they were
played); the frontend does **not** invent an "Unknown rig" bucket.

## Empty state

If `gaming_pcs` is empty (or all entries invalid): a centered empty-state consistent with the rest of the
app (a single `fa-computer` icon, no elaborate illustration), with copy pointing the user at where rigs
are created — the desktop app — since the frontend is read-only.

## Retiring Gaming Time

The `#gaming-time` route and `GamingTimeComponent` are removed; nothing else links to them (only the nav
item, which becomes My Rigs). The legacy frontend stays until the next-gen one is fully adopted, then is
discontinued.
