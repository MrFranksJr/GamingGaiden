# Feature: Legacy Frontend Sunset

Remove the legacy PowerShell-rendered HTML frontend and its supporting code paths, making the
next-generation TypeScript SPA the only frontend. Retire the Developer Mode toggle, simplify the
tray menu, and clean up backend code that existed only to feed the legacy UI.

> **This document is the single source of truth for this effort.** It spans multiple sessions and
> possibly multiple agents. Any agent picking this up should read this file first, work the next
> unchecked commit, then update the status header and check the box. Keep it honest.

---

## Status

- **Phase**: 3 — Commit 3 **revised** (QuickView removed, bold item, double-click-only); awaiting Windows re-verification.
- **Last completed commit**: Commit 3 (revised) — slim menu + bold "Open Gaming Gaiden" + double-click → SPA; QuickView deleted.
- **Next action**: User deploys on Windows, runs revised Commit 3 smoke test (bold item; double-click opens
  `#summary`; single-click does nothing; QuickView gone). On green → Commit 4 (retire tray theming).
- **Frontends today**: app routes entirely to the SPA; legacy render code still on disk (unreferenced).
- **Target**: one frontend (the SPA); no toggle; slimmed tray menu; dead legacy code removed.
- **Windows-verified through**: **Commit 2 ✅** (user confirmed "looks fantastic"). Commit 3 revised — pending re-test.

---

## The per-commit loop (how we work)

Bookkeeping is the whole game here. Every commit follows this loop:

1. **Agent readies a commit gate**: static checks + tests green (`npm test`, `npx tsc --noEmit`,
   `Invoke-Pester tests\backend`), grep gate confirms no dangling references to anything deleted, and the
   commit's file changes match its scope in this plan.
2. **User reviews** the staged change (a once-over).
3. **Commit.**
4. **User deploys on Windows** and runs the commit's manual smoke-test checklist.
5. **User gives feedback** (if relevant to this commit).
6. **Agent incorporates feedback** into the code *and this plan* — restructuring the plan if the feedback
   changes it — then re-commits.
7. **Re-verify.** Only when the commit is green and Windows-verified do we advance to the next commit.

The status header above tracks which commit is "committed but not yet Windows-verified" so the thread is
never lost across sessions or agents. **Update it on every transition.**

### Toolchain on macOS (what the agent can/can't verify here)

- **`pwsh` is installed** at `/usr/local/microsoft/powershell/7-preview/pwsh` (7.7 preview; not on PATH).
- **PowerShell parse-validation** (via `[System.Management.Automation.Language.Parser]::ParseFile`) is a
  reliable macOS gate — run it after every `.ps1`/`.psm1` edit. All 15 source files currently parse clean.
- **Pester** is installed (both 6.2.0 and 5.7.1; the suite is authored for Pester 5). On macOS it only runs
  the **OS-neutral** backend tests. Several tests fail on macOS *by environment, not regression*:
  - `HelperFunctions.Tests.ps1` needs GDI+ (`libgdiplus`) for `System.Drawing` image resizing — Windows-only.
  - `DataExport`/`UIFunctions` tests that mock a `C:\...` path hit `Join-Path`/PSSQLite Windows-path
    assumptions on Unix.
  - Do **not** read these as failures of a commit's change. The authoritative backend run is on Windows.
- **Runtime behavior** (WinForms tray, registry/HWiNFO, `Invoke-Item`/`Start-Process` browser launch) is
  Windows-only and always verified by the user's Windows smoke test.

---

## Settled decisions (from grilling)

1. **Feature gaps are accepted as already-covered, not rebuilt.** The three legacy-only views map onto
   existing SPA screens and will be dropped, not reimplemented:
   - Games Per PC → **My Rigs** (already aggregates games/hours per rig)
   - Most Played → **All Games** (sortable/searchable by playtime)
   - Gaming Time → **Summary** (annual hours in the bubble/timeline)
   - _Coverage to be spot-verified before the flip, but no new views will be built._
2. **Flip first, delete later.** The first structural commit rewires every tray handler to call the SPA
   unconditionally and stops honouring `developer_mode`, giving a fully working, revertible checkpoint
   with legacy code still on disk but unreferenced. Deletion follows in later commits.
3. **Tray menu goes lightweight (Option A).** A single "Open Gaming Gaiden" entry (where "All Games" sits
   today) launches the SPA at `#summary`; in-app sidebar owns all navigation. The per-page Statistics
   submenu and deep-link handlers are retired. Start/Stop Tracker, Settings, Help, About, Exit remain.
   - **Also requested**: double-click (or left-click) on the tray icon opens the SPA at `#summary`.
4. **Theming moves fully in-app.** The SPA's `ThemeManager.ts` owns theming. Delete the Light/Dark tray
   items, `Set-Theme`, and the startup `theme.css` copy for both `ui/` and `frontend/`. This is the
   template for the broader cleanup goal: remove old-app-era mechanisms superseded by the SPA.
5. **This doc is the canonical bookkeeping artifact.** May be promoted to GitHub issues later for parallel
   work, but this file stays authoritative.

