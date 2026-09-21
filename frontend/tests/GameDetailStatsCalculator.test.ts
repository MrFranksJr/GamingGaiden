import {describe, it, expect} from "vitest";
import {
    calculateGameDetailStats,
    getTimeOfDaySlot,
    parseSessionDate,
    getStatusSlug,
    formatDateTime,
    formatDateOnly
} from "../src/utils/GameDetailStatsCalculator";
import {Game, Session} from "../src/types/GameData";

describe("GameDetailStatsCalculator", () => {
    describe("parseSessionDate & formatting helpers", () => {
        it("correctly parses Unix timestamps in seconds", () => {
            // 1771631171 -> 2026-02-20
            const date = parseSessionDate(1771631171);
            expect(date).toBeInstanceOf(Date);
            expect(date?.getFullYear()).toBe(2026);
        });

        it("correctly parses Unix timestamps in milliseconds", () => {
            const date = parseSessionDate(1771631171000);
            expect(date).toBeInstanceOf(Date);
            expect(date?.getFullYear()).toBe(2026);
        });

        it("correctly parses ISO string and numeric string timestamps", () => {
            const dateFromIso = parseSessionDate("2026-04-15T14:30:00Z");
            expect(dateFromIso).toBeInstanceOf(Date);
            expect(dateFromIso?.getUTCFullYear()).toBe(2026);

            const dateFromNumStr = parseSessionDate("1771631171");
            expect(dateFromNumStr).toBeInstanceOf(Date);
            expect(dateFromNumStr?.getFullYear()).toBe(2026);
        });

        it("handles invalid or empty dates gracefully", () => {
            expect(parseSessionDate(null)).toBeNull();
            expect(parseSessionDate(undefined)).toBeNull();
            expect(parseSessionDate("")).toBeNull();
            expect(parseSessionDate("invalid-date-string")).toBeNull();
            expect(parseSessionDate(-100)).toBeNull();
        });

        it("formats date and datetime correctly", () => {
            const d = new Date(2026, 3, 15, 14, 5); // Apr 15, 2026 14:05
            expect(formatDateOnly(d)).toBe("15-04-2026");
            expect(formatDateTime(d)).toBe("15-04-2026 14:05");
        });
    });

    describe("getTimeOfDaySlot", () => {
        it("classifies Morning (06:00 - 11:59)", () => {
            const d1 = new Date(2026, 0, 1, 6, 0);
            const d2 = new Date(2026, 0, 1, 11, 59);
            expect(getTimeOfDaySlot(d1)).toBe("Morning");
            expect(getTimeOfDaySlot(d2)).toBe("Morning");
        });

        it("classifies Afternoon (12:00 - 17:59)", () => {
            const d1 = new Date(2026, 0, 1, 12, 0);
            const d2 = new Date(2026, 0, 1, 17, 59);
            expect(getTimeOfDaySlot(d1)).toBe("Afternoon");
            expect(getTimeOfDaySlot(d2)).toBe("Afternoon");
        });

        it("classifies Evening (18:00 - 23:59)", () => {
            const d1 = new Date(2026, 0, 1, 18, 0);
            const d2 = new Date(2026, 0, 1, 23, 59);
            expect(getTimeOfDaySlot(d1)).toBe("Evening");
            expect(getTimeOfDaySlot(d2)).toBe("Evening");
        });

        it("classifies Night (00:00 - 05:59)", () => {
            const d1 = new Date(2026, 0, 1, 0, 0);
            const d2 = new Date(2026, 0, 1, 5, 59);
            expect(getTimeOfDaySlot(d1)).toBe("Night");
            expect(getTimeOfDaySlot(d2)).toBe("Night");
        });
    });

    describe("getStatusSlug", () => {
        it("returns the correct CSS status slug", () => {
            expect(getStatusSlug("Completed")).toBe("completed");
            expect(getStatusSlug("In Progress")).toBe("in-progress");
            expect(getStatusSlug("On Hold")).toBe("on-hold");
            expect(getStatusSlug("Forever")).toBe("forever");
            expect(getStatusSlug("Dropped")).toBe("dropped");
        });
    });

    describe("calculateGameDetailStats", () => {
        const sampleGame: Game = {
            name: "Hades II",
            play_time: 180,
            session_count: 3,
            status: "playing",
            completed: "FALSE",
            release_date: "2024-05-06",
            finish_date: null,
            icon_path: "resources/images/cache/Hades_II.jpg"
        };

        const sampleSessions: Session[] = [
            {
                id: 1,
                game_name: "Hades II",
                start_time: new Date(2026, 3, 10, 9, 30).getTime() / 1000, // Morning, Friday (weekday)
                duration: 45
            },
            {
                id: 2,
                game_name: "Hades II",
                start_time: new Date(2026, 3, 11, 15, 0).getTime() / 1000, // Afternoon, Saturday (weekend)
                duration: 90
            },
            {
                id: 3,
                game_name: "Hades II",
                start_time: new Date(2026, 3, 12, 20, 0).getTime() / 1000, // Evening, Sunday (weekend)
                duration: 45
            },
            {
                id: 4,
                game_name: "Another Game",
                start_time: new Date(2026, 3, 12, 21, 0).getTime() / 1000,
                duration: 60
            }
        ];

        it("aggregates playtime, sessions, and longest session correctly", () => {
            const refNow = new Date(2026, 3, 15);
            const stats = calculateGameDetailStats(sampleGame, sampleSessions, refNow);

            expect(stats.gameName).toBe("Hades II");
            expect(stats.totalPlayTimeMinutes).toBe(180);
            expect(stats.totalPlayTimeFormatted).toBe("3 Hr 0 Min");
            expect(stats.totalSessions).toBe(3);
            expect(stats.avgSessionMinutes).toBe(60); // (45 + 90 + 45) / 3 = 60
            expect(stats.avgSessionFormatted).toBe("1 Hr 0 Min");

            expect(stats.longestSession).not.toBeNull();
            expect(stats.longestSession?.durationMinutes).toBe(90);
            expect(stats.longestSession?.durationFormatted).toBe("1 Hr 30 Min");
            expect(stats.longestSession?.dateFormatted).toBe("11-04-2026");
        });

        it("calculates time-of-day distributions and weekday/weekend split", () => {
            const stats = calculateGameDetailStats(sampleGame, sampleSessions);

            const morning = stats.timeOfDay.find(t => t.slot === "Morning");
            const afternoon = stats.timeOfDay.find(t => t.slot === "Afternoon");
            const evening = stats.timeOfDay.find(t => t.slot === "Evening");
            const night = stats.timeOfDay.find(t => t.slot === "Night");

            expect(morning?.count).toBe(1);
            expect(afternoon?.count).toBe(1);
            expect(evening?.count).toBe(1);
            expect(night?.count).toBe(0);

            // Weekday: Friday (45 min)
            // Weekend: Sat (90 min) + Sun (45 min) = 135 min
            expect(stats.weekdayMinutes).toBe(45);
            expect(stats.weekendMinutes).toBe(135);
            expect(stats.weekdayPercentage).toBe(25); // 45 / 180 = 25%
            expect(stats.weekendPercentage).toBe(75); // 135 / 180 = 75%
        });

        it("generates timeline and recent sessions lists", () => {
            const stats = calculateGameDetailStats(sampleGame, sampleSessions);

            expect(stats.timeline.length).toBe(3);
            expect(stats.timeline[0].durationMinutes).toBe(45);
            expect(stats.timeline[1].durationMinutes).toBe(90);
            expect(stats.timeline[1].relativeHeight).toBe(1); // 90 / 90 = 1.0
            expect(stats.timeline[0].relativeHeight).toBe(0.5); // 45 / 90 = 0.5

            expect(stats.recentSessions.length).toBe(3);
            // Recent sessions are sorted descending (latest first)
            expect(stats.recentSessions[0].durationMinutes).toBe(45);
            expect(stats.recentSessions[1].durationMinutes).toBe(90);
            expect(stats.recentSessions[2].durationMinutes).toBe(45);
        });

        it("handles edge cases: game with 0 sessions", () => {
            const emptyGame: Game = {
                name: "Unplayed Game",
                play_time: 0,
                session_count: 0,
                status: "on hold",
                completed: "FALSE"
            };

            const stats = calculateGameDetailStats(emptyGame, []);

            expect(stats.totalPlayTimeMinutes).toBe(0);
            expect(stats.totalPlayTimeFormatted).toBe("0 Hr 0 Min");
            expect(stats.totalSessions).toBe(0);
            expect(stats.avgSessionMinutes).toBe(0);
            expect(stats.avgSessionFormatted).toBe("0 Hr 0 Min");
            expect(stats.longestSession).toBeNull();
            expect(stats.timeline.length).toBe(0);
            expect(stats.recentSessions.length).toBe(0);
            expect(stats.weekdayMinutes).toBe(0);
            expect(stats.weekendMinutes).toBe(0);
            expect(stats.weekdayPercentage).toBe(0);
            expect(stats.weekendPercentage).toBe(0);
            expect(stats.steamSearchUrl).toBe("https://store.steampowered.com/search/?term=Unplayed%20Game");
        });

        it("handles game with completed status and finish date", () => {
            const completedGame: Game = {
                name: "Elden Ring",
                play_time: 6000,
                session_count: 50,
                status: "finished",
                completed: "TRUE",
                finish_date: "2026-03-15",
                release_date: "2022-02-25"
            };

            const stats = calculateGameDetailStats(completedGame, []);

            expect(stats.statusCategory).toBe("Completed");
            expect(stats.statusSlug).toBe("completed");
            expect(stats.finishedDateFormatted).toBe("15-03-2026");
            expect(stats.releaseDateFormatted).toBe("25-02-2022");
        });
    });
});
