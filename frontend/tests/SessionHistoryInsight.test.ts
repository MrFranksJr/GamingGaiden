import {describe, expect, it} from "vitest";
import {GameData, Session} from "../src/types/GameData";
import {
    RANK_TOP_N_DAY,
    RANK_TOP_PCT_DAY,
    RANK_TOP_N_MONTH,
    RATIO_ABOVE,
    RATIO_BELOW,
    VARIETY_MIN_GAMES,
    buildDayInsight,
    buildMonthInsight,
    firstInsightPick
} from "../src/utils/SessionHistoryStatsCalculator";

function s(gameName: string, startTime: string, duration: number): Session {
    return {game_name: gameName, start_time: startTime, duration};
}

function dataOf(sessions: Session[]): GameData {
    // Provide a couple of games so "most-played game" factoids can resolve names/icons.
    const names = Array.from(new Set(sessions.map((x) => x.game_name)));
    return {
        schema_version: 1,
        games: names.map((n) => ({
            name: n,
            play_time: 999,
            session_count: 99,
            status: "playing",
            completed: false,
            icon_path: null
        })),
        session_history: sessions,
        daily_playtime: [],
        gaming_pcs: []
    };
}

// Build N filler active days in the SAME month/year at a fixed low total, so we can
// control ranking and averages precisely. Days are Feb 2025, day 1..count.
function fillerDays(count: number, minutesEach: number): Session[] {
    const out: Session[] = [];
    for (let i = 1; i <= count; i++) {
        const dd = i < 10 ? `0${i}` : `${i}`;
        out.push(s("Filler", `2025-02-${dd} 09:00`, minutesEach));
    }
    return out;
}

describe("insight tuning constants", () => {
    it("exposes the revised thresholds", () => {
        expect(RANK_TOP_N_DAY).toBe(3);
        expect(RANK_TOP_PCT_DAY).toBeCloseTo(0.1);
        expect(RANK_TOP_N_MONTH).toBe(1);
        expect(RATIO_ABOVE).toBeCloseTo(1.2);
        expect(RATIO_BELOW).toBeCloseTo(0.8);
        expect(VARIETY_MIN_GAMES).toBe(2);
    });
});

describe("buildDayInsight - milestone tier", () => {
    it("returns null for an empty day", () => {
        const data = dataOf([s("Game A", "2025-04-16 09:00", 120)]);
        expect(buildDayInsight(data, "2025-04-17")).toBeNull();
    });

    it("labels the all-time biggest day as a record", () => {
        const data = dataOf([s("Game A", "2025-04-16 09:00", 600), ...fillerDays(20, 60)]);
        const insight = buildDayInsight(data, "2025-04-16")!;
        expect(insight.type).toBe("record");
        expect(insight.icon).toBe("fa-trophy");
        expect(insight.headline).toBe("A personal best!");
        expect(insight.message).toContain("10h 0m");
    });
});

describe("buildDayInsight - rank cap (the bug that started this)", () => {
    it("does NOT call a mediocre day a rank milestone even though it technically ranks", () => {
        // 130 filler days at 200m; selected day at 96m -> well below average, deep mid/low pack.
        // Must NOT be type 'rank' or 'record'; should degrade to a factoid.
        const data = dataOf([s("Game A", "2025-04-16 09:00", 96), ...fillerDays(130, 200)]);
        const insight = buildDayInsight(data, "2025-04-16")!;
        expect(insight.type).not.toBe("rank");
        expect(insight.type).not.toBe("record");
    });

    it("allows a rank milestone only when top-3 AND within the top 10% of active days", () => {
        // 20 active days: three big days (500, 480, 460) then fillers at 60.
        // Selected = the #2 day (480). Top 3 and 2/20 = 10% -> qualifies.
        const data = dataOf([
            s("Game A", "2025-05-01 09:00", 500),
            s("Game A", "2025-05-02 09:00", 480), // selected: #2
            s("Game A", "2025-05-03 09:00", 460),
            ...fillerDays(17, 60)
        ]);
        const insight = buildDayInsight(data, "2025-05-02")!;
        expect(insight.type).toBe("rank");
        expect(insight.icon).toBe("fa-trophy");
        expect(insight.headline).toBe("Among the year's best!");
        expect(insight.message).toContain("#2");
    });

    it("rejects a top-3 day when it is NOT within the top 10% (too few competitors above the cap)", () => {
        // Only 5 active days: selected is #3. Top 3 by count, but 3/5 = 60% > 10% -> NOT a rank milestone.
        const data = dataOf([
            s("Game A", "2025-06-01 09:00", 500),
            s("Game A", "2025-06-02 09:00", 480),
            s("Game A", "2025-06-03 09:00", 300), // selected: #3 of 5
            s("Game A", "2025-06-04 09:00", 100),
            s("Game A", "2025-06-05 09:00", 90)
        ]);
        const insight = buildDayInsight(data, "2025-06-03")!;
        expect(insight.type).not.toBe("rank");
    });
});

