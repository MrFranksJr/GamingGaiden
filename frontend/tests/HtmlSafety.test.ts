import {describe, expect, it} from "vitest";
import {AllGamesComponent} from "../src/components/AllGamesComponent";
import {GameDetailComponent} from "../src/components/GameDetailComponent";
import {SessionHistoryComponent} from "../src/components/SessionHistoryComponent";
import {GameData} from "../src/types/GameData";
import {mockData} from "./test-utils";

function renderIntoDocument(html: string): void {
    document.body.innerHTML = html;
}

describe("HTML rendering safety", () => {
    const hostileName = '<img id="injected" src=x onerror=alert(1)>';

    it("renders game fields as text and rejects unsafe icon paths", () => {
        const data: GameData = {
            ...mockData,
            games: [{
                ...mockData.games[0],
                name: hostileName,
                status: "<script>unsafe()</script>",
                icon_path: 'x" onerror="alert(1)'
            }]
        };

        renderIntoDocument(new AllGamesComponent().render(data));

        expect(document.getElementById("injected")).toBeNull();
        expect(document.querySelector("script")).toBeNull();
        expect(document.querySelector(".game-icon")).toBeNull();
        expect(document.querySelector(".game-name")?.textContent).toContain(hostileName);
        expect(document.querySelector(".game-status")?.textContent).toBe("<script>unsafe()</script>");
    });

    it("renders detail and session fields without creating injected elements", () => {
        const data: GameData = {
            ...mockData,
            games: [{...mockData.games[0], name: hostileName}],
            session_history: [{game_name: hostileName, start_time: "<svg id=injected>", duration: 10}]
        };

        renderIntoDocument(new GameDetailComponent().render(data, hostileName));
        expect(document.getElementById("injected")).toBeNull();
        expect(document.getElementById("detail-game-name")?.textContent).toBe(hostileName);

        renderIntoDocument(new SessionHistoryComponent().render(data));
        expect(document.getElementById("injected")).toBeNull();
        expect(document.querySelector(".session-start")?.textContent).toBe("<svg id=injected>");
    });

    it("escapes a missing game name in the not-found message", () => {
        renderIntoDocument(new GameDetailComponent().render(mockData, hostileName));

        expect(document.getElementById("injected")).toBeNull();
        expect(document.body.textContent).toContain(hostileName);
    });
});
