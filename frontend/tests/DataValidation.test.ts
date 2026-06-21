import {describe, expect, it} from "vitest";
import {SummaryComponent} from "../src/components/SummaryComponent";
import {AllGamesComponent} from "../src/components/AllGamesComponent";
import {GameData} from "../src/types/GameData";
import {GameDataValidationError, validateGameData} from "../src/data/GameDataValidator";
import {mockData} from "./test-utils";
import {GamingTimeComponent} from "../src/components/GamingTimeComponent";
import {SessionHistoryComponent} from "../src/components/SessionHistoryComponent";

describe("Data Validation", () => {
    const malformedData = {
        games: [null],
        session_history: [null],
        gaming_pcs: [null],
        daily_playtime: [null],
        export_date: "2026-04-24 14:46:39",
        hash: "somehash"
    } as unknown as GameData;
    it("SummaryComponent should handle null game entries and show error", () => {
        const component = new SummaryComponent();
        const html = component.render(malformedData);
        expect(html).toContain("Error");
        expect(html).toContain("invalid entries");
    });
    it("AllGamesComponent should handle null game entries and show error", () => {
        const component = new AllGamesComponent();
        const html = component.render(malformedData);
        expect(html).toContain("Error");
        expect(html).toContain("invalid entries");
    });

    it("normalizes a valid export into the current schema", () => {
        const result = validateGameData(mockData);

        expect(result.data).toEqual(mockData);
        expect(result.warnings).toEqual([]);
    });

    it("accepts exports created before schema versioning", () => {
        const legacyData = {...mockData} as Partial<GameData>;
        delete legacyData.schema_version;

        expect(validateGameData(legacyData).data.schema_version).toBe(1);
    });

    it("rejects unsupported schema versions", () => {
        expect(() => validateGameData({...mockData, schema_version: 2}))
            .toThrow(GameDataValidationError);
    });

    it("rejects exports with missing top-level collections", () => {
        const {daily_playtime: _, ...missingDailyPlaytime} = mockData;

        expect(() => validateGameData(missingDailyPlaytime))
            .toThrow('Data field "daily_playtime" must be an array.');
    });

    it("filters malformed entries and reports each affected collection", () => {
        const result = validateGameData({
            ...mockData,
            games: [...mockData.games, null, {name: ""}],
            session_history: [...mockData.session_history, null]
        });

        expect(result.data.games).toHaveLength(mockData.games.length);
        expect(result.data.session_history).toHaveLength(mockData.session_history.length);
        expect(result.warnings).toEqual([
            "games: ignored 2 invalid entries.",
            "session_history: ignored 1 invalid entry."
        ]);
    });

    it("renders explicit empty states for collection views", () => {
        const emptyData: GameData = {
            schema_version: 1,
            games: [],
            session_history: [],
            daily_playtime: [],
            gaming_pcs: []
        };

        expect(new AllGamesComponent().render(emptyData)).toContain("No games found");
        expect(new GamingTimeComponent().render(emptyData)).toContain("No daily playtime data found");
        expect(new SessionHistoryComponent().render(emptyData)).toContain("No session history was found");
    });

    it("normalizes negative counters and rejects negative history values", () => {
        const result = validateGameData({
            ...mockData,
            games: [{...mockData.games[0], play_time: -20, session_count: -1}],
            session_history: [{game_name: "Game A", start_time: 100, duration: -5}],
            daily_playtime: [{play_date: "2023-01-01", play_time: -10}]
        });

        expect(result.data.games[0].play_time).toBe(0);
        expect(result.data.games[0].session_count).toBe(0);
        expect(result.data.session_history).toEqual([]);
        expect(result.data.daily_playtime).toEqual([]);
    });
});
