import {GameData} from "../types/GameData";
import {SummaryStatsCalculator, SummaryDashboardMetrics} from "../utils/SummaryStatsCalculator";
import {formatPlaytime} from "../utils/TimeUtils";
import {BubbleGraphComponent} from "./summary/BubbleGraphComponent";
import {GameStatusDonut} from "./summary/GameStatusDonut";
import {RecentActivityCard} from "./summary/RecentActivityCard";
import {escapeHtml} from "../utils/HtmlUtils";

export class SummaryComponent {
    private bubbleGraph: BubbleGraphComponent = new BubbleGraphComponent();
    private currentMetrics: SummaryDashboardMetrics | null = null;
    private currentContainer: HTMLElement | null = null;

    public render(data: GameData | null): string {
        if (!data || !data.games) {
            return "<p>No data available for summary.</p>";
        }

        const validGames = data.games.filter(game => game !== null);
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }

        const metrics = SummaryStatsCalculator.compute(data);
        this.currentMetrics = metrics;

        const {stats, statusBreakdown, topGames, recentActivity, milestone} = metrics;

        // Render Delta Badges Helper
        const renderDelta = (delta?: {
            text: string;
            type: "positive" | "negative" | "neutral"
        }, idPrefix?: string) => {
            if (!delta) return "";
            const idAttr = idPrefix ? ` id="${idPrefix}-delta"` : "";
            return `<span class="stat-delta ${delta.type}"${idAttr}>${escapeHtml(delta.text)}</span>`;
        };

        return `
            <div id="summary-view" class="summary-dashboard">
                <h2 style="display:none;">Summary Dashboard</h2>
                <!-- Left Column -->
                <div class="summary-column summary-col-left">
                    <div class="summary-stats-grid">
                        <div class="stat-card" id="card-total-games">
                            <div class="stat-card-header">
                                <span class="stat-label">Total Games</span>
                                <div class="stat-icon-badge"><i class="fa-solid fa-gamepad"></i></div>
                            </div>
                            <div class="stat-card-body">
                                <span class="stat-value" id="total-games-value">${stats.totalGames}</span>
                                ${renderDelta(stats.gamesDelta, "total-games")}
                            </div>
                        </div>

                        <div class="stat-card" id="card-play-time">
                            <div class="stat-card-header">
                                <span class="stat-label">Play Time</span>
                                <div class="stat-icon-badge"><i class="fa-solid fa-clock"></i></div>
                            </div>
                            <div class="stat-card-body">
                                <span class="stat-value" id="total-playtime-value">${formatPlaytime(stats.totalPlayTimeMinutes)}</span>
                                ${renderDelta(stats.playTimeDelta, "playtime")}
                            </div>
                        </div>

                        <div class="stat-card" id="card-total-sessions">
                            <div class="stat-card-header">
                                <span class="stat-label">Total Sessions</span>
                                <div class="stat-icon-badge"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <div class="stat-card-body">
                                <span class="stat-value" id="total-sessions-value">${stats.totalSessions}</span>
                                ${renderDelta(stats.sessionsDelta, "sessions")}
                            </div>
                        </div>

                        <div class="stat-card" id="card-avg-session">
                            <div class="stat-card-header">
                                <span class="stat-label">Avg Session</span>
                                <div class="stat-icon-badge"><i class="fa-solid fa-hourglass-half"></i></div>
                            </div>
                            <div class="stat-card-body">
                                <span class="stat-value" id="avg-session-value">${stats.avgSessionFormatted}</span>
                                ${renderDelta(stats.avgSessionDelta, "avg-session")}
                            </div>
                        </div>
                    </div>

                    <!-- Hidden completed-games-value for backward compatibility with existing tests -->
                    <span id="completed-games-value" style="display:none;">${milestone.completedCount}</span>

                    <!-- Status Donut Chart Card -->
                    ${GameStatusDonut.render(statusBreakdown)}
                </div>

                <!-- Middle Column: Centerpiece Bubble Graph -->
                <div class="summary-column summary-col-center">
                    <div class="centerpiece-card">
                        <div class="centerpiece-header">
                            <h2 class="centerpiece-title">Lifetime Summary</h2>
                            <p class="centerpiece-subtitle">A look at your gaming journey</p>
                        </div>
                        <div class="centerpiece-graph-wrapper">
                            ${this.bubbleGraph.render(topGames)}
                        </div>
                    </div>
                </div>

                <!-- Right Column: Recent Activity & Milestone -->
                <div class="summary-column summary-col-right">
                    <!-- Recent Activity Card -->
                    ${RecentActivityCard.render(recentActivity)}

                    <!-- Milestone Card -->
                    <div class="milestone-card" id="milestone-card">
                        <div class="milestone-header">
                            <div class="milestone-badge-icon">
                                <i class="fa-solid fa-trophy"></i>
                            </div>
                            <div class="milestone-title-group">
                                <span class="milestone-sub">Milestone Highlight</span>
                                <h3 class="milestone-title">${milestone.completionPercentage}% Completed</h3>
                            </div>
                        </div>
                        <p class="milestone-message">${escapeHtml(milestone.message)}</p>
                        <div class="milestone-progress-bar">
                            <div class="milestone-progress-fill" style="width: ${milestone.completionPercentage}%;"></div>
                        </div>
                        <div class="milestone-annotation" id="milestone-annotation">${escapeHtml(milestone.annotation)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    public mount(container: HTMLElement): void {
        this.currentContainer = container;
        if (this.currentMetrics && this.currentMetrics.topGames) {
            this.bubbleGraph.mount(container, this.currentMetrics.topGames);
        }
        GameStatusDonut.mount(container);
    }

    public destroy(): void {
        this.bubbleGraph.destroy();
        if (this.currentContainer) {
            GameStatusDonut.destroy(this.currentContainer);
            this.currentContainer = null;
        }
        this.currentMetrics = null;
    }
}
