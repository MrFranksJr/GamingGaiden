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
    // Intentional XSS payload used to verify escaping; not real markup.
    // noinspection HtmlRequiredAltAttribute,HtmlUnknownTarget,HtmlDeprecatedAttribute
    const hostileName = '<img id="injected" src=x onerror=alert(1)>';

    it("renders game fields as text and rejects unsafe icon paths", () => {
        const data: GameData = {
            ...mockData,
            games: [
                {
                    ...mockData.games[0],
                    name: hostileName,
                    status: "<script>unsafe()</script>",
                    icon_path: 'x" onerror="alert(1)'
                }
            ]
        };

        renderIntoDocument(new AllGamesComponent().render(data));

        expect(document.getElementById("injected")).toBeNull();
        expect(document.querySelector("script")).toBeNull();
        expect(document.querySelector(".game-poster-img")).toBeNull();
        expect(document.querySelector(".game-card-title")?.textContent).toBe(hostileName);
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

        // A non-numeric hostile start_time parses to epoch 0 (1970-01-01); render that day.
        renderIntoDocument(new SessionHistoryComponent().render(data, "view=day&date=1970-01-01"));
        expect(document.getElementById("injected")).toBeNull();
        expect(document.querySelector("script")).toBeNull();
        // The hostile game name is rendered as escaped text inside the diary card.
        expect(document.querySelector(".session-diary-card .session-card-title")?.textContent).toBe(hostileName);
    });

    it("escapes a missing game name in the not-found message", () => {
        renderIntoDocument(new GameDetailComponent().render(mockData, hostileName));

        expect(document.getElementById("injected")).toBeNull();
        expect(document.body.textContent).toContain(hostileName);
    });
});
