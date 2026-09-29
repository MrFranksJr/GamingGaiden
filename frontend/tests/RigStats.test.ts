import {describe, it, expect} from "vitest";
import {GameData, GamingPC, Game} from "../src/types/GameData";
import {buildRigList, buildRigDetail} from "../src/utils/RigStatsCalculator";

// ---- fixtures ---------------------------------------------------------------

function dataOf(pcs: GamingPC[], games: Game[] = []): GameData {
    return {
        schema_version: 1,
        games,
        session_history: [],
        daily_playtime: [],
        gaming_pcs: pcs
    };
}

function pc(overrides: Partial<GamingPC> & {name: string}): GamingPC {
    return {
        in_use: "FALSE",
        cost: null,
        currency: null,
        start_date: 0,
        end_date: 0,
        total_play_time: 0,
        ...overrides
    };
}

function game(name: string, overrides: Partial<Game> = {}): Game {
    return {
        name,
        play_time: 0,
        session_count: 0,
        status: "playing",
        completed: "FALSE",
        ...overrides
    };
}

// ---- buildRigList: ordering & status ---------------------------------------

describe("buildRigList", () => {
    it("orders the in-use rig first, then retired rigs by most recent end_date", () => {
        const data = dataOf([
            pc({name: "OLDEST", in_use: "FALSE", end_date: 1_000}),
            pc({name: "CURRENT", in_use: "TRUE", end_date: 0}),
            pc({name: "RECENT", in_use: "FALSE", end_date: 5_000})
        ]);

        const rigs = buildRigList(data);

        expect(rigs.map((r) => r.name)).toEqual(["CURRENT", "RECENT", "OLDEST"]);
    });

    it("marks the in-use rig active and others retired", () => {
        const data = dataOf([
            pc({name: "CURRENT", in_use: "TRUE"}),
            pc({name: "OLD", in_use: "FALSE", end_date: 2_000})
        ]);

        const rigs = buildRigList(data);
        const current = rigs.find((r) => r.name === "CURRENT")!;
        const old = rigs.find((r) => r.name === "OLD")!;

        expect(current.isInUse).toBe(true);
        expect(old.isInUse).toBe(false);
    });

    it("returns an empty array when there are no rigs", () => {
        expect(buildRigList(dataOf([]))).toEqual([]);
    });
});

// ---- buildRigDetail: aggregation & honesty ---------------------------------

describe("buildRigDetail", () => {
    it("returns null for a rig that does not exist", () => {
        const data = dataOf([pc({name: "MINWU"})]);
        expect(buildRigDetail(data, "GHOST")).toBeNull();
    });

    it("uses the rig's stored total_play_time as the authoritative playtime headline", () => {
        // Stored total (500) deliberately differs from the sum of tagged game
        // play_time (120 + 60 = 180). The stored total must win.
        const data = dataOf(
            [pc({name: "MINWU", total_play_time: 500})],
            [
                game("A", {gaming_pc_name: "MINWU", play_time: 120, session_count: 3}),
                game("B", {gaming_pc_name: "MINWU", play_time: 60, session_count: 2})
            ]
        );

        const detail = buildRigDetail(data, "MINWU")!;

        expect(detail.totalPlayTimeMinutes).toBe(500);
    });

    it("counts games and sessions by aggregating the games tagged to the rig", () => {
        const data = dataOf(
            [pc({name: "MINWU", total_play_time: 500})],
            [
                game("A", {gaming_pc_name: "MINWU", session_count: 3}),
                game("B", {gaming_pc_name: "MINWU", session_count: 2}),
                game("C", {gaming_pc_name: "OTHER", session_count: 9})
            ]
        );

        const detail = buildRigDetail(data, "MINWU")!;

        expect(detail.gamesPlayed).toBe(2);
        expect(detail.sessionCount).toBe(5);
    });

    it("includes a game under every rig in its comma-joined gaming_pc_name", () => {
        const data = dataOf(
            [pc({name: "MINWU"}), pc({name: "OLDPC"})],
            [game("Shared", {gaming_pc_name: "MINWU,OLDPC", session_count: 4})]
        );

        expect(buildRigDetail(data, "MINWU")!.gamesPlayed).toBe(1);
        expect(buildRigDetail(data, "OLDPC")!.gamesPlayed).toBe(1);
    });

    it("does not attribute untagged games to any rig", () => {
        const data = dataOf([pc({name: "MINWU"})], [game("Untagged", {gaming_pc_name: null, session_count: 7})]);

        expect(buildRigDetail(data, "MINWU")!.gamesPlayed).toBe(0);
    });
});

// ---- buildRigDetail: cost & cost-per-hour ----------------------------------

