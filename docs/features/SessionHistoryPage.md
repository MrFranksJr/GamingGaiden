# Feature: Session History Page

Track the implementation of the next-gen **Session History** page (sidebar: "Sessions", route `#session-history`). Browse gaming sessions organized **By day** or **By month**.

Mockup: `docs/mockup/Session History design.png`. This plan is the source of truth where it and the mockup diverge (divergences are called out explicitly below).

## Status

- Route `#session-history` and the "Sessions" sidebar link **already exist** (`frontend/src/app.ts`, `frontend/index.html`). No new routing/nav wiring needed.
- Current `SessionHistoryComponent` is a **stub** (last-20-sessions `<table>`); its test asserts exactly 2 `.session-row`. Both the component and its test will be **rewritten**.

---

## Settled design (from grill)

Three-column layout with two tabs. Selection state lives in the **URL**.

- By day: `#session-history?view=day&date=YYYY-MM-DD`
- By month: `#session-history?view=month&month=YYYY-MM`
- No/invalid params → defaults below.

### Tabs
- **By day** (default tab). Default selection = **today** (`date` omitted → today).
- **By month**. Default selection = **current month** (`month` omitted → current month).

### By day — three columns
1. **Left — month calendar**
   - Header `◀ {Month} {Year} ▶` navigates months (changes displayed month, not selection).
   - Grid Mon–Sun. Each day cell shows the day number and a **single "has data" dot** when that day has any play data, nothing otherwise.
     - **DIVERGENCE from mockup**: mockup had multi-color per-session dots + a 3-state legend (Played / Partial day / No sessions). We collapse to **two states: has-data (dot) / no-data (no dot)**. **No legend.** No "partial day".
   - Selected day is highlighted. Clicking a day selects it (updates URL `date=`).
   - Below the calendar: **"Recent days"** list — most recent days-with-data, each row = date + weekday + total playtime + chevron; click selects that day.
