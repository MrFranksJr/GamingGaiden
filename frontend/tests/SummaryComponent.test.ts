import {describe, expect, it} from "vitest";
import {SummaryComponent} from "../src/components/SummaryComponent";
import {mockData} from "./test-utils";

describe("SummaryComponent", () => {
    it("should correctly calculate summary stats and render modern 3-column layout", () => {
        const component = new SummaryComponent();
        document.body.innerHTML = component.render(mockData);

        // Check 2x2 stat values
        expect(document.getElementById("total-games-value")?.textContent).toBe("2");
        expect(document.getElementById("total-playtime-value")?.textContent).toBe("3 Hr 0 Min");
        expect(document.getElementById("total-sessions-value")?.textContent).toBe("2");
        // avg session = mean of tracked session durations (30m + 60m) / 2 = 45m.
        // Previously this asserted "1h 30m", which was the reported bug: total
        // lifetime playtime (180m) divided by session count (2) instead of the
        // mean of the actual tracked session durations.
        expect(document.getElementById("avg-session-value")?.textContent).toBe("45m");
        expect(document.getElementById("completed-games-value")?.textContent).toBe("1");

        // Check sub-panels
        expect(document.getElementById("game-status-card")).not.toBeNull();
        expect(document.getElementById("status-donut-total")?.textContent).toBe("2");
        expect(document.getElementById("bubble-graph-svg")).not.toBeNull();
        expect(document.getElementById("recent-activity-card")).not.toBeNull();
        expect(document.getElementById("milestone-card")).not.toBeNull();
        expect(document.getElementById("milestone-annotation")?.textContent).toBe("*Excludes forever games");
    });

    it("should render Forever status in donut and exclude forever games from milestone", () => {
        const customData = {
            ...mockData,
            games: [
                ...mockData.games,
                {
                    name: "Helldivers 2",
                    play_time: 240,
                    session_count: 4,
                    status: "forever",
                    completed: "FALSE"
                }
            ]
        };

        const component = new SummaryComponent();
        document.body.innerHTML = component.render(customData);

        expect(document.getElementById("total-games-value")?.textContent).toBe("3");
        expect(document.getElementById("status-donut-total")?.textContent).toBe("3");

        // Donut should contain Forever segment/legend
        const statusCard = document.getElementById("game-status-card");
        expect(statusCard?.textContent).toContain("Forever");

        // Milestone card should exclude the forever game
        const milestoneCard = document.getElementById("milestone-card");
        expect(milestoneCard?.textContent).toContain("50% Completed"); // 1 completed out of 2 non-forever games = 50%
        expect(document.getElementById("milestone-annotation")?.textContent).toBe("*Excludes 1 forever game");
    });

    it("should handle missing data gracefully", () => {
        const component = new SummaryComponent();
        expect(component.render(null)).toContain("No data available");
    });

    it("should mount all games as bubbles when library exceeds 10 games", () => {
        const customData = {
            ...mockData,
            games: Array.from({length: 15}, (_, i) => ({
                name: `Game ${i + 1}`,
                play_time: (i + 1) * 60,
                session_count: i + 1,
                status: "in progress",
                completed: "FALSE"
            }))
        };

        const component = new SummaryComponent();
        document.body.innerHTML = component.render(customData);
        component.mount(document.body);

        const nodes = document.querySelectorAll(".bubble-node");
        expect(nodes.length).toBe(15);

        // First 10 should have badges
        const badges = document.querySelectorAll(".bubble-badge-group");
        expect(badges.length).toBe(10);

        component.destroy();
    });
});
