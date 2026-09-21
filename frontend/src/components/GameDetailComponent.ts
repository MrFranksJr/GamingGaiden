import {GameData, Session} from "../types/GameData";
import {formatPlaytime, toSortableTimestamp} from "../utils/TimeUtils";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils";
import {
    calculateGameDetailStats,
    formatDateTime,
    GameDetailStats,
    parseSessionDate,
    TimelineSessionPoint
} from "../utils/GameDetailStatsCalculator";

export class GameDetailComponent {
    private currentContainer: HTMLElement | null = null;
    private backBtnListener: ((e: Event) => void) | null = null;

    render(data: GameData, gameName?: string | null): string {
        if (!data || !data.games) return "<p>No games found.</p>";
        if (!gameName) return "<p>No game was selected.</p>";

        const validGames = data.games.filter(g => g !== null);
        const game = validGames.find(g => g.name === gameName);
        if (!game) return `<p>Game "${escapeHtml(gameName)}" not found.</p>`;

        const validSessions = (data.session_history || []).filter(s => s !== null);
        const stats = calculateGameDetailStats(game, validSessions);

        return this.renderViewHtml(stats);
    }

    private renderViewHtml(stats: GameDetailStats): string {
        const heroPosterHtml = stats.iconPath
            ? `<img src="${escapeHtml(safeCachedImagePath(stats.iconPath) || stats.iconPath)}" alt="${escapeHtml(stats.gameName)} cover" class="game-poster-img" id="detail-game-icon">`
            : `<div class="poster-fallback" id="detail-game-icon" aria-hidden="true"><span class="fallback-icon">🎮</span><span class="fallback-initials">${escapeHtml(stats.initials)}</span></div>`;

        const finishDateHtml = stats.finishedDateFormatted
            ? `<div class="game-detail-hero-finished" id="detail-finish-date-container">
                   <span class="meta-icon"><i class="fa-regular fa-circle-check"></i></span>
                   <span class="meta-label">Finished:</span>
                   <span id="detail-finish-date" class="meta-value">${escapeHtml(stats.finishedDateFormatted)}</span>
               </div>`
            : "";

        const lastPlayedText = escapeHtml(stats.lastPlayedFormatted);

        // 1. Hero Header
        const heroSectionHtml = `
            <div class="game-detail-hero">
                <div class="game-detail-hero-poster">
                    <div class="game-poster-frame">
                        ${heroPosterHtml}
                    </div>
                </div>
                <div class="game-detail-hero-content">
                    <div class="game-detail-hero-badges">
                        <span id="detail-status" class="hero-status-pill status-${escapeHtml(stats.statusSlug)}">
                            <span class="status-indicator-dot"></span>
                            ${escapeHtml(stats.statusCategory)}
                        </span>
                    </div>
                    <h1 id="detail-game-name" class="game-detail-title">${escapeHtml(stats.gameName)}</h1>
                    <div class="game-detail-hero-meta">
                        <div class="game-detail-meta-item">
                            <span class="meta-icon"><i class="fa-regular fa-calendar"></i></span>
                            <span class="meta-label">Release:</span>
                            <span class="meta-value">${escapeHtml(stats.releaseDateFormatted)}</span>
                        </div>
                        <div class="game-detail-meta-item">
                            <span class="meta-icon"><i class="fa-regular fa-clock"></i></span>
                            <span class="meta-label">Last Played:</span>
                            <span id="detail-last-played" class="meta-value">${lastPlayedText}</span>
                        </div>
                    </div>
                    ${finishDateHtml}
                    <div class="game-detail-hero-actions">
                        <a href="${escapeHtml(stats.steamSearchUrl)}" target="_blank" rel="noopener noreferrer" class="steam-store-btn" title="View ${escapeHtml(stats.gameName)} on Steam">
                            <i class="fa-brands fa-steam"></i>
                            <span>View on Steam</span>
                            <i class="fa-solid fa-arrow-up-right-from-square external-icon"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;

        // 2. Quick Stat Cards Grid
        const statCardsHtml = `
            <div class="game-detail-stats-grid">
                <div class="game-stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Total Play Time</span>
                        <div class="stat-card-icon icon-playtime"><i class="fa-solid fa-stopwatch"></i></div>
                    </div>
                    <div class="stat-card-value" id="detail-playtime">${escapeHtml(stats.totalPlayTimeFormatted)}</div>
                    <div class="stat-card-subtext">${Math.round((stats.totalPlayTimeMinutes / 60) * 10) / 10} hours total</div>
                </div>

                <div class="game-stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Total Sessions</span>
                        <div class="stat-card-icon icon-sessions"><i class="fa-solid fa-gamepad"></i></div>
                    </div>
                    <div class="stat-card-value" id="detail-sessions">${stats.totalSessions}</div>
                    <div class="stat-card-subtext">Recorded play sessions</div>
                </div>

                <div class="game-stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Average Session</span>
                        <div class="stat-card-icon icon-avg"><i class="fa-solid fa-chart-line"></i></div>
                    </div>
                    <div class="stat-card-value">${escapeHtml(stats.avgSessionFormatted)}</div>
                    <div class="stat-card-subtext">${stats.avgSessionMinutes} min average</div>
                </div>

                <div class="game-stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Longest Session</span>
                        <div class="stat-card-icon icon-longest"><i class="fa-solid fa-trophy"></i></div>
                    </div>
                    <div class="stat-card-value">${stats.longestSession ? escapeHtml(stats.longestSession.durationFormatted) : "0 Min"}</div>
                    <div class="stat-card-subtext">${stats.longestSession ? `on ${escapeHtml(stats.longestSession.dateFormatted)}` : "No sessions yet"}</div>
                </div>
            </div>
        `;

        // 3. Timeline Chart
        const timelineCardHtml = this.renderTimelineCard(stats.timeline);

        // 4. Time of Day Breakdown Card
        const breakdownCardHtml = this.renderBreakdownCard(stats);

        // 5. Recent Sessions Table / List
        const recentSessionsCardHtml = this.renderRecentSessionsCard(stats.allSessions);

        return `
            <div id="game-detail-view" class="game-detail-container">
                <div class="game-detail-top-nav">
                    <button type="button" id="game-detail-back-btn" class="game-detail-back-btn" aria-label="Go back">
                        <i class="fa-solid fa-chevron-left"></i>
                        <span>Back</span>
                    </button>
                    <a href="#all-games" class="back-link" style="display: none;">Back to List</a>
                </div>

                <div class="game-detail-header-row">
                    ${heroSectionHtml}
                    ${statCardsHtml}
                </div>

                <div class="game-detail-main-layout">
                    <div class="game-detail-top-cards">
                        <div class="game-detail-sessions-col">
                            ${recentSessionsCardHtml}
                        </div>
                        <div class="game-detail-breakdown-col">
                            ${breakdownCardHtml}
                        </div>
                    </div>
                    <div class="game-detail-bottom-card">
                        ${timelineCardHtml}
                    </div>
                </div>
            </div>
        `;
    }

    private renderTimelineCard(timeline: TimelineSessionPoint[]): string {
        if (timeline.length === 0) {
            return `
                <div class="game-detail-card timeline-card">
                    <div class="detail-card-header">
                        <div>
                            <h3 class="detail-card-title">Game Session History</h3>
                            <p class="detail-card-subtitle">Timeline of play sessions and durations</p>
                        </div>
                    </div>
                    <div class="detail-card-empty">
                        <p>No play sessions recorded yet for this game.</p>
                    </div>
                </div>
            `;
        }

        const chartHeight = 150;
        const chartWidth = 1000;
        const paddingLeft = 40;
        const paddingRight = 24;
        const paddingTop = 15;
        const paddingBottom = 30;
        const innerWidth = chartWidth - paddingLeft - paddingRight;
        const innerHeight = chartHeight - paddingTop - paddingBottom;

        const maxDuration = Math.max(1, ...timeline.map(p => p.durationMinutes));
        const numPoints = timeline.length;
        const stepX = numPoints > 1 ? innerWidth / (numPoints - 1) : innerWidth / 2;
        const barWidth = Math.max(6, Math.min(28, Math.floor(innerWidth / (numPoints * 1.5))));

        const barsSvg = timeline.map((pt, idx) => {
            const x = numPoints === 1 ? paddingLeft + innerWidth / 2 : paddingLeft + idx * stepX;
            const barH = Math.max(4, (pt.durationMinutes / maxDuration) * innerHeight);
            const y = paddingTop + innerHeight - barH;
            return `
                <g class="timeline-bar-group" tabindex="0" role="img" aria-label="${escapeHtml(pt.dateFormatted)}: ${escapeHtml(pt.durationFormatted)}">
                    <rect 
                        class="timeline-bar-anim" 
                        x="${x - barWidth / 2}" 
                        y="${y}" 
                        width="${barWidth}" 
                        height="${barH}" 
                        rx="3" 
                        fill="var(--accent-blue, #3b82f6)"
                    >
                        <title>${escapeHtml(pt.dateFormatted)}${pt.timeFormatted ? ` ${escapeHtml(pt.timeFormatted)}` : ""}: ${escapeHtml(pt.durationFormatted)}</title>
                    </rect>
                    <circle cx="${x}" cy="${y}" r="2.5" class="timeline-bar-dot" fill="var(--accent-purple, #8b5cf6)" />
                </g>
            `;
        }).join("");

        // Date labels on axis (show first, middle, last or up to 8 points)
        let axisLabelsSvg: string;
        if (numPoints <= 8) {
            axisLabelsSvg = timeline.map((pt, idx) => {
                const x = numPoints === 1 ? paddingLeft + innerWidth / 2 : paddingLeft + idx * stepX;
                return `<text x="${x}" y="${chartHeight - 8}" class="timeline-axis-label" text-anchor="middle">${escapeHtml(pt.dateFormatted.slice(0, 5))}</text>`;
            }).join("");
        } else {
            const indices = [0, Math.floor(numPoints / 4), Math.floor(numPoints / 2), Math.floor((3 * numPoints) / 4), numPoints - 1];
            axisLabelsSvg = indices.map(idx => {
                const pt = timeline[idx];
                const x = paddingLeft + idx * stepX;
                return `<text x="${x}" y="${chartHeight - 8}" class="timeline-axis-label" text-anchor="middle">${escapeHtml(pt.dateFormatted.slice(0, 5))}</text>`;
            }).join("");
        }

        return `
            <div class="game-detail-card timeline-card">
                <div class="detail-card-header">
                    <div>
                        <h3 class="detail-card-title">Game Session History</h3>
                        <p class="detail-card-subtitle">${numPoints} ${numPoints === 1 ? "session" : "sessions"} recorded</p>
                    </div>
                </div>
                <div class="timeline-chart-wrapper">
                    <svg class="session-timeline-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none">
                        <!-- Grid lines -->
                        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${chartWidth - paddingRight}" y2="${paddingTop}" class="timeline-grid-line" stroke="var(--border-subtle, rgba(255,255,255,0.08))" stroke-dasharray="3,3" />
                        <line x1="${paddingLeft}" y1="${paddingTop + innerHeight / 2}" x2="${chartWidth - paddingRight}" y2="${paddingTop + innerHeight / 2}" class="timeline-grid-line" stroke="var(--border-subtle, rgba(255,255,255,0.08))" stroke-dasharray="3,3" />
                        <line x1="${paddingLeft}" y1="${paddingTop + innerHeight}" x2="${chartWidth - paddingRight}" y2="${paddingTop + innerHeight}" class="timeline-baseline" stroke="var(--border-strong, rgba(255,255,255,0.15))" />
                        
                        <!-- Axis Labels Y -->
                        <text x="${paddingLeft - 6}" y="${paddingTop + 4}" class="timeline-axis-label" text-anchor="end">${maxDuration}m</text>
                        <text x="${paddingLeft - 6}" y="${paddingTop + innerHeight / 2 + 4}" class="timeline-axis-label" text-anchor="end">${Math.round(maxDuration / 2)}m</text>
                        <text x="${paddingLeft - 6}" y="${paddingTop + innerHeight + 4}" class="timeline-axis-label" text-anchor="end">0m</text>

                        <!-- Bars -->
                        ${barsSvg}
                        ${axisLabelsSvg}
                    </svg>
                </div>
            </div>
        `;
    }

    private renderBreakdownCard(stats: GameDetailStats): string {
        const slotIcons: Record<string, string> = {
            Morning: "fa-sun",
            Afternoon: "fa-cloud-sun",
            Evening: "fa-moon",
            Night: "fa-star"
        };

        const timeOfDayRows = stats.timeOfDay.map(slot => {
            const icon = slotIcons[slot.slot] || "fa-clock";
            return `
                <div class="breakdown-slot-item">
                    <div class="breakdown-slot-header">
                        <div class="breakdown-slot-label-group">
                            <span class="breakdown-slot-icon slot-${slot.slot.toLowerCase()}"><i class="fa-solid ${icon}"></i></span>
                            <span class="breakdown-slot-name">${escapeHtml(slot.label)}</span>
                            <span class="breakdown-slot-hours">${escapeHtml(slot.hoursLabel)}</span>
                        </div>
                        <div class="breakdown-slot-values">
                            <span class="breakdown-slot-count">${slot.count} ${slot.count === 1 ? "session" : "sessions"}</span>
                            <span class="breakdown-slot-pct">${slot.percentage}%</span>
                        </div>
                    </div>
                    <div class="breakdown-progress-track">
                        <div class="breakdown-progress-fill" style="width: ${slot.percentage}%; background-color: ${slot.color};"></div>
                    </div>
                </div>
            `;
        }).join("");

        const weekdayWeekendHtml = `
            <div class="breakdown-split-section">
                <div class="breakdown-split-header">
                    <span class="split-title">Weekday vs. Weekend</span>
                    <span class="split-subtext">${stats.weekdayPercentage}% Weekday / ${stats.weekendPercentage}% Weekend</span>
                </div>
                <div class="breakdown-split-bar">
                    <div class="split-bar-fill weekday-fill" style="width: ${stats.weekdayPercentage}%;" title="Weekday: ${stats.weekdayMinutes} min (${stats.weekdayPercentage}%)"></div>
                    <div class="split-bar-fill weekend-fill" style="width: ${stats.weekendPercentage}%;" title="Weekend: ${stats.weekendMinutes} min (${stats.weekendPercentage}%)"></div>
                </div>
                <div class="breakdown-split-legend">
                    <span class="legend-item"><span class="legend-dot weekday-dot"></span> Weekday (${formatPlaytime(stats.weekdayMinutes)})</span>
                    <span class="legend-item"><span class="legend-dot weekend-dot"></span> Weekend (${formatPlaytime(stats.weekendMinutes)})</span>
                </div>
            </div>
        `;

        return `
            <div class="game-detail-card breakdown-card">
                <div class="detail-card-header">
                    <div>
                        <h3 class="detail-card-title">Session Breakdown</h3>
                        <p class="detail-card-subtitle">Playtime habits and schedule</p>
                    </div>
                </div>
                <div class="breakdown-card-content">
                    <div class="breakdown-slots-container">
                        ${timeOfDayRows}
                    </div>
                    ${weekdayWeekendHtml}
                </div>
            </div>
        `;
    }

    private renderRecentSessionsCard(sessions: Session[]): string {
        // Sort descending (newest first) for backward compatibility
        const sortedSessions = [...sessions].sort((a, b) => {
            return toSortableTimestamp(b.start_time) - toSortableTimestamp(a.start_time);
        });

        if (sortedSessions.length === 0) {
            return `
                <div class="game-detail-card recent-sessions-card">
                    <div class="detail-card-header">
                        <div>
                            <h3 class="detail-card-title">Recent Sessions</h3>
                            <p class="detail-card-subtitle">History of individual play sessions</p>
                        </div>
                    </div>
                    <div class="detail-card-empty">
                        <p>No session history was found.</p>
                    </div>
                </div>
            `;
        }

        const sessionRows = sortedSessions.map(s => {
            const parsed = parseSessionDate(s.start_time);
            const startFormatted = parsed ? formatDateTime(parsed) : String(s.start_time);
            return `
                <tr class="detail-session-row">
                    <td class="detail-session-start">${escapeHtml(startFormatted)}</td>
                    <td class="detail-session-duration">${s.duration} Min</td>
                </tr>
            `;
        }).join("");

        return `
            <div class="game-detail-card recent-sessions-card">
                <div class="detail-card-header">
                    <div>
                        <h3 class="detail-card-title">Recent Sessions</h3>
                        <p class="detail-card-subtitle">Showing all ${sortedSessions.length} recorded ${sortedSessions.length === 1 ? "session" : "sessions"}</p>
                    </div>
                </div>
                <div class="detail-sessions-table-wrapper">
                    <table class="detail-sessions-table">
                        <thead>
                            <tr>
                                <th>Start Time</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sessionRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    mount(container: HTMLElement): void {
        this.currentContainer = container;

        const backBtn = container.querySelector<HTMLButtonElement>("#game-detail-back-btn");
        if (backBtn) {
            this.backBtnListener = (e: Event) => {
                e.preventDefault();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.hash = "#all-games";
                }
            };
            backBtn.addEventListener("click", this.backBtnListener);
        }
    }

    destroy(): void {
        if (this.currentContainer && this.backBtnListener) {
            const backBtn = this.currentContainer.querySelector<HTMLButtonElement>("#game-detail-back-btn");
            if (backBtn) {
                backBtn.removeEventListener("click", this.backBtnListener);
            }
        }
        this.backBtnListener = null;
        this.currentContainer = null;
    }
}
