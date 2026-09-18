import * as d3Force from "d3-force";
import * as d3Scale from "d3-scale";
import * as d3Selection from "d3-selection";
import {TopGameBubble} from "../../utils/SummaryStatsCalculator";

export interface BubbleNode extends d3Force.SimulationNodeDatum, TopGameBubble {
    id: string;
    radius: number;
    color: string;
}

export class BubbleGraphComponent {
    private simulation: d3Force.Simulation<BubbleNode, undefined> | null = null;
    private container: HTMLElement | null = null;

    /**
     * Renders the static SVG markup skeleton.
     */
    public render(topGames: TopGameBubble[]): string {
        if (!topGames || topGames.length === 0) {
            return `
                <div class="bubble-graph-empty">
                    <p>No games played yet to display bubble centerpiece.</p>
                </div>
            `;
        }

        return `
            <div class="bubble-graph-container" id="bubble-graph-container">
                <svg id="bubble-graph-svg" class="bubble-graph-svg" viewBox="0 0 760 620" preserveAspectRatio="xMidYMid meet">
                    <defs id="bubble-defs">
                        <filter id="bubble-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <g id="bubble-nodes-group"></g>
                </svg>
            </div>
        `;
    }

    /**
     * Mounts the dynamic D3 physics simulation, nodes, patterns, and click bindings.
     */
    public mount(container: HTMLElement, topGames: TopGameBubble[]): void {
        this.container = container;
        if (!topGames || topGames.length === 0) return;

        const svgElement = container.querySelector("#bubble-graph-svg") as SVGSVGElement | null;
        if (!svgElement) return;

        const width = 760;
        const height = 620;

        // Radii scale using square-root scaling
        const minPlayTime = Math.min(...topGames.map(g => g.playTimeHours));
        const maxPlayTime = Math.max(...topGames.map(g => g.playTimeHours));

        // Radius ranges between 42px and 86px for balanced centerpiece filling
        const minRadius = 42;
        const maxRadius = 86;
        const radiusScale = d3Scale.scaleSqrt()
            .domain([Math.max(0.1, minPlayTime), Math.max(1, maxPlayTime)])
            .range([minRadius, maxRadius]);

        const colorPalette = [
            "#6366f1", // Indigo
            "#8b5cf6", // Purple
            "#38bdf8", // Sky blue
            "#10b981", // Emerald
            "#f59e0b", // Amber
            "#ec4899", // Pink
            "#14b8a6", // Teal
            "#a855f7", // Violet
            "#06b6d4", // Cyan
            "#f43f5e"  // Rose
        ];

        const nodes: BubbleNode[] = topGames.map((g, index) => {
            const r = Math.round(radiusScale(Math.max(0.1, g.playTimeHours)));
            // Random organic spawn placement across the canvas
            const randomAngle = Math.random() * 2 * Math.PI;
            const randomDistance = 40 + Math.random() * (Math.min(width, height) / 2 - 100);
            const initialX = Math.round(width / 2 + Math.cos(randomAngle) * randomDistance);
            const initialY = Math.round(height / 2 + Math.sin(randomAngle) * randomDistance);

            return {
                ...g,
                id: `bubble-node-${index}`,
                radius: r,
                color: colorPalette[index % colorPalette.length],
                x: initialX,
                y: initialY
            };
        });

        // Add defs patterns for artwork
        const defs = d3Selection.select(svgElement).select("#bubble-defs");
        defs.selectAll(".game-pattern").remove();

        nodes.forEach((node, index) => {
            const patternId = `game-pattern-${index}`;
            const pattern = defs.append("pattern")
                .attr("id", patternId)
                .attr("class", "game-pattern")
                .attr("width", 1)
                .attr("height", 1)
                .attr("patternContentUnits", "objectBoundingBox");

            if (node.iconPath) {
                pattern.append("image")
                    .attr("href", node.iconPath)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 1)
                    .attr("height", 1)
                    .attr("preserveAspectRatio", "xMidYMid slice");
            }
        });

        const nodesGroup = d3Selection.select(svgElement).select("#bubble-nodes-group");
        nodesGroup.selectAll("*").remove();

        const nodeSelection = nodesGroup.selectAll<SVGGElement, BubbleNode>(".bubble-node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "bubble-node")
            .attr("data-game-name", d => d.name)
            .attr("transform", d => `translate(${d.x ?? width / 2}, ${d.y ?? height / 2})`)
            .style("cursor", "pointer");

        // Background Circle (Fallback gradient or color)
        nodeSelection.append("circle")
            .attr("class", "bubble-bg")
            .attr("r", d => d.radius)
            .attr("fill", d => d.color);

        // Pattern Image Circle (if icon exists)
        nodeSelection.filter(d => !!d.iconPath)
            .append("circle")
            .attr("class", "bubble-image")
            .attr("r", d => d.radius)
            .attr("fill", (_d, index) => `url(#game-pattern-${index})`);

        // Initials Text Fallback (if no icon)
        nodeSelection.filter(d => !d.iconPath)
            .append("text")
            .attr("class", "bubble-initials")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "#ffffff")
            .attr("font-size", d => `${Math.max(12, Math.round(d.radius * 0.45))}px`)
            .attr("font-weight", "bold")
            .text(d => d.initials);

