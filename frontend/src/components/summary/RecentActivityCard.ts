import {RecentSessionActivity} from "../../utils/SummaryStatsCalculator";
import {escapeHtml} from "../../utils/HtmlUtils";

export class RecentActivityCard {
    public static render(activities: RecentSessionActivity[]): string {
        const itemsHtml = activities.length === 0
            ? `<div class="recent-empty">No recent activity recorded.</div>`
            : activities.map(item => {
                const thumbnailHtml = item.iconPath
                    ? `<img class="recent-thumb-img" src="${escapeHtml(item.iconPath)}" alt="${escapeHtml(item.gameName)} thumbnail">`
                    : `<div class="recent-thumb-fallback">${escapeHtml(item.gameName.slice(0, 2).toUpperCase())}</div>`;

                return `
                    <div class="recent-activity-item" data-game="${escapeHtml(item.gameName)}">
                        <div class="recent-thumb-wrapper">
                            ${thumbnailHtml}
                        </div>
                        <div class="recent-info">
                            <span class="recent-game-title">${escapeHtml(item.gameName)}</span>
                            <span class="recent-relative-time">${escapeHtml(item.relativeTime)}</span>
                        </div>
                        <div class="recent-duration-badge">
                            ${escapeHtml(item.durationFormatted)}
                        </div>
                    </div>
                `;
            }).join("");

        return `
            <div class="recent-activity-card" id="recent-activity-card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                    <a href="#session-history" class="card-action-link" title="View all sessions">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
                <div class="recent-activity-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }
}
