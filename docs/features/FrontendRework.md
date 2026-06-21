# Feature: Frontend Rework (JSON Approach)
Rework the existing static UI into a more scalable, dynamic interface that uses client-side rendering with JSON data exports.

## Phase 0: Modular Architecture & Testing Setup
  - [x] **MANDATORY CHECK-IN: Do not proceed until user approval.**
- [x] **Design DataExport Module**: Following hexagonal principles, separate the data-fetching adapter (SQL) from the domain logic (data transformation).
  - Create `modules\DataExport.psm1` for JSON-specific business logic.
- [x] **Initialize Backend Unit Tests**: Set up Pester for the new PowerShell module.
  - `tests\backend\DataExport.Tests.ps1`: Validates JSON export logic.
  - `tests\backend\UIFunctions.Tests.ps1`: Validates SPA routing and integration logic.
- [x] **Initialize Frontend Unit Tests**: Set up Vitest for the new frontend module.
  - Location: `frontend\tests\`.
  - Focus on component rendering and data mapping logic.

## Phase 1: Data Export Module
  - [x] **MANDATORY CHECK-IN: Do not proceed until user approval.**
- [x] Implement `Export-GameDataToJson` in the new `DataExport` module.
  - Export `games`, `session_history`, and `gaming_pcs` tables into a structured `data.json` file.
- [x] Integrate JSON export into `UpdateAllStatsInBackground` in `UIFunctions.psm1`.
  - Ensure export happens only when changes are detected (performance optimization).

## Phase 2: Parallel Frontend Architecture
  - [x] **MANDATORY CHECK-IN: Do not proceed until user approval.**
- [x] Create `frontend\index.html` as the entry point for the new SPA (Single Page Application).
- [x] Implement a basic JS router (using URL hashes like `#all-games`, `#summary`).
- [x] Create template components for: All Games List, Summary Dashboard, Session History.
- [x] **Fresh Start Cleanup**: Removed all legacy JS/CSS to ensure a clean base.

## Phase 3: Dynamic Rendering
  - [x] **MANDATORY CHECK-IN: Do not proceed until user approval.**
- [x] Implement `fetch()` call in `frontend\src\app.ts` to load `data.json`.
- [x] Replace server-side HTML generation with client-side DOM manipulation.
- [x] Implement remaining components: Gaming Time, Game Detail Page.
- [x] Integrate the "Game Detail Page" logic into the SPA.
- [x] **Comprehensive Frontend Unit Tests**: Added Vitest tests for all new components and the router.
- [x] **Typed Architecture**:
  - Defined `GameData` interfaces in `frontend\src\types\`.
  - Converted all components and router to Vanilla TypeScript.
  - Implemented modular directory structure (`src/types/`, `src/components/`).

## Phase 4: Integration & "Flip the Switch"

- [x] **MANDATORY CHECK-IN: Do not proceed until user approval.**
- [x] Add a "Developer Mode" toggle to switch between the old static UI and new dynamic UI.
- [x] Update deployment scripts (`Build.ps1`, `Deploy.ps1`) to include the `frontend` directory.
- [x] Implement a TypeScript build step and resolve browser security restrictions for `file:///` URIs.
  - Switched from ES Modules to a bundled IIFE using `esbuild` to bypass CORS on local files.
  - Implemented a JS-based data fallback (`data.js`) to ensure reliable data loading in all browsers.
- [ ] Once stable, update the main app launch logic to point to `frontend\index.html`.
- [ ] Clean up legacy static rendering functions in `UIFunctions.psm1`.

## Stability foundation

- [x] Version and document the frontend data contract while accepting pre-versioned exports.
- [x] Validate and normalize exported data before it reaches view components.
- [x] Make JSON/JS export regeneration deterministic, including upgrades where `data.js` is missing.
- [x] Escape database-derived HTML and restrict exported image paths.
- [x] Make collection ordering deterministic before applying recent-item limits.
- [x] Cover the compiled bundle boot and Summary → All Games → Game Detail routing with exporter-generated data.
- [x] Keep the legacy frontend as the default path while the new frontend remains behind Developer Mode.

### Stable-foundation handoff

The new frontend foundation is considered stable for feature development. It provides versioned input validation,
deterministic local-file data transport, typed routing, safe rendering, explicit failure/empty states, deterministic
collection ordering, and a reproducible production bundle. Its integration suite boots that bundle with real exported
data and exercises Summary, All Games, and Game Detail navigation.

Verification commands:

```powershell
Set-Location frontend
npm test
npx tsc --noEmit
Set-Location ..
Invoke-Pester -Path tests\backend
```

Deliberate non-goals for this milestone are visual design, complete legacy feature parity, and removal of legacy HTML
generation. The legacy frontend remains the default production path; Developer Mode remains the opt-in boundary for
the new frontend.

## Developer Notes for Agents
- **Don't do stupid shit**: Do not create empty or unused folders (like `models`). Keep the workspace clean.
- **Technology Stack**: Vanilla TypeScript (Source in `frontend/src`, compiled to `frontend/resources/js`). Keep it
  simple, but as modular as possible using a Component pattern or ES6 Classes.
- **Centralized Utilities**: Keep utility functions (like time formatting) in `frontend/src/utils/` and ensure they are
  strictly typed. Avoid duplicating logic across components.
- **Single Responsibility Principle**: Ensure each module/component has one specific job (e.g., data fetching, list rendering, detail view).
- **TDD (Test-Driven Development)**: Follow a TDD approach: write a failing test first, then implement the minimal code to pass the test, and finally refactor.
- **Modular/Hexagonal Design**: Keep domain logic (e.g., transforming game stats) separate from infrastructure logic (SQL, File I/O). This allows for easy mocking in unit tests.
- **Data Validation & Error Handling**: Always assume exported data might be malformed (e.g., arrays containing nulls). UI components must validate/filter data before rendering, and the Router must handle errors gracefully to avoid hanging 'Loading...' states.
- **Test Separation**:
  - **Backend**: Use **Pester** for PowerShell logic. Tests reside in `tests\backend\`.
  - **Frontend**: Use **Vitest** for JavaScript logic and UI components. Tests reside in `tests\frontend\`.
- **Low Impact**: Do not remove old HTML templates or rendering functions until the new system is verified.
- **File Access**: The app uses `file:///` URIs, so ensure all paths remain relative.
- always make sure to run ALL tests when making changes, as to verify you didn't break anything
