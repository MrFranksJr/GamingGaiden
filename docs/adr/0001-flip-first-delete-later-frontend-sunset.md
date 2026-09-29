# 1. Flip-first, delete-later sunset of the legacy frontend

Date: 2026-09-29

## Status

Accepted

## Context

Gaming Gaiden shipped two frontends simultaneously: the legacy PowerShell-rendered HTML UI
(`Render*` functions in `UIFunctions.psm1` → `ui/*.html`) and the next-generation TypeScript SPA
(`frontend/`, fed by `Export-GameDataToJson`). A `developer_mode` database setting switched each tray
menu item between the two at runtime.

We want to end with a single frontend (the SPA), no toggle, and the legacy code removed. The question
was *how* to sequence that: a single clean cut that deletes legacy and rewires the app in one commit, or
a staged transition.

The app is Windows-only (WinForms tray, registry, `file:///` browser launch) and the primary developer
verifies real behavior by deploying to a live Windows install. Much of the surface — tray handlers,
browser launching — has no automated test coverage, so confidence comes from manual smoke-testing on
Windows, one step at a time.

## Decision

Sunset in stages, **flip before delete**:

1. First rewire every tray handler to open the SPA unconditionally and stop honouring `developer_mode`,
   while leaving all legacy code and assets on disk but unreferenced. This is a fully working, revertible
   checkpoint: the app runs entirely on the SPA, but reverting is a one-commit `git revert`.
2. Only after that checkpoint is verified on Windows do later commits delete the legacy render functions,
   templates, assets, and build/deploy machinery — one concept per commit.

## Consequences

- **Positive**: Every step is independently revertible. If the SPA misbehaves as the sole frontend, we
  revert one commit and the legacy path is still intact. Irreversible deletion is deferred until the
  developer has lived on the SPA. Each commit is small enough to smoke-test in isolation on Windows.
- **Negative**: Legacy code lives on, unreferenced, for several commits — a transient state a casual
  reader might find confusing (hence this ADR). The full sunset spans multiple commits/sessions rather
  than landing atomically.
- The staged sequence and its bookkeeping live in `docs/features/LegacyFrontendSunset.md`.
