import {GameStatusBreakdown} from "../../utils/SummaryStatsCalculator";
import {escapeHtml} from "../../utils/HtmlUtils";

export class GameStatusDonut {
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
                    <div class="donut-chart-wrapper">
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
}
