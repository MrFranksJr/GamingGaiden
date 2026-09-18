import {describe, expect, it} from "vitest";
import {GameStatusDonut} from "../src/components/summary/GameStatusDonut";
import {GameStatusBreakdown} from "../src/utils/SummaryStatsCalculator";

describe("GameStatusDonut", () => {
    it("should render responsive SVG donut with adjusted stroke (30px) and scalable center text", () => {
        const breakdown: GameStatusBreakdown = {
            totalGames: 10,
            statuses: [
                {category: "Completed", count: 5, percentage: 50, color: "#10b981"},
                {category: "In Progress", count: 3, percentage: 30, color: "#38bdf8"},
                {category: "On Hold", count: 1, percentage: 10, color: "#f59e0b"},
                {category: "Dropped", count: 1, percentage: 10, color: "#ef4444"},
                {category: "Forever", count: 0, percentage: 0, color: "#a855f7"}
            ]
        };

        document.body.innerHTML = GameStatusDonut.render(breakdown);

        const card = document.getElementById("game-status-card");
        expect(card).not.toBeNull();

        const svg = card?.querySelector(".donut-svg");
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute("viewBox")).toBe("0 0 200 200");

        // Segments should have stroke-width 30px (~20% less thick than 38px)
        const segments = card?.querySelectorAll(".donut-segment");
        expect(segments?.length).toBe(4); // Only non-zero categories
        segments?.forEach(segment => {
            expect(segment.getAttribute("stroke-width")).toBe("30");
        });

        // Center text should be inside SVG for proportional scaling
        const centerValue = document.getElementById("status-donut-total");
        expect(centerValue).not.toBeNull();
        expect(centerValue?.textContent).toBe("10");

        const centerLabel = card?.querySelector(".donut-center-label");
        expect(centerLabel?.textContent).toBe("Games");

        // Legend should show all 5 statuses
        const legendItems = card?.querySelectorAll(".donut-legend-item");
        expect(legendItems?.length).toBe(5);
    });

    it("should render empty state gracefully when totalGames is 0", () => {
        const emptyBreakdown: GameStatusBreakdown = {
            totalGames: 0,
            statuses: [
                {category: "Completed", count: 0, percentage: 0, color: "#10b981"},
                {category: "In Progress", count: 0, percentage: 0, color: "#38bdf8"}
            ]
        };

        document.body.innerHTML = GameStatusDonut.render(emptyBreakdown);

        const centerValue = document.getElementById("status-donut-total");
        expect(centerValue?.textContent).toBe("0");

        const segments = document.body.querySelectorAll(".donut-segment");
        expect(segments.length).toBe(0);

        const circle = document.body.querySelector("circle");
        expect(circle?.getAttribute("stroke-width")).toBe("30");
    });
});
