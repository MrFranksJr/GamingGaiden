# 2. Consolidate legacy-only views into existing SPA screens instead of rebuilding them

Date: 2026-09-29

## Status

Accepted

## Context

Three legacy views had no direct route in the next-generation SPA at sunset time:

- **Most Played** (`RenderMostPlayed`) — games ranked by playtime.
- **Games Per PC** (`RenderGamesPerPC`) — game counts grouped by rig.
- **Time Spent Gaming** (`RenderGamingTime`) — daily/annual playtime tables.

Removing the legacy frontend removes these views. We had to decide whether to rebuild each as a new SPA
route, fold them into existing SPA screens, or drop them.

The SPA already presents the same underlying statistics in different shapes:

- **My Rigs** aggregates games and hours per rig (covers Games Per PC).
- **All Games** is sortable and searchable, including by playtime (covers Most Played).
- **Summary** shows annual hours via its bubble/timeline visualisations (covers Time Spent Gaming).

## Decision

Do not rebuild the three views. Accept that their information is already reachable — in a different
presentation — through **My Rigs**, **All Games**, and **Summary**, and delete the standalone legacy
views. Coverage is spot-verified before the flip, but no new SPA routes are built for them.

## Consequences

- **Positive**: Avoids building and maintaining three redundant views. Keeps the SPA's navigation lean and
  aligned with its own information architecture (Rigs, not "Games Per PC") rather than mirroring the legacy
  menu one-for-one.
- **Negative**: Not strict feature parity. The exact tabular presentations of the legacy views (e.g. a flat
  "most played" table, a raw daily-playtime table) no longer exist; the equivalent data is presented
  differently. A user who relied on a specific legacy layout will need to find it in its new home. This is
  hard to reverse once the legacy code is deleted — hence this ADR.
- If a specific presentation turns out to be genuinely missed, it can be added deliberately as a first-class
  SPA feature later, rather than carried forward as legacy debt.
