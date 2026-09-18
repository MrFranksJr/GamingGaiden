import {describe, expect, it} from "vitest";
import {
    SummaryStatsCalculator,
    categorizeGameStatus,
    formatRecentDuration,
    formatRelativeTime,
    getGameInitials
} from "../src/utils/SummaryStatsCalculator";
import {GameData} from "../src/types/GameData";

describe("SummaryStatsCalculator", () => {
    describe("Helper functions", () => {
        it("categorizes game status properly", () => {
            expect(categorizeGameStatus({
                name: "G_Forever",
                play_time: 200,
                session_count: 5,
                status: "forever",
                completed: "FALSE"
            })).toBe("Forever");
            expect(categorizeGameStatus({
                name: "G_Forever_Cap",
                play_time: 200,
                session_count: 5,
                status: "Forever",
                completed: "TRUE"
            })).toBe("Forever");
            expect(categorizeGameStatus({
                name: "G1",
                play_time: 100,
                session_count: 2,
                status: "finished",
                completed: "TRUE"
            })).toBe("Completed");
            expect(categorizeGameStatus({
                name: "G2",
                play_time: 100,
                session_count: 2,
                status: "completed",
                completed: "FALSE"
            })).toBe("Completed");
            expect(categorizeGameStatus({
                name: "G3",
                play_time: 0,
                session_count: 0,
                status: "done",
                completed: "FALSE"
            })).toBe("Completed");
            expect(categorizeGameStatus({
                name: "G4_Dropped_With_Completed_True",
                play_time: 100,
                session_count: 2,
                status: "dropped",
                completed: "TRUE"
            })).toBe("Dropped");
            expect(categorizeGameStatus({
                name: "G5",
                play_time: 100,
                session_count: 2,
                status: "abandoned",
                completed: "FALSE"
            })).toBe("Dropped");
            expect(categorizeGameStatus({
                name: "G_Hold",
                play_time: 30,
                session_count: 1,
                status: "hold",
                completed: "TRUE"
            })).toBe("On Hold");
            expect(categorizeGameStatus({
                name: "G_OnHold_Label",
                play_time: 30,
                session_count: 1,
                status: "On Hold",
                completed: "FALSE"
            })).toBe("On Hold");
            expect(categorizeGameStatus({
                name: "G_ToBePickedUp",
                play_time: 30,
                session_count: 1,
                status: "to be picked up later",
                completed: "TRUE"
            })).toBe("On Hold");
            expect(categorizeGameStatus({
                name: "G6",
                play_time: 100,
                session_count: 2,
                status: "playing",
                completed: "FALSE"
            })).toBe("In Progress");
            expect(categorizeGameStatus({
                name: "G7",
                play_time: 50,
                session_count: 1,
                status: "",
                completed: "FALSE"
            })).toBe("In Progress");
            expect(categorizeGameStatus({
                name: "G8_Newly_Added",
                play_time: 0,
                session_count: 0,
                status: "",
                completed: "FALSE"
            })).toBe("In Progress");
        });

        it("extracts initials correctly", () => {
            expect(getGameInitials("Helldivers 2")).toBe("H2");
            expect(getGameInitials("Cyberpunk 2077")).toBe("C2");
            expect(getGameInitials("Brotato")).toBe("BR");
            expect(getGameInitials("")).toBe("?");
            expect(getGameInitials("A")).toBe("A");
            expect(getGameInitials("METAL GEAR SOLID Δ: SNAKE EATER")).toBe("MG");
        });

        it("formats recent duration badges", () => {
            expect(formatRecentDuration(45)).toBe("+45 m");
            expect(formatRecentDuration(60)).toBe("+1 h");
            expect(formatRecentDuration(120)).toBe("+2 h");
            expect(formatRecentDuration(150)).toBe("+2h 30m");
            expect(formatRecentDuration(0)).toBe("+0 m");
        });

        it("formats relative timestamps", () => {
            const now = new Date("2026-09-18T12:00:00Z");

            // 30 seconds ago
            expect(formatRelativeTime(new Date("2026-09-18T11:59:40Z").toISOString(), now)).toBe("Just now");
            // 15 mins ago
            expect(formatRelativeTime(new Date("2026-09-18T11:45:00Z").toISOString(), now)).toBe("Played 15m ago");
            // 2 hours ago
            expect(formatRelativeTime(new Date("2026-09-18T10:00:00Z").toISOString(), now)).toBe("Played 2h ago");
            // 1 day ago (yesterday)
            expect(formatRelativeTime(new Date("2026-09-17T10:00:00Z").toISOString(), now)).toBe("Yesterday");
            // 3 days ago
            expect(formatRelativeTime(new Date("2026-09-15T10:00:00Z").toISOString(), now)).toBe("Played 3 days ago");
            // 2 weeks ago
            expect(formatRelativeTime(new Date("2026-09-01T10:00:00Z").toISOString(), now)).toBe("Played 2 weeks ago");
            // Invalid date
            expect(formatRelativeTime("invalid-date", now)).toBe("Recently");
        });

        it("formats relative timestamps using UNIX epoch seconds (DB format)", () => {
            // Reference time: 2026-09-18T12:00:00Z -> 1789732800 seconds
            const nowEpochSeconds = 1789732800;
            const now = new Date(nowEpochSeconds * 1000);

            // 45 seconds ago (numeric seconds)
            expect(formatRelativeTime(nowEpochSeconds - 45, now)).toBe("Just now");
            // 30 minutes ago (numeric seconds)
            expect(formatRelativeTime(nowEpochSeconds - 1800, now)).toBe("Played 30m ago");
            // 2 hours ago (numeric seconds)
            expect(formatRelativeTime(nowEpochSeconds - 7200, now)).toBe("Played 2h ago");
            // 2 hours ago (stringified seconds)
            expect(formatRelativeTime(String(nowEpochSeconds - 7200), now)).toBe("Played 2h ago");
            // 24 hours ago (yesterday)
            expect(formatRelativeTime(nowEpochSeconds - 86400, now)).toBe("Yesterday");
            // 4 days ago
            expect(formatRelativeTime(nowEpochSeconds - 4 * 86400, now)).toBe("Played 4 days ago");
            // 2 weeks ago
            expect(formatRelativeTime(nowEpochSeconds - 14 * 86400, now)).toBe("Played 2 weeks ago");
        });

        it("demonstrates timezone-invariant elapsed time calculation", () => {
            // Suppose a session occurred at 10:00 UTC (Unix timestamp: 1789725600)
            const sessionUnixSeconds = 1789725600; // 2026-09-18T10:00:00Z

            // In UTC: local time is 12:00 UTC (2 hours elapsed)
            // In UTC+2 (e.g., CEST): session was at 12:00 local, current local time is 14:00 (2 hours elapsed)
            // In UTC-5 (e.g., EST): session was at 05:00 local, current local time is 07:00 (2 hours elapsed)
            // Regardless of user timezone, current instant is 2026-09-18T12:00:00Z (timestamp 1789732800)
            const referenceNow = new Date("2026-09-18T12:00:00Z");

            expect(formatRelativeTime(sessionUnixSeconds, referenceNow)).toBe("Played 2h ago");
            expect(formatRelativeTime(String(sessionUnixSeconds), referenceNow)).toBe("Played 2h ago");
            expect(formatRelativeTime(sessionUnixSeconds * 1000, referenceNow)).toBe("Played 2h ago");
            expect(formatRelativeTime("2026-09-18T10:00:00Z", referenceNow)).toBe("Played 2h ago");
        });
    });

    describe("Lifetime Statistics Calculation", () => {
        it("computes stats for normal datasets", () => {
            const data: GameData = {
                schema_version: 1,
                games: [
                    {
                        name: "Game 1",
                        play_time: 120,
                        session_count: 2,
                        status: "playing",
                        completed: "FALSE",
                        icon_path: "path/1.jpg"
                    },
                    {
                        name: "Game 2",
                        play_time: 60,
                        session_count: 1,
                        status: "finished",
                        completed: "TRUE",
                        icon_path: "path/2.jpg"
                    },
                    {name: "Game 3", play_time: 0, session_count: 0, status: "", completed: "FALSE"}
                ],
                session_history: [
                    {game_name: "Game 1", start_time: "2026-09-18T10:00:00Z", duration: 60},
                    {game_name: "Game 1", start_time: "2026-09-17T10:00:00Z", duration: 60},
                    {game_name: "Game 2", start_time: "2026-09-10T10:00:00Z", duration: 60}
                ],
                daily_playtime: [],
                gaming_pcs: []
            };

            const now = new Date("2026-09-18T12:00:00Z");
            const metrics = SummaryStatsCalculator.compute(data, now);

            expect(metrics.stats.totalGames).toBe(3);
            expect(metrics.stats.totalPlayTimeMinutes).toBe(180);
            expect(metrics.stats.totalPlayTimeHours).toBe(3);
            expect(metrics.stats.totalSessions).toBe(3);
            expect(metrics.stats.avgSessionMinutes).toBe(60);
            expect(metrics.stats.avgSessionFormatted).toBe("1h 0m");

            // Status breakdown
            expect(metrics.statusBreakdown.totalGames).toBe(3);
            const completed = metrics.statusBreakdown.statuses.find(s => s.category === "Completed");
            const inProgress = metrics.statusBreakdown.statuses.find(s => s.category === "In Progress");
            const onHold = metrics.statusBreakdown.statuses.find(s => s.category === "On Hold");
            const forever = metrics.statusBreakdown.statuses.find(s => s.category === "Forever");
            const dropped = metrics.statusBreakdown.statuses.find(s => s.category === "Dropped");
            expect(completed?.count).toBe(1);
            expect(completed?.percentage).toBe(33);
            expect(inProgress?.count).toBe(2);
            expect(inProgress?.percentage).toBe(67);
            expect(onHold?.count).toBe(0);
            expect(forever?.count).toBe(0);
            expect(dropped?.count).toBe(0);

            // Top Games
            expect(metrics.topGames.length).toBe(3);
            expect(metrics.topGames[0].name).toBe("Game 1");
            expect(metrics.topGames[0].playTimeHours).toBe(2);
            expect(metrics.topGames[0].iconPath).toBe("path/1.jpg");

            // Recent Activity
            expect(metrics.recentActivity.length).toBe(3);
            expect(metrics.recentActivity[0].gameName).toBe("Game 1");
            expect(metrics.recentActivity[0].relativeTime).toBe("Played 2h ago");
            expect(metrics.recentActivity[0].durationFormatted).toBe("+1 h");
            expect(metrics.recentActivity[0].iconPath).toBe("path/1.jpg");

            // Milestone
            expect(metrics.milestone.completedCount).toBe(1);
            expect(metrics.milestone.completionPercentage).toBe(33);
            expect(metrics.milestone.message).toContain("You've completed 1 game so far! That's 33% of your library. Keep going!");
            expect(metrics.milestone.annotation).toBe("*Excludes forever games");
        });

        it("excludes forever games from milestone calculations and includes all 5 statuses in breakdown", () => {
            const data: GameData = {
                schema_version: 1,
                games: [
                    {
                        name: "Helldivers 2",
                        play_time: 300,
                        session_count: 5,
                        status: "forever",
                        completed: "TRUE"
                    },
                    {
                        name: "Cyberpunk 2077",
                        play_time: 120,
                        session_count: 2,
                        status: "playing",
                        completed: "FALSE"
                    },
                    {
                        name: "Elden Ring",
                        play_time: 150,
                        session_count: 3,
                        status: "finished",
                        completed: "TRUE"
                    },
                    {
                        name: "Metal Gear Solid",
                        play_time: 50,
                        session_count: 1,
                        status: "hold",
                        completed: "TRUE"
                    },
                    {
                        name: "Concord",
                        play_time: 10,
                        session_count: 1,
                        status: "dropped",
                        completed: "TRUE"
                    }
                ],
                session_history: [],
                daily_playtime: [],
                gaming_pcs: []
            };

            const metrics = SummaryStatsCalculator.compute(data);

            // Total games is 5
            expect(metrics.stats.totalGames).toBe(5);

            // Status Breakdown contains all 5 categories
            expect(metrics.statusBreakdown.totalGames).toBe(5);
            const foreverStatus = metrics.statusBreakdown.statuses.find(s => s.category === "Forever");
            const completedStatus = metrics.statusBreakdown.statuses.find(s => s.category === "Completed");
            const inProgressStatus = metrics.statusBreakdown.statuses.find(s => s.category === "In Progress");
            const onHoldStatus = metrics.statusBreakdown.statuses.find(s => s.category === "On Hold");
            const droppedStatus = metrics.statusBreakdown.statuses.find(s => s.category === "Dropped");

            expect(foreverStatus?.count).toBe(1);
            expect(foreverStatus?.percentage).toBe(20);
            expect(foreverStatus?.color).toBe("#a855f7");

            expect(completedStatus?.count).toBe(1);
            expect(completedStatus?.percentage).toBe(20);

            expect(inProgressStatus?.count).toBe(1);
            expect(inProgressStatus?.percentage).toBe(20);

            expect(onHoldStatus?.count).toBe(1);
            expect(onHoldStatus?.percentage).toBe(20);
            expect(onHoldStatus?.color).toBe("#f59e0b");

            expect(droppedStatus?.count).toBe(1);
            expect(droppedStatus?.percentage).toBe(20);
            expect(droppedStatus?.color).toBe("#ef4444");

            // Milestone excludes the 1 forever game (eligible = 5 - 1 = 4, completed = 1 => 25%)
            expect(metrics.milestone.totalGames).toBe(5);
            expect(metrics.milestone.foreverCount).toBe(1);
            expect(metrics.milestone.eligibleGames).toBe(4);
            expect(metrics.milestone.completedCount).toBe(1);
            expect(metrics.milestone.completionPercentage).toBe(25);
            expect(metrics.milestone.annotation).toBe("*Excludes 1 forever game");
        });

        it("handles milestone when all games are forever games", () => {
            const data: GameData = {
                schema_version: 1,
                games: [
                    {
                        name: "Helldivers 2",
                        play_time: 300,
                        session_count: 5,
                        status: "forever",
                        completed: "FALSE"
                    },
                    {
                        name: "Counter Strike 2",
                        play_time: 500,
                        session_count: 10,
                        status: "forever",
                        completed: "FALSE"
                    }
                ],
                session_history: [],
                daily_playtime: [],
                gaming_pcs: []
            };

            const metrics = SummaryStatsCalculator.compute(data);
            expect(metrics.milestone.totalGames).toBe(2);
            expect(metrics.milestone.foreverCount).toBe(2);
            expect(metrics.milestone.eligibleGames).toBe(0);
            expect(metrics.milestone.completionPercentage).toBe(0);
            expect(metrics.milestone.message).toBe("All games in your library are forever games.");
            expect(metrics.milestone.annotation).toBe("*Excludes 2 forever games");
        });

        it("handles empty or null datasets gracefully", () => {
            const metricsNull = SummaryStatsCalculator.compute(null);
            expect(metricsNull.stats.totalGames).toBe(0);
            expect(metricsNull.stats.totalPlayTimeMinutes).toBe(0);
            expect(metricsNull.stats.totalSessions).toBe(0);
            expect(metricsNull.stats.avgSessionMinutes).toBe(0);
            expect(metricsNull.topGames).toEqual([]);
            expect(metricsNull.recentActivity).toEqual([]);
            expect(metricsNull.milestone.message).toBe("Your library is empty. Add games to track milestones!");

            const metricsEmpty = SummaryStatsCalculator.compute({
                schema_version: 1,
                games: [],
                session_history: [],
                daily_playtime: [],
                gaming_pcs: []
            });
            expect(metricsEmpty.stats.totalGames).toBe(0);
        });

        it("calculates year-over-year deltas when previous year data exists", () => {
            const data: GameData = {
                schema_version: 1,
                games: [
                    {name: "Game A", play_time: 200, session_count: 4, status: "playing", completed: "FALSE"},
                    {name: "Game B", play_time: 100, session_count: 2, status: "playing", completed: "FALSE"}
                ],
                session_history: [
                    // 2026 sessions (current)
                    {game_name: "Game A", start_time: "2026-05-01T10:00:00Z", duration: 120},
                    {game_name: "Game B", start_time: "2026-06-01T10:00:00Z", duration: 60},
                    // 2025 sessions (previous)
                    {game_name: "Game A", start_time: "2025-05-01T10:00:00Z", duration: 60}
                ],
                daily_playtime: [],
                gaming_pcs: []
            };

            const now = new Date("2026-09-18T12:00:00Z");
            const metrics = SummaryStatsCalculator.compute(data, now);

            expect(metrics.stats.gamesDelta?.text).toBe("+1 vs last year");
            expect(metrics.stats.playTimeDelta?.text).toBe("+2h vs last year");
            expect(metrics.stats.sessionsDelta?.text).toBe("+1 vs last year");
            expect(metrics.stats.avgSessionDelta?.text).toBe("+30m vs last year");
        });

        it("handles missing previous year sessions with current year fallback", () => {
            const data: GameData = {
                schema_version: 1,
                games: [
                    {name: "Game A", play_time: 120, session_count: 2, status: "playing", completed: "FALSE"}
                ],
                session_history: [
                    {game_name: "Game A", start_time: "2026-05-01T10:00:00Z", duration: 120}
                ],
                daily_playtime: [],
                gaming_pcs: []
            };

            const now = new Date("2026-09-18T12:00:00Z");
            const metrics = SummaryStatsCalculator.compute(data, now);

            expect(metrics.stats.gamesDelta?.text).toBe("+1 this year");
            expect(metrics.stats.playTimeDelta?.text).toBe("+2h this year");
            expect(metrics.stats.sessionsDelta?.text).toBe("+1 this year");
            expect(metrics.stats.avgSessionDelta?.text).toBe("2h avg this year");
        });

        it("returns all games as bubbles sorted by playtime with rank and isTop10 flag", () => {
            const games = Array.from({length: 15}, (_, i) => ({
                name: `Game ${i + 1}`,
                play_time: (i + 1) * 10,
                session_count: 1,
                status: "playing",
                completed: "FALSE"
            }));

            const data: GameData = {
                schema_version: 1,
                games,
                session_history: [],
                daily_playtime: [],
                gaming_pcs: []
            };

            const metrics = SummaryStatsCalculator.compute(data);
            expect(metrics.topGames.length).toBe(15);
            expect(metrics.topGames[0].name).toBe("Game 15");
            expect(metrics.topGames[0].rank).toBe(1);
            expect(metrics.topGames[0].isTop10).toBe(true);

            expect(metrics.topGames[9].name).toBe("Game 6");
            expect(metrics.topGames[9].rank).toBe(10);
            expect(metrics.topGames[9].isTop10).toBe(true);

            expect(metrics.topGames[10].name).toBe("Game 5");
            expect(metrics.topGames[10].rank).toBe(11);
            expect(metrics.topGames[10].isTop10).toBe(false);

            expect(metrics.topGames[14].name).toBe("Game 1");
            expect(metrics.topGames[14].rank).toBe(15);
            expect(metrics.topGames[14].isTop10).toBe(false);
        });
    });
});
