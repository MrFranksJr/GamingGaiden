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

    it("should display status tooltip on segment hover and hide on mouseleave", () => {
        const breakdown: GameStatusBreakdown = {
            totalGames: 15,
            statuses: [
                {category: "Completed", count: 6, percentage: 40, color: "#10b981"},
                {category: "In Progress", count: 4, percentage: 27, color: "#38bdf8"},
                {category: "On Hold", count: 2, percentage: 13, color: "#f59e0b"},
                {category: "Forever", count: 2, percentage: 13, color: "#a855f7"},
                {category: "Dropped", count: 1, percentage: 7, color: "#ef4444"}
            ]
        };

        document.body.innerHTML = GameStatusDonut.render(breakdown);
        GameStatusDonut.mount(document.body);

        const tooltip = document.getElementById("donut-tooltip") as HTMLElement;
        expect(tooltip).not.toBeNull();
        expect(tooltip.style.display).toBe("none");

        const segments = document.querySelectorAll<SVGCircleElement>(".donut-segment");
        expect(segments.length).toBe(5);

        // Test 1: Hover over Completed segment
        segments[0].dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
        expect(tooltip.style.display).toBe("block");
        expect(tooltip.textContent).toContain("Completed");
        expect(tooltip.textContent).toContain("6 games");
        expect(tooltip.textContent).toContain("40%");

        const dot = tooltip.querySelector(".donut-tooltip-dot") as HTMLElement;
        expect(dot.style.backgroundColor).toBe("rgb(16, 185, 129)");

        // Mouseleave hides tooltip
        segments[0].dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
        expect(tooltip.style.display).toBe("none");

        // Test 2: Hover over Dropped segment (1 game singular test)
        segments[4].dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
        expect(tooltip.style.display).toBe("block");
        expect(tooltip.textContent).toContain("Dropped");
        expect(tooltip.textContent).toContain("1 game");
        expect(tooltip.textContent).toContain("7%");

        segments[4].dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
        expect(tooltip.style.display).toBe("none");

        GameStatusDonut.destroy(document.body);
    });

    it("should display correct status info for each hovered category", () => {
        const breakdown: GameStatusBreakdown = {
            totalGames: 5,
            statuses: [
                {category: "Completed", count: 1, percentage: 20, color: "#10b981"},
                {category: "In Progress", count: 1, percentage: 20, color: "#38bdf8"},
                {category: "On Hold", count: 1, percentage: 20, color: "#f59e0b"},
                {category: "Forever", count: 1, percentage: 20, color: "#a855f7"},
                {category: "Dropped", count: 1, percentage: 20, color: "#ef4444"}
            ]
        };

        document.body.innerHTML = GameStatusDonut.render(breakdown);
        GameStatusDonut.mount(document.body);

        const tooltip = document.getElementById("donut-tooltip") as HTMLElement;
        const segments = document.querySelectorAll<SVGCircleElement>(".donut-segment");

        const expectedCategories = ["Completed", "In Progress", "On Hold", "Forever", "Dropped"];

        segments.forEach((segment, idx) => {
            segment.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
            expect(tooltip.style.display).toBe("block");
            expect(tooltip.textContent).toContain(expectedCategories[idx]);
            expect(tooltip.textContent).toContain("1 game");
            expect(tooltip.textContent).toContain("20%");

            segment.dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
            expect(tooltip.style.display).toBe("none");
        });

        GameStatusDonut.destroy();
    });
});