---

6. **Tray click behavior** _(revised 2026-09-29 after Windows review)_: **double-click** the tray icon opens
   the SPA at `#summary`; there is **no single-click action**. The "Open Gaming Gaiden" menu item is **bold**
   (Windows convention for an icon's default double-click action). **QuickView is removed entirely** — the
   user disliked its look/feel, so `RenderQuickView` and all its code are deleted (not kept). This reverses
   the original "keep QuickView" call from the grilling session. Right-click still opens the menu.
7. **`ui/` icon cache is dead once legacy renders go.** The Add/Edit dialogs pre-warm the `ui/...cache` only
   for the legacy All Games list; the SPA rebuilds its own `frontend/...cache` from the DB on every export.
   Removing the dialogs' `ui/` cache writes and deleting `ui/` wholesale eliminates the double-caching and
   makes the app more lightweight. _To be verified: no non-legacy code reads the `ui/` cache._
8. **Manual: remove, don't relocate.** The SPA has no Manual/Help yet; that can be added later. For now the
   Help tray item is removed and `ui/Manual.html` + its pandoc build machinery are deleted with `ui/`. No
   standalone Manual is created.
9. **`current_pc` stays as-is.** Verified backend/data-entry only: the tracker (`ProcessFunctions.psm1`) tags
   sessions to the current rig, and the Add/Edit/Gaming-PC dialogs read it. Its only legacy-frontend touch is
   the PC-warning banner inside `RenderSummary`, which dies when that function is deleted. Out of scope.
10. **Cleanup scope confirmed**: `UpdateAllStatsInBackground` reduced to just `Export-GameDataToJson`;
    404-per-template and Manual machinery removed from `Build.ps1`; tracker / HWiNFO / `current_pc` untouched.

## Open questions (unsettled — do not act)

_None. Plan is complete; awaiting user sign-off to begin Commit 1._

## Decisions recorded as ADRs

- `docs/adr/0001-flip-first-delete-later-frontend-sunset.md`
- `docs/adr/0002-consolidate-legacy-views-into-spa.md`

---

## Commit plan

Each commit is independently working and revertible. Gate = `npm test` + `npx tsc --noEmit` +
`Invoke-Pester tests\backend` green + grep gate clean. `[ ]` = not started, `[~]` = committed but not yet
Windows-verified, `[x]` = Windows-verified & done.

### Commit 1 — Verify gap coverage (docs-only, no code)
- [x] Sub-agent confirms My Rigs covers Games Per PC, All Games covers Most Played, Summary covers Gaming Time.
- [x] Sub-agent confirms no non-legacy code reads `ui/resources/images/cache`.
- [x] Record both findings in this doc. If a gap is real, stop and re-grill before proceeding.
- **Files**: this doc only.
- **Smoke test**: none (docs-only).

**Findings (2026-09-29):**
- **Coverage**: Games Per PC → **My Rigs** (`RigStatsCalculator.buildRigDetail` yields per-rig `gamesPlayed`
  + ranked games; legacy was just `COUNT GROUP BY gaming_pc_name` — covered, richer). Most Played →
  **All Games** sortable by playtime + Summary bubble graph ranks top games by hours (legacy was
  `ORDER BY play_time DESC` — covered). Gaming Time → **Summary** annual/timeline + bubble graph (legacy
  dumped the raw `daily_playtime` table; that exact table has no 1:1 home — the accepted "different
  presentation, not parity" trade-off of ADR 0002). **No blocking gaps.**
- **`ui/` cache is dead**: every `ui\...\cache` reference is legacy render code (`UIFunctions.psm1`),
  data-entry pre-warm lines already scoped for removal (`SettingsFunctions.psm1`), or boot/build
  dir-management (scoped for Commits 6/7). All non-legacy readers point at the separate `frontend/` cache
  (`DataExport.Save-IconToCache` → `resources/images/cache`, no `ui/` prefix). **Safe to delete `ui/` wholesale.**

### Commit 2 — Flip the switch (the reversible checkpoint)
- [~] Every tray handler calls `Invoke-SPA <route>` unconditionally; remove the `if developer_mode` branches.
- [~] Stop reading/writing `developer_mode` in the flipped handlers (toggle item removed in Commit 5).
- **Files**: `GamingGaiden.ps1` (menu-item click handlers).
- **Smoke test (Windows)**: launch app; open each menu item that opens a view → all open the SPA at the
  right route; tracker still starts; no errors in log.

**Notes (2026-09-29):** All six view handlers now call `Invoke-SPA`: All Games→`all-games`,
Summary→`summary`, Session History→`session-history`. Per ADR 0002 the legacy-only items were consolidated:
Games Per PC→`my-rigs`, Most Played→`all-games`, Gaming Time→`summary`. **Caught a latent bug**: the old
Developer-Mode branch for Gaming Time pointed at `Invoke-SPA "gaming-time"`, but no `#gaming-time` route
exists in `app.ts` — it would have 404'd. Now points at `summary`. The `developer_mode` toggle item + its
handler still exist (removed in Commit 5) but no longer route anything. Frontend gate green (268 tests, tsc
clean); backend Pester not runnable on macOS — **needs Windows verification**.

### Commit 3 — Lighten the tray menu + click behavior
- [x] Replace "All Games" + the "Statistics" submenu with a single "Open Gaming Gaiden" item → SPA `#summary`.
- [~] Double-click tray icon → SPA `#summary`; **no single-click action**; right-click → menu.
- [~] Remove QuickView entirely (`RenderQuickView` + all its code).
- [~] Bold the "Open Gaming Gaiden" item (Windows default-action convention).
- **Files**: `GamingGaiden.ps1` (menu construction + tray click handlers), `modules/UIFunctions.psm1`
  (delete `RenderQuickView`).
- **Smoke test (Windows)**: right-click shows the slim menu; "Open Gaming Gaiden" is **bold**; double-click
  the tray icon opens `#summary`; single-click does nothing; QuickView never appears anywhere.

**Notes (2026-09-29):**
- Menu is now: **Open Gaming Gaiden** (bold) → Settings → Start/Stop Tracker → Help → About → Exit. The
  `developer_mode` toggle item still lives under Settings (removed in Commit 5).
- **Revised after Windows review**: initial Commit 3 kept a debounced single-click→QuickView. User disliked
  QuickView, so it's now deleted outright. Tray is double-click→SPA only; the debounce timer was removed.
  `RenderQuickView` deleted from `UIFunctions.psm1`; no QuickView references remain in any source.
- Bold font derives from the context-menu font when present, else falls back to `Segoe UI 9pt` (the menu
  font can be null before the control is shown).
- Frontend gate green (268 tests, tsc clean); `GamingGaiden.ps1` and `UIFunctions.psm1` parse clean.

### Commit 4 — Retire tray-driven theming
- [ ] Delete Light/Dark tray items + their handlers.
- [ ] Delete `Set-Theme` (`SettingsFunctions.psm1`) and the startup `theme.css` copy loop in `GamingGaiden.ps1`.
- **Files**: `GamingGaiden.ps1`, `modules/SettingsFunctions.psm1`.
- **Smoke test (Windows)**: theme toggling inside the SPA works and persists; no theme items in tray; no log errors.

### Commit 5 — Delete legacy render code
- [ ] Remove `RenderGameList`, `RenderSummary`, `RenderGamingTime`, `RenderGamesPerPC`, `RenderMostPlayed`,
      `RenderSessionHistory` from `UIFunctions.psm1`.
- [ ] Reduce `UpdateAllStatsInBackground` to just `Export-GameDataToJson`.
- [ ] Remove the `developer_mode` toggle menu item + handler.
- [ ] Remove the `ui/...cache` `Copy-Item` writes from `RenderAddGameForm` / `RenderEditGameForm`.
- **Files**: `modules/UIFunctions.psm1`, `modules/SettingsFunctions.psm1`, `GamingGaiden.ps1`.
- **Smoke test (Windows)**: add/edit a game and a rig; confirm SPA reflects changes after export; tracker
  reboot-on-change still fires; no references to removed functions.

### Commit 6 — Delete legacy assets
- [ ] Delete `ui/templates/`, generated `ui/*.html`, `ui/404.html`, `ui/resources/{js,css,images}` legacy libs.
- [ ] Delete `ui/` wholesale (pending Commit 1 cache verification).
- **Files**: `ui/**`.
- **Smoke test (Windows)**: full clean deploy; app launches; SPA loads; QuickView + data-entry dialogs still work.

### Commit 7 — Purge build/deploy of legacy
- [ ] `Build.ps1`: remove Manual-into-`ui` pandoc step, 404-per-template loop, `ui` from folder copy, `ui` cleanup.
- [ ] `Deploy.ps1`: remove `ui` robocopy sync.
- [ ] Remove Help tray item + its `Invoke-Item ui/Manual.html` handler (Manual not ported; see decision 8).
- **Files**: `Build.ps1`, `Deploy.ps1`, `GamingGaiden.ps1`.
- **Smoke test (Windows)**: `Deploy.bat` builds & deploys clean with no `ui/`; produced zip contains no `ui/`.

### Commit 8 — Docs & tests sweep
- [ ] Mark legacy removed in `docs/features/FrontendRework.md`; update `Readme.md` / `Manual.md` legacy mentions.
- [ ] Update/trim backend tests referencing removed behavior; ensure suite green.
- [ ] Flip this doc's status to Done.
- **Files**: `docs/**`, `Readme.md`, `Manual.md`, `tests/backend/**`.
- **Smoke test**: full test suite green; docs read correctly.

---

## Change log (per session)

- 2026-09-29: Created doc during grill-with-docs planning. Decisions 1–10 settled across four rounds.
  ADRs 0001 (flip-first) and 0002 (view consolidation) written. Full 8-commit plan with per-commit smoke
  tests recorded. Planning complete; awaiting user sign-off to start Commit 1.