        // Luminous Stroke Border Ring
        nodeSelection.append("circle")
            .attr("class", "bubble-ring")
            .attr("r", d => d.radius)
            .attr("fill", "none")
            .attr("stroke", d => d.color)
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 0.85);

        // Subtle dark gradient vignette overlay for readability
        nodeSelection.append("circle")
            .attr("class", "bubble-overlay")
            .attr("r", d => d.radius)
            .attr("fill", "rgba(0, 0, 0, 0.25)")
            .attr("pointer-events", "none");

        // Playtime badge pill inside the bubble
        const badgeGroup = nodeSelection.append("g")
            .attr("class", "bubble-badge-group")
            .attr("transform", d => `translate(0, ${Math.round(d.radius * 0.52)})`);

        badgeGroup.append("rect")
            .attr("class", "bubble-badge-bg")
            .attr("x", -28)
            .attr("y", -9)
            .attr("width", 56)
            .attr("height", 18)
            .attr("rx", 9)
            .attr("fill", "rgba(15, 23, 42, 0.85)")
            .attr("stroke", d => d.color)
            .attr("stroke-width", 1);

        badgeGroup.append("text")
            .attr("class", "bubble-badge-text")
            .attr("text-anchor", "middle")
            .attr("dy", "3px")
            .attr("fill", "#f8fafc")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .text(d => `${d.playTimeHours}h`);

        // Click handler -> Navigation to #game-detail?name=...
        nodeSelection.on("click", (_event, d) => {
            window.location.hash = `#game-detail?name=${encodeURIComponent(d.name)}`;
        });

        // Hover events for glow effect
        nodeSelection.on("mouseenter", function (_event, _d) {
            d3Selection.select(this)
                .attr("filter", "url(#bubble-glow)")
                .raise();
        }).on("mouseleave", function (_event, _d) {
            d3Selection.select(this)
                .attr("filter", null);
        });

        // Subtle organic gravitational drift force
        let timeStep = 0;
        const subtleGravitationalDrift = () => {
            timeStep += 0.015;
            nodes.forEach((node, i) => {
                // Unique subtle phase offset for each bubble based on index and elapsed steps
                const angleX = timeStep + i * 1.37;
                const angleY = timeStep * 0.8 + i * 2.19;
                const nudgeStrength = 0.05;
                node.vx = (node.vx || 0) + Math.cos(angleX) * nudgeStrength;
                node.vy = (node.vy || 0) + Math.sin(angleY) * nudgeStrength;
            });
        };

        // Weight ratio: 0 (lightest) to 1 (heaviest)
        const getWeightRatio = (node: BubbleNode): number => {
            if (maxRadius === minRadius) return 1;
            return Math.max(0, Math.min(1, (node.radius - minRadius) / (maxRadius - minRadius)));
        };

        // D3 Force Simulation setup with weight-based central gravitation and continuous subtle drift
        this.simulation = d3Force.forceSimulation<BubbleNode>(nodes)
            .velocityDecay(0.32)
            .force("drift", subtleGravitationalDrift)
            .force("center", d3Force.forceCenter(width / 2, height / 2).strength(0.02))
            .force("charge", d3Force.forceManyBody<BubbleNode>().strength(d => -(d.radius * 1.5)))
            .force("collide", d3Force.forceCollide<BubbleNode>().radius(d => d.radius + 6).strength(0.9).iterations(3))
            .force("x", d3Force.forceX<BubbleNode>(width / 2).strength(d => {
                const w = getWeightRatio(d);
                // Heavier games have significantly stronger gravitational pull towards the core
                return 0.025 + w * 0.085;
            }))
            .force("y", d3Force.forceY<BubbleNode>(height / 2).strength(d => {
                const w = getWeightRatio(d);
                return 0.025 + w * 0.085;
            }))
            .alpha(1)
            .alphaDecay(0.025)
            .alphaTarget(0.015) // Keeps a gentle baseline energy so bubbles subtly interact continuously
            .on("tick", () => {
                nodeSelection.attr("transform", d => {
                    // Clamp within boundaries
                    const padding = 10;
                    const x = Math.max(d.radius + padding, Math.min(width - d.radius - padding, d.x || width / 2));
                    const y = Math.max(d.radius + padding, Math.min(height - d.radius - padding, d.y || height / 2));
                    return `translate(${x}, ${y})`;
                });
            });
    }

    /**
     * Stops and disposes of the physics simulation.
     */
    public destroy(): void {
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        this.container = null;
    }
}
