# Feature: Game Detail Page
Track the implementation of individual game detail pages. (Note: This feature is currently PARKED in favor of the Frontend Rework)`n
- [ ] Design GameDetails.html.template (or equivalent JSON-based component)
- [ ] Implement RenderGameDetails logic (or data export for details)
- [ ] Update RenderGameList to link game titles to detail pages
- [ ] Implement "Last Session" data retrieval
- [ ] Update build/update process to generate all detail pages (or export data)`n
## History & Status
This feature was originally planned as a static HTML generation task. However, to improve performance and scalability, the project is moving towards a JSON-based dynamic frontend. This plan is preserved for reference and will be integrated into the new architecture.`n
### Original Scope Adjustments
- **Playtime per PC**: Postponed due to missing historical pc_name in session_history.
- **Performance**: Static file generation for hundreds of games was identified as a bottleneck, leading to the JSON Approach decision.

## Developer Notes for Agents
- **TDD (Test-Driven Development)**: Follow a TDD approach: write a failing test first, then implement the minimal code to pass the test, and finally refactor.
- **JSON Compatibility**: Ensure that any data structures designed for the detail page are compatible with the `data.json` format used in the Frontend Rework.
- **Relative Paths**: Maintain relative paths for all assets (images, icons) to ensure the UI remains portable across `file:///` URIs.
