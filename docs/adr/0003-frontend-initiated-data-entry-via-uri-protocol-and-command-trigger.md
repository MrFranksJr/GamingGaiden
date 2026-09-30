# 3. Frontend-initiated data entry via a URI protocol handler and a command-trigger file

Date: 2026-09-30

## Status

Accepted

## Context

The SPA is a static page opened as a `file:///` URL in the user's default browser. A `file:///` page is
sandboxed: it cannot call an API, write files, or start a process, and `fetch()` is blocked (which is why
exported data is delivered via the `window.gamingGaidenData` global in `data.js`). We want the SPA to offer
an "Add Game" `(+)` button on All Games and an "Edit" button on Game Detail. The data entry itself continues
to use the existing native WinForms dialogs (`RenderAddGameForm` / `RenderEditGameForm`) in the always-running
tray app — the browser only needs to *ask* the tray app to open them.

We considered three transports:

- **Local HTTP server** (`HttpListener` on `127.0.0.1`, serve the SPA over `http://localhost`, real
  `fetch()` endpoints). The most capable option and the foundation for true in-browser forms later, but it
  rearchitects how the SPA is launched and loaded (the `data.js` global fallback exists specifically because
  `file:///` blocks `fetch()`), and is far more code than this feature needs.
- **Pure trigger-file from the browser** — impossible: a `file:///` page cannot write files.
- **Custom URI protocol handler + command-trigger file** (chosen).

## Decision

Register a custom `gaminggaiden://` URI scheme. The SPA's `(+)` and Edit buttons are `gaminggaiden://…`
links (`add-game`, `edit-game?name=<url-encoded PK>`). The scheme is registered to a **standalone,
lightweight handler script** shipped in the install directory (not the main `GamingGaiden.exe`). When
launched, the handler URL-decodes its argument, writes a **command trigger** file
(`%TEMP%\GmGdn-Command.txt`), and exits. The already-running tray app's existing 1-second WinForms timer —
already used to poll `GmGdn-TrackingGame.txt` for the tracking icon — reads and deletes the trigger and pops
the matching native dialog (Edit pre-focused on the named game via the dialog's existing `FindString`).

**The handler must be separate from the main exe.** `GamingGaiden.ps1` has two boot guards that make routing
a protocol launch through `GamingGaiden.exe` unworkable: a single-instance guard (exits if more than one
`GamingGaiden` process is running) and a working-directory guard (exits unless launched from
`C:\ProgramData\GamingGaiden`). A protocol launch would trip both. The standalone handler sidesteps them
entirely and leaves the main app's boot logic untouched.

The tray app **self-registers** the `gaminggaiden://` scheme idempotently at startup (writes the `HKCU` key
pointing at the shipped handler if missing), so neither `Deploy.bat` nor `Install.bat` needs a registry step
and the existing dev loop is unchanged. The SPA stays a `file:///` page; the data-load path is untouched.

## Consequences

- **Positive**: Additive and low-risk. Reuses the "communicate through a temp file" pattern the tracker
  already relies on, and the timer that already runs. No change to the stable, tested data-load foundation.
  No changes to deployment or install scripts.
- **Positive**: Reuses the existing, trusted WinForms dialogs and their backup → tracker-reboot → re-export
  pipeline (`ExecuteSettingsFunction`) unchanged.
- **Negative**: Adds an `HKCU` registry entry — behaviour the README already flags as antivirus-sensitive
  (the app also adds registry entries for HWiNFO64). A stray key may remain after uninstall unless
  `Uninstall.bat` clears it.
- **Negative**: After an edit/add, the open browser tab shows stale data until the user manually refreshes
  (F5). Auto-reload from a sandboxed `file:///` page is awkward and is deferred as a possible future
  enhancement.
- If genuine in-browser forms are wanted later, the local-HTTP-server option remains open as a larger,
  separate step; this decision does not preclude it.