describe("buildRigDetail cost", () => {
    it("shows raw cost with a trimmed currency symbol", () => {
        const data = dataOf([pc({name: "MINWU", cost: "2500", currency: "€ ", total_play_time: 600})]);

        const detail = buildRigDetail(data, "MINWU")!;

        expect(detail.cost.recorded).toBe(true);
        expect(detail.cost.formatted).toBe("€2500");
    });

    it("derives cost-per-hour from cost and stored playtime", () => {
        // 2400 minutes = 40 hours; €100 / 40h = €2.50/h
        const data = dataOf([pc({name: "MINWU", cost: "100", currency: "€", total_play_time: 2400})]);

        const detail = buildRigDetail(data, "MINWU")!;

        expect(detail.cost.perHourFormatted).toBe("€2.50/h");
    });

    it("exposes both the raw cost total and cost-per-hour when both are meaningful", () => {
        const data = dataOf([pc({name: "MINWU", cost: "100", currency: "€", total_play_time: 2400})]);

        const detail = buildRigDetail(data, "MINWU")!;

        // The UI shows the total as the headline and cost-per-hour as a sub-line.
        expect(detail.cost.formatted).toBe("€100");
        expect(detail.cost.perHourFormatted).toBe("€2.50/h");
    });

    it("marks cost as not recorded and suppresses cost-per-hour when cost is zero or blank", () => {
        const zero = buildRigDetail(dataOf([pc({name: "Z", cost: "0", total_play_time: 600})]), "Z")!;
        const blank = buildRigDetail(dataOf([pc({name: "B", cost: null, total_play_time: 600})]), "B")!;

        for (const detail of [zero, blank]) {
            expect(detail.cost.recorded).toBe(false);
            expect(detail.cost.perHourFormatted).toBeNull();
        }
    });

    it("suppresses cost-per-hour when there are zero hours of play", () => {
        const data = dataOf([pc({name: "MINWU", cost: "2500", currency: "€", total_play_time: 0})]);

        const detail = buildRigDetail(data, "MINWU")!;

        expect(detail.cost.recorded).toBe(true);
        expect(detail.cost.perHourFormatted).toBeNull();
    });
});

// ---- buildRigDetail: lifespan label ----------------------------------------

// 2021-01-15 and 2024-03-10 as epoch seconds (UTC midnight-ish; label uses local
// month/year which is stable for these mid-month dates in the test timezone).
const JAN_2021 = Date.UTC(2021, 0, 15) / 1000;
const MAR_2024 = Date.UTC(2024, 2, 10) / 1000;

describe("buildRigDetail lifespan", () => {
    it("shows a live age for an in-use rig, counted from start_date to now", () => {
        const now = new Date(Date.UTC(2024, 0, 15)); // exactly 3 years after start
        const data = dataOf([pc({name: "MINWU", in_use: "TRUE", start_date: JAN_2021, end_date: 0})]);

        const detail = buildRigDetail(data, "MINWU", now)!;

        expect(detail.lifespan.isOngoing).toBe(true);
        // Bare duration — the "In use" status pill already conveys the state,
        // so the lifespan line must not repeat it.
        expect(detail.lifespan.label).toBe("3 years");
    });

    it("shows a fixed service span for a retired rig", () => {
        const data = dataOf([pc({name: "OLD", in_use: "FALSE", start_date: JAN_2021, end_date: MAR_2024})]);

        const detail = buildRigDetail(data, "OLD")!;

        expect(detail.lifespan.isOngoing).toBe(false);
        expect(detail.lifespan.label).toBe("Jan 2021 – Mar 2024");
    });

    it("degrades gracefully when start_date is missing", () => {
        const data = dataOf([pc({name: "MYSTERY", in_use: "TRUE", start_date: 0, end_date: 0})]);

        const detail = buildRigDetail(data, "MYSTERY")!;

        expect(detail.lifespan.label).toBe("");
    });
});

// ---- buildRigDetail: games-on-rig ranked list ------------------------------

describe("buildRigDetail games list", () => {
    it("ranks the rig's games by play_time descending with a detail href and icon", () => {
        const data = dataOf(
            [pc({name: "MINWU", total_play_time: 300})],
            [
                game("Small", {gaming_pc_name: "MINWU", play_time: 60, icon_path: "resources/images/cache/Small.png"}),
                game("Big", {gaming_pc_name: "MINWU", play_time: 240}),
                game("Elsewhere", {gaming_pc_name: "OTHER", play_time: 999})
            ]
        );

        const list = buildRigDetail(data, "MINWU")!.games;

        expect(list.map((g) => g.gameName)).toEqual(["Big", "Small"]);
        expect(list[0].detailHref).toBe("#game-detail?name=Big");
        expect(list[1].iconPath).toBe("resources/images/cache/Small.png");
    });

    it("computes each game's share of the rig's total game playtime", () => {
        const data = dataOf(
            [pc({name: "MINWU", total_play_time: 300})],
            [
                game("Big", {gaming_pc_name: "MINWU", play_time: 240}),
                game("Small", {gaming_pc_name: "MINWU", play_time: 60})
            ]
        );

        const list = buildRigDetail(data, "MINWU")!.games;

        // Share is of the summed game playtime (300), independent of stored total.
        expect(list[0].percentage).toBe(80);
        expect(list[1].percentage).toBe(20);
    });

    it("includes a comma-tagged game in the rig's games list", () => {
        const data = dataOf([pc({name: "OLDPC"})], [game("Shared", {gaming_pc_name: "MINWU, OLDPC", play_time: 120})]);

        expect(buildRigDetail(data, "OLDPC")!.games.map((g) => g.gameName)).toEqual(["Shared"]);
    });
});
