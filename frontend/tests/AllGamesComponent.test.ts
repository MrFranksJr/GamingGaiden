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

        const firstStatusPill = firstCard.querySelector(".game-status-pill");
        expect(firstStatusPill).not.toBeNull();
        expect(firstStatusPill?.textContent).toBe("In Progress");
        expect(firstStatusPill?.classList.contains("status-in-progress")).toBe(true);

        const secondCard = cards[1] as HTMLAnchorElement;
        const secondStatusPill = secondCard.querySelector(".game-status-pill");
        expect(secondStatusPill).not.toBeNull();
        expect(secondStatusPill?.textContent).toBe("Completed");
        expect(secondStatusPill?.classList.contains("status-completed")).toBe(true);
    });

    it("should render status pill labels for all status categories", () => {
        const component = new AllGamesComponent();
        const testData: GameData = {
            ...mockData,
            games: [
                {
                    name: "Game 1",
                    play_time: 10,
                    session_count: 1,
                    status: "finished",
                    completed: "TRUE",
                    icon_path: null
                },
                {
                    name: "Game 2",
                    play_time: 10,
                    session_count: 1,
                    status: "playing",
                    completed: "FALSE",
                    icon_path: null
                },
                {
                    name: "Game 3",
                    play_time: 10,
                    session_count: 1,
                    status: "hold",
                    completed: "FALSE",
                    icon_path: null
                },
                {
                    name: "Game 4",
                    play_time: 10,
                    session_count: 1,
                    status: "forever",
                    completed: "FALSE",
                    icon_path: null
                },
                {
                    name: "Game 5",
                    play_time: 10,
                    session_count: 1,
                    status: "dropped",
                    completed: "FALSE",
                    icon_path: null
                }
            ]
        };

        document.body.innerHTML = component.render(testData);

        const cards = document.querySelectorAll(".game-card");
        expect(cards.length).toBe(5);

        const expected = [
            {name: "Game 1", status: "Completed", class: "status-completed"},
            {name: "Game 2", status: "In Progress", class: "status-in-progress"},
            {name: "Game 3", status: "On Hold", class: "status-on-hold"},
            {name: "Game 4", status: "Forever", class: "status-forever"},
            {name: "Game 5", status: "Dropped", class: "status-dropped"}
        ];

        expected.forEach((item, index) => {
            const card = cards[index];
            const pill = card.querySelector(".game-poster-frame .game-status-pill");
            expect(pill).not.toBeNull();
            expect(pill?.textContent).toBe(item.status);
            expect(pill?.classList.contains(item.class)).toBe(true);
        });
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
