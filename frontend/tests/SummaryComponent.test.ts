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
        expect(document.getElementById("avg-session-value")?.textContent).toBe("1h 30m");
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
});
