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

    it("should render view header with active filter label and total game count", () => {
        const component = new AllGamesComponent();
        document.body.innerHTML = component.render(mockData);

        const title = document.querySelector(".all-games-title");
        const count = document.querySelector(".all-games-count");

        expect(title?.textContent).toBe("All Games");
        expect(count?.textContent).toBe("2 games");
    });

    it("should filter games when a valid filter parameter is provided", () => {
        const component = new AllGamesComponent();

        // Filter: Completed
        document.body.innerHTML = component.render(mockData, "completed");
        let cards = document.querySelectorAll(".game-card");
        expect(cards.length).toBe(1);
        expect(cards[0].querySelector(".game-card-title")?.textContent).toBe("Game B");
        expect(document.querySelector(".all-games-title")?.textContent).toBe("Completed");
        expect(document.querySelector(".all-games-count")?.textContent).toBe("1 game");

        // Filter: In Progress
        document.body.innerHTML = component.render(mockData, "in-progress");
        cards = document.querySelectorAll(".game-card");
        expect(cards.length).toBe(1);
        expect(cards[0].querySelector(".game-card-title")?.textContent).toBe("Game A");
        expect(document.querySelector(".all-games-title")?.textContent).toBe("In Progress");
        expect(document.querySelector(".all-games-count")?.textContent).toBe("1 game");
    });

    it("should render an empty state message when no games match the selected filter", () => {
        const component = new AllGamesComponent();
        document.body.innerHTML = component.render(mockData, "dropped");

        const emptyMessage = document.querySelector(".all-games-empty");
        expect(emptyMessage).not.toBeNull();
        expect(emptyMessage?.textContent).toContain('No games found for "Dropped".');
        expect(document.querySelectorAll(".game-card").length).toBe(0);
        expect(document.querySelector(".all-games-title")?.textContent).toBe("Dropped");
        expect(document.querySelector(".all-games-count")?.textContent).toBe("0 games");
    });

    it("should mount sidebar filters, show accurate counts, and update view on filter click", () => {
        document.body.innerHTML = `
            <aside id="sidebar-nav">
                <nav class="sidebar-menu" id="sidebar-menu"></nav>
                <div id="sidebar-filters" class="sidebar-filters-container"></div>
                <div id="sidebar-footer"></div>
            </aside>
            <main>
                <div id="view-container"></div>
            </main>
        `;

        const container = document.getElementById("view-container")!;
        const component = new AllGamesComponent();
        container.innerHTML = component.render(mockData);
        component.mount(container);

        const filterBtns = document.querySelectorAll<HTMLButtonElement>(".sidebar-filter-btn");
        expect(filterBtns.length).toBe(6);

        // Verify button labels and badges
        const allBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="all"]')!;
        const inProgressBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="in-progress"]')!;
        const completedBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="completed"]')!;
        const onHoldBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="on-hold"]')!;
        const foreverBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="forever"]')!;
        const droppedBtn = document.querySelector<HTMLButtonElement>('.sidebar-filter-btn[data-filter="dropped"]')!;

        expect(allBtn.querySelector(".filter-badge")?.textContent).toBe("2");
        expect(allBtn.classList.contains("active")).toBe(true);
        expect(inProgressBtn.querySelector(".filter-badge")?.textContent).toBe("1");
        expect(completedBtn.querySelector(".filter-badge")?.textContent).toBe("1");
        expect(onHoldBtn.querySelector(".filter-badge")?.textContent).toBe("0");
        expect(foreverBtn.querySelector(".filter-badge")?.textContent).toBe("0");
        expect(droppedBtn.querySelector(".filter-badge")?.textContent).toBe("0");

        // Verify icons render cleanly without inline colors for monochrome styling
        filterBtns.forEach(btn => {
            const iconSpan = btn.querySelector(".filter-icon");
            expect(iconSpan).not.toBeNull();
            expect(iconSpan?.getAttribute("style")).toBeNull();
            expect(iconSpan?.querySelector("i")).not.toBeNull();
        });

        // Click "Completed" filter
        completedBtn.click();
        expect(completedBtn.classList.contains("active")).toBe(true);
        expect(allBtn.classList.contains("active")).toBe(false);
        expect(component.getActiveFilter()).toBe("completed");

        let cards = container.querySelectorAll(".game-card");
        expect(cards.length).toBe(1);
        expect(cards[0].querySelector(".game-card-title")?.textContent).toBe("Game B");

        // Click "All Games" filter
        allBtn.click();
        expect(allBtn.classList.contains("active")).toBe(true);
        expect(completedBtn.classList.contains("active")).toBe(false);
        cards = container.querySelectorAll(".game-card");
        expect(cards.length).toBe(2);

        // Click "On Hold" (0 games)
        onHoldBtn.click();
        expect(onHoldBtn.classList.contains("active")).toBe(true);
        expect(container.querySelector(".all-games-empty")?.textContent).toContain('No games found for "On Hold".');

        // Cleanup
        component.destroy();
        const sidebarFilters = document.getElementById("sidebar-filters");
        expect(sidebarFilters?.innerHTML).toBe("");
    });
});
