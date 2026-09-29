import {describe, expect, it} from "vitest";
import {SessionHistoryComponent} from "../src/components/SessionHistoryComponent";
import {GameData} from "../src/types/GameData";

const data: GameData = {
    schema_version: 1,
    games: [
        {
            name: "Game A",
            play_time: 300,
            session_count: 9,
            status: "playing",
            completed: "FALSE",
            icon_path: "resources/images/cache/Game_A.jpg"
        },
        {
            name: "Game B",
            play_time: 120,
            session_count: 3,
            status: "finished",
            completed: "TRUE",
            icon_path: "resources/images/cache/Game_B.jpg"
        }
    ],
    session_history: [
        {game_name: "Game A", start_time: "2025-04-16 09:00", duration: 120},
        {game_name: "Game A", start_time: "2025-04-16 14:00", duration: 60},
        {game_name: "Game B", start_time: "2025-04-16 20:00", duration: 60},
        {game_name: "Game B", start_time: "2025-03-10 20:00", duration: 60}
    ],
    daily_playtime: [
        {play_date: "2025-04-16", play_time: 240},
        {play_date: "2025-03-10", play_time: 60}
    ],
    gaming_pcs: []
};

function renderInto(param: string | null): SessionHistoryComponent {
    const component = new SessionHistoryComponent();
    document.body.innerHTML = component.render(data, param);
    return component;
}

describe("SessionHistoryComponent", () => {
    it("renders both tabs, with By day active by default", () => {
        renderInto(null);
        const tabs = document.querySelectorAll(".session-tab");
        expect(tabs.length).toBe(2);
        const active = document.querySelector(".session-tab.active");
        expect(active?.getAttribute("data-view")).toBe("day");
    });

    it("renders one diary card per session for the selected day, ordered by time", () => {
        renderInto("view=day&date=2025-04-16");
        const cards = document.querySelectorAll(".session-diary-card");
        expect(cards.length).toBe(3);
        expect(cards[0].querySelector(".session-card-title")?.textContent).toContain("Game A");
        expect(cards[0].querySelector(".session-card-range")?.textContent).toContain("09:00\u201311:00");
        expect(cards[0].querySelector(".session-card-duration")?.textContent).toContain("2h 0m");
    });

    it("links each diary card to the game detail page by name", () => {
        renderInto("view=day&date=2025-04-16");
        const link =
            (document.querySelector(".session-diary-card a") as HTMLAnchorElement) ??
            (document.querySelector("a.session-diary-card") as HTMLAnchorElement);
        expect(link.getAttribute("href")).toBe("#game-detail?name=Game%20A");
    });

    it("shows the per-game sidebar with colored bars for the day", () => {
        renderInto("view=day&date=2025-04-16");
        const bars = document.querySelectorAll(".session-games-played-row");
        expect(bars.length).toBe(2); // Game A + Game B aggregated
    });

    it("shows an empty state for a day with no sessions", () => {
        renderInto("view=day&date=2025-04-17");
        expect(document.querySelector(".session-empty-state")).not.toBeNull();
        expect(document.querySelectorAll(".session-diary-card").length).toBe(0);
    });

    it("renders the calendar with a has-data dot on played days", () => {
        renderInto("view=day&date=2025-04-16");
        const dayCell = document.querySelector('.calendar-day[data-day="2025-04-16"]');
        expect(dayCell?.querySelector(".calendar-dot")).not.toBeNull();
        const emptyCell = document.querySelector('.calendar-day[data-day="2025-04-17"]');
        expect(emptyCell?.querySelector(".calendar-dot")).toBeNull();
    });

    it("renders the year grid in By month view with month cards", () => {
        renderInto("view=month&month=2025-04");
        const monthCards = document.querySelectorAll(".month-card");
        expect(monthCards.length).toBe(12);
        // April has data -> dot present
        const april = document.querySelector('.month-card[data-month="2025-04"]');
        expect(april?.querySelector(".month-dot")).not.toBeNull();
        // May has no data -> no dot
        const may = document.querySelector('.month-card[data-month="2025-05"]');
        expect(may?.querySelector(".month-dot")).toBeNull();
    });

    it("shows per-game cards for the selected month in By month view", () => {
        renderInto("view=month&month=2025-04");
        const cards = document.querySelectorAll(".month-game-card");
        expect(cards.length).toBe(2); // Game A + Game B in April
    });

    it("renders the milestone insight card at the bottom of the day sidebar", () => {
        renderInto("view=day&date=2025-04-16");
        const card = document.querySelector("#session-milestone-card.milestone-card");
        expect(card).not.toBeNull();
        // headline + message present, icon rendered
        expect(card?.querySelector(".milestone-title")?.textContent?.trim().length).toBeGreaterThan(0);
        expect(card?.querySelector(".milestone-message")?.textContent?.trim().length).toBeGreaterThan(0);
        expect(card?.querySelector(".milestone-badge-icon i")).not.toBeNull();
        // no progress bar / annotation on the session variant
        expect(card?.querySelector(".milestone-progress-bar")).toBeNull();
        expect(card?.querySelector(".milestone-annotation")).toBeNull();
    });

    it("renders the milestone insight card in the month sidebar", () => {
        renderInto("view=month&month=2025-04");
        const card = document.querySelector("#session-milestone-card.milestone-card");
        expect(card).not.toBeNull();
        expect(card?.querySelector(".milestone-message")?.textContent?.trim().length).toBeGreaterThan(0);
    });

    it("does not render a milestone card for an empty day", () => {
        renderInto("view=day&date=2025-04-17");
        expect(document.querySelector("#session-milestone-card")).toBeNull();
    });
});
