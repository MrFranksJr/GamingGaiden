import {describe, expect, it} from "vitest";
import {BubbleGraphComponent} from "../src/components/summary/BubbleGraphComponent";
import {TopGameBubble} from "../src/utils/SummaryStatsCalculator";

describe("BubbleGraphComponent", () => {
    const sampleBubbles: TopGameBubble[] = [
        {
            name: "Helldivers 2",
            playTimeMinutes: 15437,
            playTimeHours: 257.3,
            iconPath: "resources/images/cache/Helldivers_2.jpg",
            status: "forever",
            initials: "H2"
        },
        {
            name: "Cyberpunk 2077",
            playTimeMinutes: 13892,
            playTimeHours: 231.5,
            iconPath: null,
            status: "finished",
            initials: "C2"
        }
    ];

    it("renders empty fallback when top games list is empty", () => {
        const component = new BubbleGraphComponent();
        const html = component.render([]);
        expect(html).toContain("No games played yet");
    });

    it("renders SVG skeleton markup for games list", () => {
        const component = new BubbleGraphComponent();
        const html = component.render(sampleBubbles);
        expect(html).toContain("bubble-graph-svg");
        expect(html).toContain("bubble-defs");
        expect(html).toContain("bubble-nodes-group");
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

        // Badges
        const badges = document.querySelectorAll(".bubble-badge-text");
        expect(badges.length).toBe(2);
        expect(badges[0].textContent).toBe("257.3h");
        expect(badges[1].textContent).toBe("231.5h");

        // Clean up
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
});
