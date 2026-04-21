# Feature: Frontend Rework (JSON Approach)
Rework the existing static UI into a more scalable, dynamic interface that uses client-side rendering with JSON data exports.

## Phase 0: Modular Architecture & Testing Setup
- [ ] **Design DataExport Module**: Following hexagonal principles, separate the data-fetching adapter (SQL) from the domain logic (data transformation).
  - Create `modules\DataExport.psm1` for JSON-specific business logic.
- [ ] **Initialize Backend Unit Tests**: Set up Pester for the new PowerShell module.
  - Location: `tests\backend\DataExport.Tests.ps1`.
- [ ] **Initialize Frontend Unit Tests**: Set up Vitest for the new frontend module.
  - Location: `tests\frontend\`.
  - Focus on component rendering and data mapping logic.

## Phase 1: Data Export Module
- [ ] Implement `Export-GameDataToJson` in the new `DataExport` module.
  - Export `games`, `session_history`, and `gaming_pcs` tables into a structured `data.json` file.
- [ ] Integrate JSON export into `UpdateAllStatsInBackground` in `UIFunctions.psm1`.
  - Ensure export happens only when changes are detected (performance optimization).

## Phase 2: Parallel Frontend Architecture
- [ ] Create `ui\index.html` as the entry point for the new SPA (Single Page Application).
- [ ] Implement a basic JS router (using URL hashes like `#all-games`, `#summary`).
- [ ] Create template components for: All Games List, Summary Dashboard, Game Details.

## Phase 3: Dynamic Rendering
- [ ] Implement `fetch()` call in `ui\resources\js\app.js` to load `data.json`.
- [ ] Replace server-side HTML generation with client-side DOM manipulation.
- [ ] Integrate the "Game Detail Page" logic into the SPA.

## Phase 4: Integration & "Flip the Switch"
- [ ] Add a "Developer Mode" toggle to switch between the old static UI and new dynamic UI.
- [ ] Once stable, update the main app launch logic to point to `ui\index.html`.
- [ ] Clean up legacy static rendering functions in `UIFunctions.psm1`.

## Developer Notes for Agents
- **Technology Stack**: Vanilla TypeScript. Keep it simple, but as modular as possible using a Component pattern or ES6 Classes.
- **Single Responsibility Principle**: Ensure each module/component has one specific job (e.g., data fetching, list rendering, detail view).
- **TDD (Test-Driven Development)**: Follow a TDD approach: write a failing test first, then implement the minimal code to pass the test, and finally refactor.
- **Modular/Hexagonal Design**: Keep domain logic (e.g., transforming game stats) separate from infrastructure logic (SQL, File I/O). This allows for easy mocking in unit tests.
- **Test Separation**:
  - **Backend**: Use **Pester** for PowerShell logic. Tests reside in `tests\backend\`.
  - **Frontend**: Use **Vitest** for JavaScript logic and UI components. Tests reside in `tests\frontend\`.
- **Low Impact**: Do not remove old HTML templates or rendering functions until the new system is verified.
- **File Access**: The app uses `file:///` URIs, so ensure all paths remain relative.
