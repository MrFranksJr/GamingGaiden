# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026.03.21] - 2026-03-21

### Added
- Feature: Being able to add the release date of a game to the database. [[99827f0](https://github.com/kulvind3r/gaminggaiden/commit/99827f0aa508e487627742f3db7e9a878bcb59e8)]

### Changed
- Renamed "Games Per Platform" statistics page to "Games Per PC", now groups games by gaming PC instead of platform.
- Migration 8: Merge `idle_time` into `play_time`. [[ed5b3de](https://github.com/kulvind3r/gaminggaiden/commit/ed5b3ded905903d4a4c019c481bdfc4a53d78abf)]

### Removed
- Idle time feature from code and UI. [[8f3abdc](https://github.com/kulvind3r/gaminggaiden/commit/8f3abdc06f124ab6d004415cf2d03835adcfdee5)]
- Migration 9: Drop `idle_time` column from `games` table. [[aed9c47](https://github.com/kulvind3r/gaminggaiden/commit/aed9c47f72b2387fc7ed018332582524bfa0c3c8)]
- Emulator support: removed Add/Edit Emulator settings, PC vs Emulation statistics, emulated platforms database table, rom_based_name column, and all related UI/documentation.
- Migration 10: Drop `emulated_platforms` table and `rom_based_name` column from `games` table.

### Fixed
- Small edit to facilitate build tools. [[25376e8](https://github.com/kulvind3r/gaminggaiden/commit/25376e83e97ccc10eb9325fe63889c350d86bc32)]
