import {describe, expect, it} from "vitest";
import {AllGamesComponent} from "../src/components/AllGamesComponent";
import {GameDetailComponent} from "../src/components/GameDetailComponent";
import {MyRigsComponent} from "../src/components/MyRigsComponent";
import {SessionHistoryComponent} from "../src/components/SessionHistoryComponent";
import {GameData} from "../src/types/GameData";
import {mockData} from "./test-utils";
import {formatDateTime, parseSessionDate} from "../src/utils/GameDetailStatsCalculator";

describe("deterministic component ordering", () => {
    const shuffledData: GameData = {
        ...mockData,
        games: [...mockData.games].reverse(),
        session_history: [
            {game_name: "Game A", start_time: 300, duration: 30},
            {game_name: "Game A", start_time: 100, duration: 10},
            {game_name: "Game B", start_time: 200, duration: 20}
        ],
        daily_playtime: [
            {play_date: "2023-01-03", play_time: 30},
            {play_date: "2023-01-01", play_time: 10},
            {play_date: "2023-01-02", play_time: 20}
        ]
    };

    it("sorts the games list by name", () => {
        document.body.innerHTML = new AllGamesComponent().render(shuffledData);
        const names = Array.from(document.querySelectorAll(".game-card-title"), (element) => element.textContent);
        expect(names).toEqual(["Game A", "Game B"]);
    });

    it("sorts recent sessions newest first before rendering", () => {
        // The three shuffled sessions (epoch seconds 300/100/200) all fall on
        // 1970-01-01. Their diary cards for that day must be ordered by start
        // time ascending regardless of input order: 100 -> 200 -> 300.
        document.body.innerHTML = new SessionHistoryComponent().render(shuffledData, "view=day&date=1970-01-01");
        const games = Array.from(
            document.querySelectorAll(".session-diary-card .session-card-title"),
            (el) => el.textContent
        );
        // start 100 = Game A, 200 = Game B, 300 = Game A
        expect(games).toEqual(["Game A", "Game B", "Game A"]);
    });

    it("ranks a rig's games by playtime descending regardless of input order", () => {
        const rigData: GameData = {
            schema_version: 1,
            gaming_pcs: [
                {
                    name: "MINWU",
                    in_use: "TRUE",
                    cost: null,
                    currency: null,
                    start_date: 0,
                    end_date: 0,
                    total_play_time: 60
                }
            ],
            games: [
                {
                    name: "Low",
                    play_time: 10,
                    session_count: 1,
                    status: "playing",
                    completed: "FALSE",
                    gaming_pc_name: "MINWU"
                },
                {
                    name: "High",
                    play_time: 50,
                    session_count: 1,
                    status: "playing",
                    completed: "FALSE",
                    gaming_pc_name: "MINWU"
                }
            ],
            session_history: [],
            daily_playtime: []
        };
        document.body.innerHTML = new MyRigsComponent().render(rigData);
        const names = Array.from(document.querySelectorAll(".rig-games .games-played-name"), (el) => el.textContent);
        expect(names).toEqual(["High", "Low"]);
    });

    it("sorts a game's sessions newest first", () => {
        document.body.innerHTML = new GameDetailComponent().render(shuffledData, "Game A");
        const starts = Array.from(document.querySelectorAll(".detail-session-start"), (element) => element.textContent);
        expect(starts).toEqual([formatDateTime(parseSessionDate(300)!), formatDateTime(parseSessionDate(100)!)]);
    });
});
