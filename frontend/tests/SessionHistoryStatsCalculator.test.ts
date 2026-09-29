import {describe, expect, it} from "vitest";
import {GameData} from "../src/types/GameData";
import {
    SESSION_COLOR_PALETTE,
    buildDayView,
    buildMonthView,
    daysWithData,
    monthsWithData,
    recentDaysWithData
} from "../src/utils/SessionHistoryStatsCalculator";

// Rich fixture: two days in April 2025, one day in March 2025.
// Game A played twice on Apr 16 (two sessions), Game B once; Game C on Apr 15; Game A on Mar 03.
const data: GameData = {
    schema_version: 1,
    games: [
        {
            name: "Game A",
            play_time: 300,
            session_count: 9,
            status: "playing",
            completed: "FALSE",
            icon_path: "resources/images/cache/Game_A.jpg"
        },
        {
            name: "Game B",
            play_time: 120,
            session_count: 3,
            status: "finished",
            completed: "TRUE",
            icon_path: "resources/images/cache/Game_B.jpg"
        },
        {name: "Game C", play_time: 60, session_count: 1, status: "dropped", completed: "FALSE", icon_path: null}
    ],
    session_history: [
        // Apr 16, 2025
        {game_name: "Game A", start_time: "2025-04-16 09:00", duration: 120}, // 2h
        {game_name: "Game A", start_time: "2025-04-16 14:00", duration: 60}, // 1h (same game again)
        {game_name: "Game B", start_time: "2025-04-16 20:00", duration: 60}, // 1h
        // Apr 15, 2025
        {game_name: "Game C", start_time: "2025-04-15 10:00", duration: 60}, // 1h
        // Mar 03, 2025
        {game_name: "Game A", start_time: "2025-03-03 18:00", duration: 120} // 2h
    ],
    daily_playtime: [
        {play_date: "2025-04-16", play_time: 240},
        {play_date: "2025-04-15", play_time: 60},
        {play_date: "2025-03-03", play_time: 120}
    ],
    gaming_pcs: []
};

describe("SessionHistoryStatsCalculator - day view", () => {
    it("returns per-session diary cards for the selected day, ordered by start time", () => {
        const view = buildDayView(data, "2025-04-16");
        expect(view.sessions).toHaveLength(3);
        expect(view.sessions.map((s) => s.gameName)).toEqual(["Game A", "Game A", "Game B"]);
        expect(view.sessions[0].timeRange).toBe("09:00\u201311:00");
        expect(view.sessions[0].durationFormatted).toBe("2h 0m");
        // status pill derives from the GAME, not the session
        expect(view.sessions[0].statusSlug).toBe("in-progress");
        expect(view.sessions[2].statusSlug).toBe("completed");
        // link target is by game name
        expect(view.sessions[0].detailHref).toBe("#game-detail?name=Game%20A");
    });

    it("aggregates per-game totals with percentages and colors for the sidebar", () => {
        const view = buildDayView(data, "2025-04-16");
        // Game A = 180m, Game B = 60m, total 240m
        expect(view.totalMinutes).toBe(240);
        expect(view.gamesPlayed.map((g) => g.gameName)).toEqual(["Game A", "Game B"]);
        expect(view.gamesPlayed[0].minutes).toBe(180);
        expect(view.gamesPlayed[0].percentage).toBe(75);
        expect(view.gamesPlayed[1].percentage).toBe(25);
        // index-based color, matching the bubble palette
        expect(view.gamesPlayed[0].color).toBe(SESSION_COLOR_PALETTE[0]);
        expect(view.gamesPlayed[1].color).toBe(SESSION_COLOR_PALETTE[1]);
    });

    it("computes day stats: distinct games, session count, avg session", () => {
        const view = buildDayView(data, "2025-04-16");
        expect(view.stats.gamesCount).toBe(2);
        expect(view.stats.sessionCount).toBe(3);
        expect(view.stats.totalFormatted).toBe("4h 0m");
        expect(view.stats.avgSessionMinutes).toBe(80); // 240/3
        expect(view.stats.avgSessionFormatted).toBe("1h 20m");
    });

    it("marks a day with no sessions as empty", () => {
        const view = buildDayView(data, "2025-04-17");
        expect(view.isEmpty).toBe(true);
        expect(view.sessions).toHaveLength(0);
        expect(view.totalMinutes).toBe(0);
    });
});

describe("SessionHistoryStatsCalculator - month view", () => {
    it("aggregates per-game cards for the selected month", () => {
        const view = buildMonthView(data, "2025-04");
        // April: Game A 180m, Game B 60m, Game C 60m
        expect(view.totalMinutes).toBe(300);
        expect(view.gamesPlayed.map((g) => g.gameName)).toEqual(["Game A", "Game B", "Game C"]);
        expect(view.gamesPlayed[0].minutes).toBe(180);
        expect(view.stats.gamesCount).toBe(3);
        expect(view.stats.sessionCount).toBe(4);
    });

    it("marks a month with no sessions as empty", () => {
        const view = buildMonthView(data, "2025-05");
        expect(view.isEmpty).toBe(true);
        expect(view.gamesPlayed).toHaveLength(0);
    });
});

describe("SessionHistoryStatsCalculator - calendar dot sets", () => {
    it("returns the set of day keys that have data", () => {
        const set = daysWithData(data);
        expect(set.has("2025-04-16")).toBe(true);
        expect(set.has("2025-04-15")).toBe(true);
        expect(set.has("2025-03-03")).toBe(true);
        expect(set.has("2025-04-17")).toBe(false);
    });

    it("returns the set of month keys that have data", () => {
        const set = monthsWithData(data);
        expect(set.has("2025-04")).toBe(true);
        expect(set.has("2025-03")).toBe(true);
        expect(set.has("2025-05")).toBe(false);
    });

    it("lists recent days with data, most recent first, with totals", () => {
        const recent = recentDaysWithData(data, 5);
        expect(recent[0].dayKey).toBe("2025-04-16");
        expect(recent[0].totalMinutes).toBe(240);
        expect(recent[0].totalFormatted).toBe("4h 0m");
        expect(recent[1].dayKey).toBe("2025-04-15");
        expect(recent[2].dayKey).toBe("2025-03-03");
    });
});
