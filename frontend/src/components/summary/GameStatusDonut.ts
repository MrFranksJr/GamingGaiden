import {GameStatusBreakdown} from "../../utils/SummaryStatsCalculator";
import {escapeHtml} from "../../utils/HtmlUtils";

export class GameStatusDonut {
    private static activeHandlers: Map<Element, {
        mouseenter: (e: Event) => void;
        mousemove: (e: Event) => void;
        mouseleave: (e: Event) => void;
    }> = new Map();

    public static render(breakdown: GameStatusBreakdown): string {
        const total = breakdown.totalGames;
        const size = 200;
        // Donut stroke width reduced by ~20% (from 38 to 30 in 200x200 viewBox)
        const strokeWidth = 30;
        const radius = (size - strokeWidth) / 2;
        const center = size / 2;
        const circumference = 2 * Math.PI * radius;

        let currentOffset = 0;
        const segmentsHtml: string[] = [];

        if (total === 0) {
            segmentsHtml.push(`
                <circle
                    cx="${center}"
                    cy="${center}"
                    r="${radius}"
                    fill="transparent"
                    stroke="var(--border-light, #334155)"
                    stroke-width="${strokeWidth}"
                />
            `);
        } else {
            breakdown.statuses.forEach(status => {
                if (status.count === 0) return;
                const strokeDasharray = (status.count / total) * circumference;
                const strokeDashoffset = -currentOffset;
                currentOffset += strokeDasharray;

                segmentsHtml.push(`
                    <circle
                        cx="${center}"
                        cy="${center}"
                        r="${radius}"
                        fill="transparent"
                        stroke="${status.color}"
                        stroke-width="${strokeWidth}"
                        stroke-dasharray="${strokeDasharray} ${circumference - strokeDasharray}"
                        stroke-dashoffset="${strokeDashoffset}"
                        transform="rotate(-90 ${center} ${center})"
                        class="donut-segment"
                        data-status="${escapeHtml(status.category)}"
                        data-count="${status.count}"
                        data-percentage="${status.percentage}"
                        data-color="${status.color}"
                    />
                `);
            });
        }

        const legendItemsHtml = breakdown.statuses.map(status => `
            <div class="donut-legend-item">
                <div class="donut-legend-header">
                    <span class="donut-legend-dot" style="background-color: ${status.color};"></span>
                    <span class="donut-legend-label">${escapeHtml(status.category)}</span>
                </div>
                <div class="donut-legend-numbers">
                    <span class="donut-legend-count">${status.count}</span>
                    <span class="donut-legend-pct">${status.percentage}%</span>
                </div>
            </div>
        `).join("");

        return `
            <div class="game-status-card" id="game-status-card">
                <div class="card-header">
                    <h3 class="card-title">Game Status</h3>
                    <a href="#all-games" class="card-action-link" title="View all games">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
                <div class="donut-container">
                    <div class="donut-chart-wrapper" id="donut-chart-wrapper">
                        <div class="donut-tooltip" id="donut-tooltip" style="display: none; opacity: 0;" aria-hidden="true"></div>
                        <svg class="donut-svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">
                            ${segmentsHtml.join("")}
                            <g class="donut-center-group">
                                <text class="donut-center-value" x="${center}" y="${center - 6}" text-anchor="middle" dominant-baseline="central" id="status-donut-total">${total}</text>
                                <text class="donut-center-label" x="${center}" y="${center + 20}" text-anchor="middle" dominant-baseline="central">Games</text>
                            </g>
                        </svg>
                    </div>
                    <div class="donut-legend">
                        ${legendItemsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attaches interactive hover tooltip handlers to donut segments.
     */
    public static mount(container: HTMLElement): void {
        this.destroy(container);

        const card = container.querySelector("#game-status-card") as HTMLElement | null || container;
        const wrapper = card.querySelector("#donut-chart-wrapper") as HTMLElement | null;
        const tooltip = card.querySelector("#donut-tooltip") as HTMLElement | null;
        if (!wrapper || !tooltip) return;

        const segments = card.querySelectorAll<SVGCircleElement>(".donut-segment");

        segments.forEach(segment => {
            const handleEnterOrMove = (e: MouseEvent) => {
                const status = segment.getAttribute("data-status") || "";
                const count = segment.getAttribute("data-count") || "0";
                const percentage = segment.getAttribute("data-percentage") || "0";
                const color = segment.getAttribute("data-color") || "#38bdf8";
                const countNum = parseInt(count, 10) || 0;

                tooltip.innerHTML = `
                    <div class="donut-tooltip-header">
                        <span class="donut-tooltip-dot" style="background-color: ${escapeHtml(color)};"></span>
                        <span class="donut-tooltip-title">${escapeHtml(status)}</span>
                    </div>
                    <div class="donut-tooltip-meta">
                        <span class="donut-tooltip-count">${countNum} ${countNum === 1 ? "game" : "games"}</span>
                        <span class="donut-tooltip-sep">•</span>
                        <span class="donut-tooltip-pct">${escapeHtml(percentage)}%</span>
                    </div>
                `;

                tooltip.style.display = "block";
                tooltip.style.opacity = "1";
                tooltip.setAttribute("aria-hidden", "false");

                const wrapperRect = wrapper.getBoundingClientRect();
                if (wrapperRect && wrapperRect.width > 0 && (e.clientX > 0 || e.clientY > 0)) {
                    const x = e.clientX - wrapperRect.left;
                    const y = e.clientY - wrapperRect.top;
                    if (y < 45) {
                        tooltip.style.left = `${Math.round(x)}px`;
                        tooltip.style.top = `${Math.round(y + 14)}px`;
                        tooltip.style.transform = "translate(-50%, 0)";
                    } else {
                        tooltip.style.left = `${Math.round(x)}px`;
                        tooltip.style.top = `${Math.round(y - 10)}px`;
                        tooltip.style.transform = "translate(-50%, -100%)";
                    }
                } else {
                    // Fallback for virtual DOM or test environments
                    tooltip.style.left = "50%";
                    tooltip.style.top = "0px";
                    tooltip.style.transform = "translate(-50%, -100%)";
                }
            };

            const handleLeave = () => {
                tooltip.style.display = "none";
                tooltip.style.opacity = "0";
                tooltip.setAttribute("aria-hidden", "true");
            };

            const mouseenter = (e: Event) => handleEnterOrMove(e as MouseEvent);
            const mousemove = (e: Event) => handleEnterOrMove(e as MouseEvent);
            const mouseleave = () => handleLeave();

            segment.addEventListener("mouseenter", mouseenter);
            segment.addEventListener("mousemove", mousemove);
            segment.addEventListener("mouseleave", mouseleave);

            this.activeHandlers.set(segment, {mouseenter, mousemove, mouseleave});
        });
    }

    /**
     * Cleans up hover listeners for donut segments.
     */
    public static destroy(container?: HTMLElement): void {
        if (!container) {
            this.activeHandlers.forEach((handlers, element) => {
                element.removeEventListener("mouseenter", handlers.mouseenter);
                element.removeEventListener("mousemove", handlers.mousemove);
                element.removeEventListener("mouseleave", handlers.mouseleave);
            });
            this.activeHandlers.clear();
            return;
        }

        const segments = container.querySelectorAll(".donut-segment");
        segments.forEach(segment => {
            const handlers = this.activeHandlers.get(segment);
            if (handlers) {
                segment.removeEventListener("mouseenter", handlers.mouseenter);
                segment.removeEventListener("mousemove", handlers.mousemove);
                segment.removeEventListener("mouseleave", handlers.mouseleave);
                this.activeHandlers.delete(segment);
            }
        });
    }
}
