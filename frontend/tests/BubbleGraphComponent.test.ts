import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {BubbleGraphComponent} from "../src/components/summary/BubbleGraphComponent";
import {GameBubble} from "../src/utils/SummaryStatsCalculator";

describe("BubbleGraphComponent", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const sampleBubbles: GameBubble[] = [
        {
            name: "Helldivers 2",
            playTimeMinutes: 15437,
            playTimeHours: 257.3,
            iconPath: "resources/images/cache/Helldivers_2.jpg",
            status: "Forever",
            initials: "H2",
            rank: 1,
            isTop10: true
        },
        {
            name: "Cyberpunk 2077",
            playTimeMinutes: 13892,
            playTimeHours: 231.5,
            iconPath: null,
            status: "Completed",
            initials: "C2",
            rank: 2,
            isTop10: true
        }
    ];

    it("renders empty fallback when games list is empty", () => {
        const component = new BubbleGraphComponent();
        const html = component.render([]);
        expect(html).toContain("No games played yet");
    });

    it("renders SVG skeleton markup and tooltip container for games list", () => {
        const component = new BubbleGraphComponent();
        const html = component.render(sampleBubbles);
        expect(html).toContain("bubble-graph-svg");
        expect(html).toContain("bubble-defs");
        expect(html).toContain("bubble-nodes-group");
        expect(html).toContain("bubble-tooltip");
    });

    it("mounts SVG elements, patterns, and badges properly into DOM", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        const container = document.body;

        component.mount(container, sampleBubbles);

        const svg = document.getElementById("bubble-graph-svg");
        expect(svg).not.toBeNull();

        const nodes = document.querySelectorAll(".bubble-node");
        expect(nodes.length).toBe(2);

        // Pattern def for node with icon
        const pattern = document.getElementById("game-pattern-0");
        expect(pattern).not.toBeNull();

        // Node with initials
        const initials = document.querySelector(".bubble-initials");
        expect(initials?.textContent).toBe("C2");

        // Badges for top 10
        const badges = document.querySelectorAll(".bubble-badge-text");
        expect(badges.length).toBe(2);
        expect(badges[0].textContent).toBe("257.3h");
        expect(badges[1].textContent).toBe("231.5h");

        component.destroy();
    });

    it("applies dual-tier scaling: top 10 have badges and large radii, non-top-10 are compact with no badges", () => {
        const fullLibrary: GameBubble[] = Array.from({length: 15}, (_, i) => {
            const rank = i + 1;
            const hours = (16 - rank) * 10;
            return {
                name: `Game ${rank}`,
                playTimeMinutes: hours * 60,
                playTimeHours: hours,
                iconPath: null,
                status: "in progress",
                initials: `G${rank}`,
                rank,
                isTop10: rank <= 10
            };
        });

        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(fullLibrary);
        component.mount(document.body, fullLibrary);

        const nodes = document.querySelectorAll(".bubble-node");
        expect(nodes.length).toBe(15);

        // First 10 nodes (top 10) must have badges
        for (let i = 0; i < 10; i++) {
            const badge = nodes[i].querySelector(".bubble-badge-group");
            expect(badge).not.toBeNull();
            const bgCircle = nodes[i].querySelector(".bubble-bg") as SVGCircleElement;
            const r = parseFloat(bgCircle.getAttribute("r") || "0");
            expect(r).toBeGreaterThanOrEqual(48);
            expect(r).toBeLessThanOrEqual(102);
        }

        // Remaining 5 nodes (11-15) must NOT have badges and have compact radii (20-34px)
        for (let i = 10; i < 15; i++) {
            const badge = nodes[i].querySelector(".bubble-badge-group");
            expect(badge).toBeNull();
            const bgCircle = nodes[i].querySelector(".bubble-bg") as SVGCircleElement;
            const r = parseFloat(bgCircle.getAttribute("r") || "0");
            expect(r).toBeGreaterThanOrEqual(20);
            expect(r).toBeLessThanOrEqual(34);
        }

        component.destroy();
    });

    it("displays tooltip after 1-second continuous hover and hides on mouseleave", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        component.mount(document.body, sampleBubbles);

        const tooltip = document.getElementById("bubble-tooltip") as HTMLElement;
        expect(tooltip.style.display).toBe("none");

        const firstNode = document.querySelector(".bubble-node") as SVGGElement;
        expect(firstNode).not.toBeNull();

        // Mouse enter starts timer
        firstNode.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));

        // Advance 500ms - still hidden
        vi.advanceTimersByTime(500);
        expect(tooltip.style.display).toBe("none");

        // Advance another 500ms (total 1000ms) - tooltip is displayed
        vi.advanceTimersByTime(500);
        expect(tooltip.style.display).toBe("block");
        expect(tooltip.textContent).toContain("Helldivers 2");
        expect(tooltip.textContent).toContain("#1");
        expect(tooltip.textContent).toContain("257.3h");
        expect(tooltip.textContent).toContain("Forever");

        // Mouse leave dismisses tooltip immediately
        firstNode.dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
        expect(tooltip.style.display).toBe("none");

        component.destroy();
    });

    it("displays tooltip status for all game categories (Completed, In Progress, On Hold, Forever, Dropped)", () => {
        const testBubbles: GameBubble[] = [
            {
                name: "Game 1",
                playTimeMinutes: 600,
                playTimeHours: 10,
                iconPath: null,
                status: "Completed",
                initials: "G1",
                rank: 1,
                isTop10: true
            },
            {
                name: "Game 2",
                playTimeMinutes: 500,
                playTimeHours: 8.3,
                iconPath: null,
                status: "In Progress",
                initials: "G2",
                rank: 2,
                isTop10: true
            },
            {
                name: "Game 3",
                playTimeMinutes: 400,
                playTimeHours: 6.7,
                iconPath: null,
                status: "On Hold",
                initials: "G3",
                rank: 3,
                isTop10: true
            },
            {
                name: "Game 4",
                playTimeMinutes: 300,
                playTimeHours: 5,
                iconPath: null,
                status: "Forever",
                initials: "G4",
                rank: 4,
                isTop10: true
            },
            {
                name: "Game 5",
                playTimeMinutes: 200,
                playTimeHours: 3.3,
                iconPath: null,
                status: "Dropped",
                initials: "G5",
                rank: 5,
                isTop10: true
            }
        ];

        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(testBubbles);
        component.mount(document.body, testBubbles);

        const tooltip = document.getElementById("bubble-tooltip") as HTMLElement;
        const nodes = document.querySelectorAll(".bubble-node");

        const expectedStatuses = ["Completed", "In Progress", "On Hold", "Forever", "Dropped"];

        nodes.forEach((node, index) => {
            node.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
            vi.advanceTimersByTime(1000);

            expect(tooltip.style.display).toBe("block");
            expect(tooltip.textContent).toContain(expectedStatuses[index]);

            node.dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
            expect(tooltip.style.display).toBe("none");
        });

        component.destroy();
    });

    it("cancels tooltip timer if mouse leaves before 1 second", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        component.mount(document.body, sampleBubbles);

        const tooltip = document.getElementById("bubble-tooltip") as HTMLElement;
        const firstNode = document.querySelector(".bubble-node") as SVGGElement;

        // Mouse enter, then leave after 600ms
        firstNode.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
        vi.advanceTimersByTime(600);
        firstNode.dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));

        // Advance another 1000ms
        vi.advanceTimersByTime(1000);
        expect(tooltip.style.display).toBe("none");

        component.destroy();
    });

    it("triggers tactile bump class and glow filter on mouseenter and reverts on mouseleave", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        component.mount(document.body, sampleBubbles);

        const firstNode = document.querySelector(".bubble-node") as SVGGElement;

        firstNode.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
        expect(firstNode.classList.contains("bubble-bump")).toBe(true);
        expect(firstNode.getAttribute("filter")).toBe("url(#bubble-glow)");

        firstNode.dispatchEvent(new MouseEvent("mouseleave", {bubbles: true}));
        expect(firstNode.classList.contains("bubble-bump")).toBe(false);
        expect(firstNode.getAttribute("filter")).toBeNull();

        component.destroy();
    });

    it("navigates to game detail on bubble click", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        component.mount(document.body, sampleBubbles);

        const node = document.querySelector(".bubble-node") as SVGGElement;
        expect(node).not.toBeNull();

        node.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        expect(window.location.hash).toBe("#game-detail?name=Helldivers%202");

        component.destroy();
    });

    it("initializes bubble positions within canvas bounds and sets initial transform attribute", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = component.render(sampleBubbles);
        component.mount(document.body, sampleBubbles);

        const nodes = document.querySelectorAll(".bubble-node");
        expect(nodes.length).toBe(2);
        const transform0 = nodes[0].getAttribute("transform");
        expect(transform0).toBeDefined();
        expect(transform0).toContain("translate");
        expect(transform0).toMatch(/translate\(\d+,\s*\d+\)/);

        component.destroy();
    });

    it("correctly calculates tooltip coordinates relative to bubble-graph-container in a nested dashboard layout", () => {
        const component = new BubbleGraphComponent();
        document.body.innerHTML = `
            <div id="view-container" style="position: absolute; left: 0; top: 0; width: 1400px; height: 900px;">
                <div class="summary-col-left" style="width: 350px;"></div>
                <div class="summary-col-center" style="width: 700px;">
                    ${component.render(sampleBubbles)}
                </div>
            </div>
        `;
        const viewContainer = document.getElementById("view-container") as HTMLElement;
        const graphContainer = document.getElementById("bubble-graph-container") as HTMLElement;

        // Mock bounding rects
        vi.spyOn(viewContainer, "getBoundingClientRect").mockReturnValue({
            left: 0,
            top: 0,
            right: 1400,
            bottom: 900,
            width: 1400,
            height: 900,
            x: 0,
            y: 0,
            toJSON: () => {
            }
        });

        vi.spyOn(graphContainer, "getBoundingClientRect").mockReturnValue({
            left: 350,
            top: 100,
            right: 1050,
            bottom: 720,
            width: 700,
            height: 620,
            x: 350,
            y: 100,
            toJSON: () => {
            }
        });

        component.mount(viewContainer, sampleBubbles);

        const firstNode = document.querySelector(".bubble-node") as SVGGElement;
        vi.spyOn(firstNode, "getBoundingClientRect").mockReturnValue({
            left: 650,
            top: 300,
            right: 750,
            bottom: 400,
            width: 100,
            height: 100,
            x: 650,
            y: 300,
            toJSON: () => {
            }
        });

        firstNode.dispatchEvent(new MouseEvent("mouseenter", {bubbles: true}));
        vi.advanceTimersByTime(1000);

        const tooltip = document.getElementById("bubble-tooltip") as HTMLElement;
        expect(tooltip.style.display).toBe("block");
        // Left should be relative to graphContainer (650 - 350 + 100/2 = 350px)
        expect(tooltip.style.left).toBe("350px");
        // Top should be relative to graphContainer (300 - 100 - 10 = 190px)
        expect(tooltip.style.top).toBe("190px");

        component.destroy();
    });
});
