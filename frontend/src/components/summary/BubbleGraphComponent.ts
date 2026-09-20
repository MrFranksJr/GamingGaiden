import * as d3Force from "d3-force";
import * as d3Scale from "d3-scale";
import * as d3Selection from "d3-selection";
import {GameBubble, TopGameBubble} from "../../utils/SummaryStatsCalculator";
import {escapeHtml} from "../../utils/HtmlUtils";

export interface BubbleNode extends d3Force.SimulationNodeDatum, GameBubble {
    id: string;
    radius: number;
    color: string;
}

export class BubbleGraphComponent {
    private simulation: d3Force.Simulation<BubbleNode, undefined> | null = null;
    private container: HTMLElement | null = null;

    /**
     * Renders the static SVG markup skeleton with tooltip overlay.
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
                <div class="bubble-tooltip" id="bubble-tooltip" style="display: none; opacity: 0;" aria-hidden="true"></div>
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
     * Mounts the dynamic D3 physics simulation, nodes, patterns, hover tooltips, bump animations, and click bindings.
     */
    public mount(container: HTMLElement, topGames: TopGameBubble[]): void {
        this.container = container;
        if (!topGames || topGames.length === 0) return;

        const svgElement = container.querySelector("#bubble-graph-svg") as SVGSVGElement | null;
        if (!svgElement) return;

        const width = 760;
        const height = 620;

        // Dual-tier radius scaling: Top 10 (48-98px), Non-Top 10 (20-34px)
        const top10Games = topGames.filter(g => g.isTop10);
        const minorGames = topGames.filter(g => !g.isTop10);

        const minTop10Hours = top10Games.length ? Math.min(...top10Games.map(g => g.playTimeHours)) : 0;
        const maxTop10Hours = top10Games.length ? Math.max(...top10Games.map(g => g.playTimeHours)) : 1;
        const top10Scale = d3Scale.scaleSqrt()
            .domain([Math.max(0, minTop10Hours), Math.max(0.1, maxTop10Hours)])
            .range([48, 98]);

        const minMinorHours = minorGames.length ? Math.min(...minorGames.map(g => g.playTimeHours)) : 0;
        const maxMinorHours = minorGames.length ? Math.max(...minorGames.map(g => g.playTimeHours)) : 1;
        const minorScale = d3Scale.scaleSqrt()
            .domain([Math.max(0, minMinorHours), Math.max(0.1, maxMinorHours)])
            .range([20, 34]);

        const getRadius = (g: GameBubble): number => {
            if (g.isTop10) {
                return Math.round(top10Scale(Math.max(0, g.playTimeHours)));
            }
            return Math.round(minorScale(Math.max(0, g.playTimeHours)));
        };

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
            const r = getRadius(g);
            // Spawn top 10 closer to center, remaining titles in wider orbital scatter
            const isCore = g.isTop10;
            const randomAngle = Math.random() * 2 * Math.PI;
            const minScatter = isCore ? 15 : 90;
            const maxScatter = isCore ? 120 : 210;
            const randomDistance = minScatter + Math.random() * (maxScatter - minScatter);
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
            .attr("font-size", d => `${Math.max(9, Math.round(d.radius * 0.45))}px`)
            .attr("font-weight", "bold")
            .text(d => d.initials);

        // Luminous Stroke Border Ring
        nodeSelection.append("circle")
            .attr("class", "bubble-ring")
            .attr("r", d => d.radius)
            .attr("fill", "none")
            .attr("stroke", d => d.color)
            .attr("stroke-width", d => d.isTop10 ? 3 : 1.5)
            .attr("stroke-opacity", d => d.isTop10 ? 0.85 : 0.7);

        // Subtle dark gradient vignette overlay for readability
        nodeSelection.append("circle")
            .attr("class", "bubble-overlay")
            .attr("r", d => d.radius)
            .attr("fill", "rgba(0, 0, 0, 0.25)")
            .attr("pointer-events", "none");

        // Playtime badge pill inside the bubble (Top 10 only)
        const badgeGroup = nodeSelection.filter(d => d.isTop10)
            .append("g")
            .attr("class", "bubble-badge-group")
            .attr("transform", d => `translate(0, ${Math.round(d.radius * 0.52)})`);

        badgeGroup.append("rect")
            .attr("class", "bubble-badge-bg")
            .attr("x", -24)
            .attr("y", -8)
            .attr("width", 48)
            .attr("height", 16)
            .attr("rx", 8)
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

        // Hover events: immediate tooltip, tactile bump animation & subtle physics nudge
        const self = this;
        nodeSelection.on("mouseenter", function (_event, d) {
            const currentElement = this;
            const currentSelection = d3Selection.select(currentElement);

            // Tactile bump spring scale and glow filter
            currentSelection
                .classed("bubble-bump", true)
                .attr("filter", "url(#bubble-glow)");

            // Physical nudge to part neighboring bubbles
            const dx = (d.x ?? width / 2) - width / 2;
            const dy = (d.y ?? height / 2) - height / 2;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            d.vx = (node => (node.vx || 0) + (dx / dist))(d);
            d.vy = (node => (node.vy || 0) + (dy / dist))(d);

            if (self.simulation) {
                self.simulation.alphaTarget(0.02);
            }

            self.showTooltip(d, currentElement);
        }).on("mouseleave", function (_event, _d) {
            const currentSelection = d3Selection.select(this);

            // Revert bump and glow
            currentSelection
                .classed("bubble-bump", false)
                .attr("filter", null);

            self.hideTooltip();

            if (self.simulation) {
                self.simulation.alphaTarget(0.008);
            }
        });

        // Subtle organic gravitational drift force
        let timeStep = 0;
        const subtleGravitationalDrift = () => {
            timeStep += 0.015;
            nodes.forEach((node, i) => {
                // Unique subtle phase offset for each bubble based on index and elapsed steps
                const angleX = timeStep + i * 1.37;
                const angleY = timeStep * 0.8 + i * 2.19;
                const nudgeStrength = 0.012;
                node.vx = (node.vx || 0) + Math.cos(angleX) * nudgeStrength;
                node.vy = (node.vy || 0) + Math.sin(angleY) * nudgeStrength;
            });
        };

        // Weight ratio: 0 (minor) to 1 (prominent top 10)
        const getWeightRatio = (node: BubbleNode): number => {
            if (node.isTop10) {
                return 0.5 + 0.5 * Math.max(0, Math.min(1, (node.radius - 48) / (98 - 48 || 1)));
            }
            return 0.15 * Math.max(0, Math.min(1, (node.radius - 20) / (34 - 20 || 1)));
        };

        // D3 Force Simulation setup with weight-based central gravitation and continuous subtle drift
        this.simulation = d3Force.forceSimulation<BubbleNode>(nodes)
            .velocityDecay(0.3)
            .force("drift", subtleGravitationalDrift)
            .force("center", d3Force.forceCenter(width / 2, height / 2).strength(0.04))
            .force("collide", d3Force.forceCollide<BubbleNode>().radius(d => d.radius + (d.isTop10 ? 4 : 2)).strength(0.95).iterations(4))
            .force("x", d3Force.forceX<BubbleNode>(width / 2).strength(d => {
                const w = getWeightRatio(d);
                // Heavier games have stronger gravitational pull towards the core
                return 0.035 + w * 0.045;
            }))
            .force("y", d3Force.forceY<BubbleNode>(height / 2).strength(d => {
                const w = getWeightRatio(d);
                return 0.035 + w * 0.045;
            }))
            .alpha(1)
            .alphaDecay(0.02)
            .alphaTarget(0.005) // Keeps a gentle baseline energy so bubbles subtly interact continuously
            .on("tick", () => {
                const padding = 8;
                nodes.forEach(d => {
                    if (d.x !== undefined) {
                        d.x = Math.max(d.radius + padding, Math.min(width - d.radius - padding, d.x));
                    }
                    if (d.y !== undefined) {
                        d.y = Math.max(d.radius + padding, Math.min(height - d.radius - padding, d.y));
                    }
                });
                nodeSelection.attr("transform", d => `translate(${d.x ?? width / 2}, ${d.y ?? height / 2})`);
            });
    }