describe("buildDayInsight - Did you know? factoids", () => {
    it("shows a factoid (not a superlative) for an ordinary above-average day", () => {
        // Selected day above average but not top-3/top-10%. Should be a factoid.
        // 30 filler days at 60m; a couple of big days above the selected so it is not #1..3.
        const data = dataOf([
            s("Game A", "2025-07-01 09:00", 400),
            s("Game A", "2025-07-02 09:00", 390),
            s("Game A", "2025-07-03 09:00", 380),
            s("Game A", "2025-07-04 09:00", 100), // selected: above avg-ish, not top 3
            ...fillerDays(30, 60)
        ]);
        const insight = buildDayInsight(data, "2025-07-04")!;
        expect(insight.type).toBe("factoid");
        expect(insight.icon).toBe("fa-circle-info");
        expect(insight.headline).toBe("Did you know?");
    });

    it("can surface the most-played game as a factoid", () => {
        // Ordinary two-game day (not the max), so it falls to the factoid tier.
        // Fillers at 300m keep the selected 120m day mid-pack (not a milestone).
        const data = dataOf([
            s("Game A", "2025-08-10 09:00", 90),
            s("Game B", "2025-08-10 14:00", 30),
            ...fillerDays(10, 300)
        ]);
        const insight = buildDayInsight(data, "2025-08-10")!;
        expect(insight.type).toBe("factoid");
        expect(insight.headline).toBe("Did you know?");
        expect(insight.message.length).toBeGreaterThan(0);
    });

    it("varies the factoid across repeated calls (true random, not seeded)", () => {
        // Ordinary day with several equally-true factoids (ratio-below, top game,
        // variety>=2 games, weekday, total-days). Random selection should yield
        // more than one distinct message over many calls.
        const data = dataOf([
            s("Game A", "2025-08-10 09:00", 90),
            s("Game B", "2025-08-10 14:00", 30),
            ...fillerDays(10, 300)
        ]);
        const messages = new Set<string>();
        for (let i = 0; i < 50; i++) {
            messages.add(buildDayInsight(data, "2025-08-10")!.message);
        }
        expect(messages.size).toBeGreaterThan(1);
    });
});

describe("insight determinism", () => {
    it("keeps a genuine milestone stable across calls (records never flicker away)", () => {
        const data = dataOf([s("Game A", "2025-04-16 09:00", 600), ...fillerDays(20, 60)]);
        for (let i = 0; i < 20; i++) {
            const insight = buildDayInsight(data, "2025-04-16")!;
            expect(insight.type).toBe("record");
            expect(insight.headline).toBe("A personal best!");
        }
    });

    it("renders a deterministic factoid when an explicit picker is injected (render seam)", () => {
        // Same fixture that produced multiple random factoids above; with the
        // first-candidate picker the message is stable, so a render test can
        // assert an exact insight instead of just "non-empty".
        const data = dataOf([
            s("Game A", "2025-08-10 09:00", 30),
            s("Game B", "2025-08-10 11:00", 30),
            ...fillerDays(10, 60)
        ]);
        const first = buildDayInsight(data, "2025-08-10", firstInsightPick)!;
        for (let i = 0; i < 10; i++) {
            expect(buildDayInsight(data, "2025-08-10", firstInsightPick)!.message).toBe(first.message);
        }
    });
});

describe("buildMonthInsight - milestone tier", () => {
    it("returns null for an empty month", () => {
        const data = dataOf([s("Game A", "2025-04-16 09:00", 120)]);
        expect(buildMonthInsight(data, "2025-05")).toBeNull();
    });

    it("labels the biggest month as a record", () => {
        const data = dataOf([
            s("Game A", "2025-04-16 09:00", 600),
            s("Game A", "2025-03-03 09:00", 60),
            s("Game A", "2025-02-01 09:00", 60)
        ]);
        const insight = buildMonthInsight(data, "2025-04")!;
        expect(insight.type).toBe("record");
        expect(insight.headline).toBe("A record month!");
        expect(insight.message).toContain("10h 0m");
    });

    it("only calls #1 a month milestone; #2+ degrades to a factoid or neutral", () => {
        // 4 active months; selected is #2. Month rank requires #1 only -> not a rank milestone.
        const data = dataOf([
            s("Game A", "2025-01-05 09:00", 600), // #1
            s("Game A", "2025-02-05 09:00", 400), // selected #2
            s("Game A", "2025-03-05 09:00", 200),
            s("Game A", "2025-04-05 09:00", 100)
        ]);
        const insight = buildMonthInsight(data, "2025-02")!;
        expect(insight.type).not.toBe("rank");
        expect(insight.type).not.toBe("record");
    });

    it("labels the #1 month as a rank milestone when it is not also the all-time record baseline is same", () => {
        // The single biggest month is BOTH #1 and the all-time max, so record wins (tier 0 record beats rank).
        const data = dataOf([
            s("Game A", "2025-01-05 09:00", 600),
            s("Game A", "2025-02-05 09:00", 400),
            s("Game A", "2025-03-05 09:00", 200)
        ]);
        const insight = buildMonthInsight(data, "2025-01")!;
        // #1 month that is also the all-time max is reported as a record (record outranks rank).
        expect(insight.type).toBe("record");
    });
});