2. **Middle — session ("diary") cards** for the selected day, one card **per session** (a game played twice that day = two cards), ordered by start time.
   - Card: box art, game name, **status pill** (derived from the *game's* status, not the session), **time range `HH:MM–HH:MM`** (derived), duration (compact `2h 49m`), chevron.
   - Whole card / chevron links to `#game-detail?name=${encodeURIComponent(game_name)}`.
   - **Empty state**: if the selected day has no sessions (e.g. default "today" with no play), show a clean "No gaming sessions on {date}" placeholder; right sidebar hidden/empty. Calendar dots still guide the user to days with data.
3. **Right — day summary sidebar**
   - Hero (day date + total playtime, compact).
   - Stat tiles: **Games** (distinct games that day), **Sessions** (count), **Avg session** (total ÷ sessions, compact).
   - **"Games played"**: per-**game** aggregated rows for that day (box art, name, total time, % of day), each with a **colored progress bar**.
   - **DROPPED for now**: the "insight blurb" ("A solid day of gaming! 2.5×…"). Revisit later if wanted.

### By month — three columns (mirrors By day)
1. **Left — year grid**: `◀ {Year} ▶` year nav; 12 month cards. Each month card = **month name + single "has data" dot** (dot when that month has any play data).
   - **DIVERGENCE**: mockup showed hours + multi dots on month cards. Per grill: **no hours on the resting card** (hours appear only after selecting a month), single has-data dot only.
   - Click a month → selects it (URL `month=`), fills middle + right.
2. **Middle — per-game aggregated cards** for the selected month (one card per game played that month: box art, name, status pill, total time for the month, chevron → game detail). No per-session list at month scale.
3. **Right — month summary sidebar**: hero (month + total playtime), stat tiles (Games / Sessions / Avg session for the month), "Games played" colored % bars.

---

## Data mapping (verified against `frontend/src/types/GameData.ts`)

- **Session** = `{ id?, game_name: string, start_time: number|string, duration: number }`.
  - `start_time` is **Unix epoch seconds** in real data (may be string; normalize).
  - `duration` is **minutes**.
  - **No `end_time`** → derive: `end = start + duration*60`.
  - **No session status** → status pill comes from the matching **`Game.status`** (via `categorizeGameStatus` + `getStatusSlug`).
- **DailyPlaytime** = `{ play_date: string, play_time: number(min) }` → drives **By-day calendar dots** (day has data ⇔ present with play_time > 0).
- Month "has data" dots: derive from sessions/daily_playtime grouped by `YYYY-MM`.
- Backend splits sessions at midnight (a session never spans two days) → day grouping by `start_time` is safe.

## Reuse map (verified)

- **Status pill**: `categorizeGameStatus(game)` + `getStatusSlug(category)` → `class="hero-status-pill status-<slug>"` (see `GameDetailComponent.ts`, `AllGamesComponent.ts`, `SummaryStatsCalculator.ts`).
- **Box art**: `safeCachedImagePath()` from `HtmlUtils.ts` + `.game-poster-frame` / poster fallback.
- **Progress bars**: existing `*-progress-fill` CSS classes.
- **Color palette**: reuse the exact 10-color palette from `summary/BubbleGraphComponent.ts` (indigo, purple, sky, emerald, amber, pink, teal, violet, cyan, rose).
- **Escaping**: `escapeHtml()` on **every** DB-sourced string (mandatory).
- **Game detail link**: `#game-detail?name=${encodeURIComponent(name)}` (game detail is keyed by **name**, not id).
- **Time utils** (`TimeUtils.ts`): `toSortableTimestamp` exists; `formatPlaytime` outputs "8 Hr 24 Min" (verbose). Helpers like `parseSessionDate`/`formatDateTime` do **not** yet exist — build what's needed (see below).

## New code to build

- `frontend/src/utils/SessionHistoryStatsCalculator.ts` — pure logic (hexagonal split, matches repo convention): group sessions by day/month, aggregate per-game totals + percentages, distinct-game/session/avg stats, has-data sets for calendar dots, most-recent-days list, per-game color assignment.
- **Compact time formatter** `8h 24m` (new fn in `TimeUtils.ts`, e.g. `formatPlaytimeCompact`; keep verbose `formatPlaytime` untouched — other screens use it).
- **Time-range formatter** `HH:MM–HH:MM` from `start_time` + derived `end`.
- **Calendar widget** (Mon–Sun month grid) and **tabs** — neither exists; build from scratch (vanilla TS class-component with `render/mount/destroy`).
- Rewrite `SessionHistoryComponent` to the 3-column, tabbed, URL-stateful layout; add `mount()` (event delegation for day/month/tab clicks + calendar/year nav) and `destroy()`.
- CSS additions in `resources/css/common.css` (reuse existing vars/classes where possible).

## Agent notes / decisions

- **Per-game bar color = index-based, matching the bubble graph** (`palette[index % 10]` over the day/month's games sorted by playtime). This mirrors `BubbleGraphComponent.ts` for visual consistency. **Known trade-off**: a game's color is *not* stable across different days (it depends on its rank that day), exactly like the bubbles. If stable-per-game colors are later desired, switch to hashing the game name — but that would diverge from the bubble graph. (This is the one decision a future reader may find surprising; recorded here rather than as a separate ADR, per repo convention — no `docs/adr/` exists and `docs/agents/domain.md` says don't create doc structure upfront.)
- **TDD**: repo mandates test-first. Write failing tests first (calculator units, then component render/behavior), implement minimally, refactor. Replace the existing stub test (`.session-row`/2-row assertion) with tests for the new structure.
- **Relative paths / `file://`**: app runs from `file:///`; keep all asset paths relative; no runtime image color extraction (CORS).
- **Build/test**: `npm run build` (esbuild → `resources/js/app.js`), `npm test` (Vitest, build runs first).

## Implementation checklist

- [ ] `SessionHistoryStatsCalculator.ts` + tests (grouping, aggregation, stats, has-data sets, recent-days, color assignment)
- [ ] `formatPlaytimeCompact` + time-range formatter + tests
- [ ] Calendar widget (month grid, nav, has-data dots, selection) + tests
- [ ] Tabs (By day / By month) + URL param parsing in `app.ts` `handleRoute()`
- [ ] By-day: session ("diary") cards + empty state
- [ ] By-day: day summary sidebar (hero, stat tiles, per-game % bars)
- [ ] "Recent days" list
- [ ] By-month: year grid (month cards + has-data dots, year nav)
- [ ] By-month: per-game cards + month summary sidebar
- [ ] Game-detail links (`#game-detail?name=`) from cards
- [ ] Rewrite `SessionHistoryComponent` (render/mount/destroy) + rewrite stub test
- [ ] CSS in `common.css`
- [ ] `npm run build` + `npm test` green