    /**
     * Renders and positions the floating game tooltip.
     */
    private showTooltip(d: BubbleNode, nodeElement: SVGGElement): void {
        if (!this.container) return;
        const tooltip = this.container.querySelector("#bubble-tooltip") as HTMLElement | null;
        if (!tooltip) return;

        tooltip.innerHTML = `
            <div class="bubble-tooltip-title">${escapeHtml(d.name)}</div>
            <div class="bubble-tooltip-meta">
                <span class="bubble-tooltip-rank">#${d.rank}</span>
                <span class="bubble-tooltip-dot">•</span>
                <span class="bubble-tooltip-playtime">${d.playTimeHours}h</span>
                ${d.status ? `<span class="bubble-tooltip-dot">•</span><span class="bubble-tooltip-status">${escapeHtml(d.status)}</span>` : ""}
            </div>
        `;

        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
        tooltip.setAttribute("aria-hidden", "false");

        const graphContainer = this.container.querySelector("#bubble-graph-container") as HTMLElement | null || this.container;
        const containerRect = graphContainer.getBoundingClientRect();
        const nodeRect = nodeElement.getBoundingClientRect();

        let left: number;
        let top: number;

        if (containerRect && nodeRect && containerRect.width > 0 && nodeRect.width > 0) {
            left = nodeRect.left - containerRect.left + nodeRect.width / 2;
            const topOffset = nodeRect.top - containerRect.top;
            if (topOffset < 50) {
                // Position below bubble if close to upper boundary
                top = nodeRect.bottom - containerRect.top + 10;
                tooltip.style.transform = "translate(-50%, 0)";
            } else {
                top = topOffset - 10;
                tooltip.style.transform = "translate(-50%, -100%)";
            }
        } else {
            // Fallback for jsdom / virtual testing environments
            const scaleX = (containerRect?.width || 760) / 760;
            const scaleY = (containerRect?.height || 620) / 620;
            left = (d.x ?? 380) * scaleX;
            top = ((d.y ?? 310) - d.radius - 10) * scaleY;
            tooltip.style.transform = "translate(-50%, -100%)";
        }

        tooltip.style.left = `${Math.round(left)}px`;
        tooltip.style.top = `${Math.round(top)}px`;
    }

    /**
     * Hides the floating game tooltip.
     */
    private hideTooltip(): void {
        if (!this.container) return;
        const tooltip = this.container.querySelector("#bubble-tooltip") as HTMLElement | null;
        if (tooltip) {
            tooltip.style.display = "none";
            tooltip.style.opacity = "0";
            tooltip.setAttribute("aria-hidden", "true");
        }
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
