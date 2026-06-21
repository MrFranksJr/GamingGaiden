import {describe, expect, it} from "vitest";
import {AllGamesComponent} from "../src/components/AllGamesComponent";
import {GameDetailComponent} from "../src/components/GameDetailComponent";
import {GamingTimeComponent} from "../src/components/GamingTimeComponent";
import {SessionHistoryComponent} from "../src/components/SessionHistoryComponent";
import {GameData} from "../src/types/GameData";
import {mockData} from "./test-utils";

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
        const names = Array.from(document.querySelectorAll(".game-name a"), element => element.textContent);
        expect(names).toEqual(["Game A", "Game B"]);
    });

    it("sorts recent sessions newest first before rendering", () => {
        document.body.innerHTML = new SessionHistoryComponent().render(shuffledData);
        const starts = Array.from(document.querySelectorAll(".session-start"), element => element.textContent);
        expect(starts).toEqual(["300", "200", "100"]);
    });

    it("sorts daily playtime newest first before rendering", () => {
        document.body.innerHTML = new GamingTimeComponent().render(shuffledData);
        const dates = Array.from(document.querySelectorAll(".daily-date"), element => element.textContent);
        expect(dates).toEqual(["2023-01-03", "2023-01-02", "2023-01-01"]);
    });

    it("sorts a game's sessions newest first", () => {
        document.body.innerHTML = new GameDetailComponent().render(shuffledData, "Game A");
        const starts = Array.from(document.querySelectorAll(".detail-session-start"), element => element.textContent);
        expect(starts).toEqual(["300", "100"]);
    });
});
