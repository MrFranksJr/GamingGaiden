import {describe, expect, it} from "vitest";
import {GAMES_PLAYED_PALETTE, GamePlayedRow, rankGamesPlayed} from "../src/utils/GamesPlayedRanking";

// A2: the ranked games-played view module. Before this, the aggregate->rank->
// colour->percentage->row logic and the colour palette were duplicated between
// SessionHistoryStatsCalculator (aggregateGames) and RigStatsCalculator
// (buildRigGames, which cross-imported the palette). These tests pin the one
// shared contract.

describe("rankGamesPlayed", () => {
    const input = [
        {gameName: "Beta", minutes: 60, iconPath: null},
        {gameName: "Alpha", minutes: 60, iconPath: "resources/images/cache/a.png"},
        {gameName: "Gamma", minutes: 180, iconPath: null}
    ];

    it("sorts by minutes descending, ties broken by name ascending", () => {
        const rows = rankGamesPlayed(input);
        expect(rows.map((r) => r.gameName)).toEqual(["Gamma", "Alpha", "Beta"]);
    });

    it("computes each row's percentage of the summed minutes (rounded integer)", () => {
        const rows = rankGamesPlayed(input);
        // total = 300; Gamma 180/300 = 60, Alpha 60/300 = 20, Beta 20
        expect(rows.find((r) => r.gameName === "Gamma")?.percentage).toBe(60);
        expect(rows.find((r) => r.gameName === "Alpha")?.percentage).toBe(20);
    });

    it("assigns palette colours by rank index", () => {
        const rows = rankGamesPlayed(input);
        expect(rows[0].color).toBe(GAMES_PLAYED_PALETTE[0]);
        expect(rows[1].color).toBe(GAMES_PLAYED_PALETTE[1]);
        expect(rows[2].color).toBe(GAMES_PLAYED_PALETTE[2]);
    });

    it("wraps palette colours past its length", () => {
        const many = Array.from({length: GAMES_PLAYED_PALETTE.length + 1}, (_, i) => ({
            gameName: `G${String(i).padStart(3, "0")}`,
            minutes: 1000 - i,
            iconPath: null
        }));
        const rows = rankGamesPlayed(many);
        expect(rows[GAMES_PLAYED_PALETTE.length].color).toBe(GAMES_PLAYED_PALETTE[0]);
    });

    it("formats minutes compactly and builds a game-detail href", () => {
        const rows = rankGamesPlayed([{gameName: "Elden Ring", minutes: 125, iconPath: null}]);
        expect(rows[0].formatted).toBe("2h 5m");
        expect(rows[0].detailHref).toBe("#game-detail?name=Elden%20Ring");
    });

    it("yields 0% for every row when total minutes is zero", () => {
        const rows = rankGamesPlayed([{gameName: "A", minutes: 0, iconPath: null}]);
        expect(rows[0].percentage).toBe(0);
    });

    it("returns an empty list for empty input", () => {
        expect(rankGamesPlayed([])).toEqual([]);
    });

    it("produces rows matching the GamePlayedRow shape", () => {
        const row: GamePlayedRow = rankGamesPlayed(input)[0];
        expect(Object.keys(row).sort()).toEqual(
            ["color", "detailHref", "formatted", "gameName", "iconPath", "minutes", "percentage"].sort()
        );
    });
});
