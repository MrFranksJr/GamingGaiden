import {describe, expect, it} from "vitest";
import {AllGamesComponent} from "../src/components/AllGamesComponent";
import {mockData} from "./test-utils";
import {GameData} from "../src/types/GameData";

describe("AllGamesComponent", () => {
    it("should render a grid of game cards with posters", () => {
        const component = new AllGamesComponent();
        document.body.innerHTML = component.render(mockData);

        const grid = document.getElementById("all-games-grid");
        expect(grid).not.toBeNull();

        const cards = document.querySelectorAll(".game-card");
        expect(cards.length).toBe(2);

        const firstCard = cards[0] as HTMLAnchorElement;
        expect(firstCard.getAttribute("href")).toBe("#game-detail?name=Game%20A");
        expect(firstCard.querySelector(".game-card-title")?.textContent).toBe("Game A");

        const posterImg = firstCard.querySelector(".game-poster-img") as HTMLImageElement;
        expect(posterImg).not.toBeNull();
        expect(posterImg.src).toContain("resources/images/cache/Game_A.jpg");
        expect(posterImg.alt).toBe("Game A cover");
    });

    it("should render gradient fallback placeholder when cover art is missing or invalid", () => {
        const component = new AllGamesComponent();
        const dataWithMissingCover: GameData = {
            ...mockData,
            games: [{
                name: "Chrono Trigger",
                play_time: 120,
                session_count: 3,
                status: "finished",
                completed: "TRUE",
                icon_path: null
            }, {
                name: "Hollow Knight",
                play_time: 200,
                session_count: 10,
                status: "playing",
                completed: "FALSE",
                icon_path: ""
            }]
        };

        document.body.innerHTML = component.render(dataWithMissingCover);

        const cards = document.querySelectorAll(".game-card");
        expect(cards.length).toBe(2);

        const firstCard = cards[0];
        expect(firstCard.querySelector(".game-card-title")?.textContent).toBe("Chrono Trigger");
        const firstFallback = firstCard.querySelector(".poster-fallback");
        expect(firstFallback).not.toBeNull();
        expect(firstFallback?.querySelector(".fallback-initials")?.textContent).toBe("CT");

        const secondCard = cards[1];
        expect(secondCard.querySelector(".game-card-title")?.textContent).toBe("Hollow Knight");
        const secondFallback = secondCard.querySelector(".poster-fallback");
        expect(secondFallback).not.toBeNull();
        expect(secondFallback?.querySelector(".fallback-initials")?.textContent).toBe("HK");
    });

    it("should render graceful message when games list is empty", () => {
        const component = new AllGamesComponent();
        const emptyData: GameData = {
            ...mockData,
            games: []
        };
        const html = component.render(emptyData);
        expect(html).toBe("<p>No games found.</p>");
    });
});
