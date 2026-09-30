# Feature: Frontend-Initiated Data Entry (Add / Edit) + Optional Exe

Let the SPA trigger the native Add Game and Edit Game dialogs, and make a game's executable optional so the
library can be backfilled with legacy games that are no longer on the machine.

See ADR [0003](../adr/0003-frontend-initiated-data-entry-via-uri-protocol-and-command-trigger.md) for the
transport decision, and CONTEXT.md for **Backfilled game**, **Command trigger**, and **Protocol handler**.

## Settled design (from the grill)

- **Transport**: custom `gaminggaiden://` URI protocol handler → writes a **command trigger** file →
  the tray app's existing 1-second timer reads it and pops the native WinForms dialog. SPA stays `file:///`.
- **Registration**: the tray app self-registers the scheme idempotently at startup. `Deploy.bat` / `Install.bat`
  unchanged.
- **Add**: `(+)` button on All Games → `gaminggaiden://add-game`.
- **Edit**: Edit button on Game Detail → `gaminggaiden://edit-game?name=<url-encoded PK>`; the existing Edit
  dialog opens pre-focused on that game. Edit only (no delete-from-detail).
- **Optional exe**: one Add dialog serves both real and backfilled games; exe is optional and stored as SQL
  `NULL` when absent. Playtime becomes editable (reusing the Edit form's `x Hr y Min` validator).
- **Backfill data model**: sets the game-level `play_time` total only — no synthetic session or
  daily_playtime rows. `last_play_date` defaults to the release date if provided, else `NULL`.
- **Refresh**: after a dialog completes, the user refreshes the browser (F5) to see changes. Auto-reload is
  a deferred future enhancement.

## Non-goals

- No local HTTP server; no in-browser forms (the forms remain native WinForms).
- No synthesised session history / daily playtime for backfilled games.
- No auto-reload of the SPA after an edit.
- No delete action on the Game Detail page.

---

## Workstream A — Make `exe` optional (backend, independent, do first)

This is the smallest, lowest-risk slice and unblocks backfilling regardless of the frontend work. TDD:
Pester test first, then implement.

> **Status: implemented, Windows verification pending.** The backend Pester suite depends on PSSQLite's
> native (Windows) SQLite provider and cannot run on the macOS dev machine — the new tests skip cleanly there
> and must be run with `Invoke-Pester -Path tests\backend` on the Windows install. Both modules parse cleanly
> (AST check).

- [x] **A1. Pester: `SaveGame` stores `NULL` for a blank exe.** `tests/backend/StorageFunctions.Tests.ps1`
  asserts blank exe → SQL `NULL`, provided exe stored verbatim, blank `last_play_date` → `NULL`, edit-blanks-exe
  → `NULL`, rename-with-blank-exe → `NULL`, and the tracker-safety invariant. Skips when PSSQLite is unavailable.
- [x] **A2. `SaveGame` null-coalesces `exe_name`.** Added `$setExeNameNull` follow-up UPDATE (and
  `$setLastPlayDateNull` for the backfill date), guarded by trim-aware blank checks.
- [x] **A3. `UpdateGameOnEdit` null-coalesces `exe_name`.** In-place branch handles it; the rename branch
  delegates to `SaveGame`, which now handles it too.
- [x] **A4. Add form: exe no longer mandatory.** `RenderAddGameForm` OK-handler now validates **name only**;
  exe is derived only when the exe textbox is non-empty (avoids `Get-Item` on a blank path).
- [x] **A5. Add form: editable playtime.** Playtime textbox is no longer `ReadOnly`; OK-handler parses it with
  `^[0-9]{0,5} Hr [0-5]?[0-9] Min$` into minutes. Default `0 Hr 0 Min`.
- [x] **A6. Add form: `last_play_date` policy.** Release-date epoch if the release-date picker is checked,
  otherwise blank → stored as SQL `NULL` (frontend already treats it optional).
- [x] **A7. Regression: tracker safety.** No `DetectGame` code change needed; added a Pester assertion mirroring
  its query + `$null -ne $exe -and $exe -ne ""` guard, proving a `NULL`-exe game yields no matchable exe.
- [ ] **A8. Verify (user, on Windows).** `Invoke-Pester -Path tests\backend`; manual smoke: add a backfilled
  game (name + art + playtime, no exe), confirm it appears in the export and renders in All Games with correct
  hours and no "last played".

## Workstream B — Protocol handler + command trigger (backend/runtime)

> **Design constraint discovered during investigation.** `GamingGaiden.ps1` guards its boot with a
> single-instance check (exits if >1 `GamingGaiden` process) and a working-directory check (exits unless run
> from `C:\ProgramData\GamingGaiden`). A protocol launch would trip both, so the handler **must not** be the
> main exe. It is a separate lightweight script that only writes the command trigger and exits. There is also
> **no `param()` block** in `GamingGaiden.ps1` and `ps12exe` arg-forwarding is unverified — another reason to
> keep the handler standalone.

> **Status: implemented, Windows verification pending (B7).** The handler's URI parsing was
> functionally tested on macOS (pure string logic — add-game, edit-game with URL-encoded spaces/&,
> unknown/empty ignored, trailing slash tolerated). All PowerShell files parse cleanly (AST).

- [x] **B1. Ship a standalone protocol handler.** `ProtocolHandler.ps1` parses the `gaminggaiden://…`
  URI, URL-decodes/validates it, writes the command to `%TEMP%\GmGdn-Command.txt`, and exits — no app
  modules, no DB. `ProtocolHandler.vbs` is the registered shim that runs it hidden (no console flash) via
  `powershell.exe -WindowStyle Hidden`. Both are copied into the build by `Build.ps1` and carried to the
  install dir by `Deploy.ps1`'s existing build-artifacts robocopy (no Deploy change needed).
- [x] **B2. Self-registration at startup.** `Register-GamingGaidenProtocol` (in `HelperFunctions.psm1`)
  idempotently writes `HKCU\Software\Classes\gaminggaiden` (with `URL Protocol`) pointing at
  `wscript.exe "<dir>\ProtocolHandler.vbs" "%1"`, only when missing or stale. Called in `GamingGaiden.ps1`
  boot after the HWiNFO block. No Install.bat / Deploy.bat change.
- [x] **B3. Command-trigger polling.** `ProcessCommandTrigger` (next to `UpdateAppIconToShowTracking`) is
  wired into the existing 1-second `$Timer.Add_Tick`. Reads + deletes the trigger, then dispatches
  `add-game` → `ExecuteSettingsFunction RenderAddGameForm`; `edit-game:<name>` → `RenderEditGameForm`
  preselected on `<name>`. A `$script:ProcessingCommand` flag guards re-entrancy (modal `ShowDialog` on the
  UI thread already blocks overlapping ticks).
- [x] **B4. Edit-form pre-focus by name.** `RenderEditGameForm($GamesList, $PreselectName="")` uses
  `FindStringExact` to select the named game, falling back to the first item if not found.
  `ExecuteSettingsFunction` gained `-PreselectName` and forwards it.
- [x] **B5. Input hardening.** Handler caps raw URI at 2048 chars and names at 512, strips newlines,
  URL-decodes the name, and ignores unknown/empty actions. The dispatcher trims, ignores whitespace, and
  logs unrecognised commands. Trigger lives in per-user `%TEMP%`.
- [x] **B6. Uninstall nicety.** `Uninstall.bat` now `reg delete HKCU\Software\Classes\gaminggaiden /f`.
- [ ] **B7. Verify (user, on Windows).** Deploy, then with the tray app running invoke
  `gaminggaiden://add-game` and `gaminggaiden://edit-game?name=…` (e.g. from a browser address bar or a
  test link); confirm the correct dialog appears, the edit dialog is preselected on the named game, no
  duplicate `GamingGaiden` process spawns, and no console window flashes.

> **Latent, out-of-scope finding:** the tracker-job init block imports `.\modules\UserInput.psm1`, which does
> **not exist** in the repo. Not touched by this feature; flagged for separate triage.

## Workstream C — SPA buttons (frontend, depends on the `gaminggaiden://` contract from B)

> **Status: complete and verified.** `npm test` (270 tests) and `npx tsc --noEmit` both pass on the dev
> machine (the frontend toolchain runs natively, no PowerShell dependency).

- [x] **C1. `(+)` on All Games.** `AllGamesComponent` renders an accessible `#all-games-add-button` anchor
  (`href="gaminggaiden://add-game"`) in the header. A plain link works from the static `file:///` page — the
  browser hands the scheme to the OS, no JS needed. Vitest asserts the href and aria-label.
- [x] **C2. Edit on Game Detail.** `GameDetailComponent` renders a `#game-detail-edit-btn` anchor in the hero
  actions, `href="gaminggaiden://edit-game?name=<encodeURIComponent(name)>"`. Vitest asserts the encoded href
  for a normal name and for `Ratchet & Clank` (→ `name=Ratchet%20%26%20Clank`).
- [x] **C3. Safety.** The name is `encodeURIComponent`-d for the URL, then the whole href is `escapeHtml`-d for
  the attribute (defence in depth). Verified via the special-character test.
- [x] **C4. Verify.** `npm test` → 270 passed; `npx tsc --noEmit` → clean. Styles for both buttons added to
  `resources/css/common.css` (modeled on the existing search-clear and Steam buttons).

## Workstream D — Docs & wiring

- [ ] **D1. `Manual.md` / `Readme.md`.** Document backfilling and the new SPA buttons; note the F5-refresh step.
- [ ] **D2. Data contract.** No `schema_version` bump required (only relaxing a field to optional, which the
  contract already permits). Confirm the `FrontendDataContract.md` wording still holds for a `NULL` exe.

## Suggested order

A (self-contained, ships value alone) → B (transport) → C (buttons, needs B's URL contract) → D (docs).
A and the start of B can proceed in parallel.

## Verification (whole feature)

```powershell
cd frontend; npm test; npx tsc --noEmit; cd ..
Invoke-Pester -Path tests\backend
```

Plus manual: add a backfilled game from the tray, then trigger Add and Edit from the SPA buttons and confirm
the native dialogs open correctly and changes appear after an F5.
