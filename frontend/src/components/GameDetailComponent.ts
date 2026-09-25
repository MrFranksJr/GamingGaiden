import {GameData, Session} from "../types/GameData";
import {formatPlaytime, toSortableTimestamp} from "../utils/TimeUtils";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils";
import {
    calculateGameDetailStats,
    computeTimelineAxis,
    formatDateTime,
    GameDetailStats,
    parseSessionDate,
    TimelineAxis,
    TimelineSessionPoint
} from "../utils/GameDetailStatsCalculator";

/**
 * Fixed inner-geometry of the timeline chart. Width is dynamic (measured at
 * mount); everything else is constant. Height targets ~380px per design.
 */
interface TimelineDims {
    chartHeight: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
}

const TIMELINE_DIMS: TimelineDims = {
    chartHeight: 380,
    paddingLeft: 48,
    paddingRight: 24,
    paddingTop: 20,
    paddingBottom: 34
};

/** Width assumed for the pre-mount (server-less) initial render. */
const TIMELINE_ESTIMATED_WIDTH = 1000;

/** Per-bar stagger and grow duration for the load animation. */
const TIMELINE_BAR_GROW_MS = 550;
const TIMELINE_STAGGER_MS = 25;
const TIMELINE_STAGGER_TOTAL_CAP_MS = 1000;

/** Session Breakdown fill animation: same curve as the graph, top-to-bottom stagger. */
const BREAKDOWN_FILL_MS = 550;
const BREAKDOWN_STAGGER_MS = 70;
const ANIM_EASE = "cubic-bezier(0.22,1,0.36,1)";

interface BarLayout {
    x: number;      // centre x
    y: number;      // top y (at full height)
    width: number;
    height: number; // full (target) height
}

interface TickLayout {
    minutes: number;
    label: string;
    y: number;
}

interface XLabelLayout {
    x: number;
    label: string;
}

interface TimelineLayout {
    baselineY: number;
    innerHeight: number;
    bars: BarLayout[];
    ticks: TickLayout[];
    xLabels: XLabelLayout[];
}

/**
 * Computes real-pixel coordinates for bars, tick gridlines, and x-axis date
 * labels given a concrete chart width. Pure and deterministic so it can drive
 * both the initial render (estimated width) and the mount-time relayout
 * (measured width) identically.
 */
export function computeTimelineLayout(
    timeline: TimelineSessionPoint[],
    axis: TimelineAxis,
    chartWidth: number,
    dims: TimelineDims = TIMELINE_DIMS
): TimelineLayout {
    const innerWidth = Math.max(1, chartWidth - dims.paddingLeft - dims.paddingRight);
    const innerHeight = Math.max(1, dims.chartHeight - dims.paddingTop - dims.paddingBottom);
    const baselineY = dims.paddingTop + innerHeight;
    const numPoints = timeline.length;
    const ceiling = Math.max(1, axis.axisCeiling);

    const stepX = numPoints > 1 ? innerWidth / (numPoints - 1) : innerWidth / 2;
    const barWidth = Math.max(6, Math.min(36, Math.floor(innerWidth / Math.max(1, numPoints * 1.5))));

    const bars: BarLayout[] = timeline.map((pt, idx) => {
        const x = numPoints === 1 ? dims.paddingLeft + innerWidth / 2 : dims.paddingLeft + idx * stepX;
        const height = Math.max(2, (pt.durationMinutes / ceiling) * innerHeight);
        const y = baselineY - height;
        return {x, y, width: barWidth, height};
    });

    const ticks: TickLayout[] = axis.ticks.map(t => ({
        minutes: t.minutes,
        label: t.label,
        y: baselineY - (t.minutes / ceiling) * innerHeight
    }));

    // X labels: up to 5 evenly spaced date markers (first..last).
    let xLabels: XLabelLayout[];
    if (numPoints <= 8) {
        xLabels = timeline.map((pt, idx) => ({
            x: numPoints === 1 ? dims.paddingLeft + innerWidth / 2 : dims.paddingLeft + idx * stepX,
            label: pt.dateFormatted.slice(0, 5)
        }));
    } else {
        const indices = [0, Math.floor(numPoints / 4), Math.floor(numPoints / 2), Math.floor((3 * numPoints) / 4), numPoints - 1];
        xLabels = indices.map(idx => ({
            x: dims.paddingLeft + idx * stepX,
            label: timeline[idx].dateFormatted.slice(0, 5)
        }));
    }

    return {baselineY, innerHeight, bars, ticks, xLabels};
}

export class GameDetailComponent {
    private currentContainer: HTMLElement | null = null;
    private backBtnListener: ((e: Event) => void) | null = null;
    private timeline: TimelineSessionPoint[] = [];
    private timelineAxis: TimelineAxis | null = null;
    private readonly timelineDims: TimelineDims = TIMELINE_DIMS;
    private timelineResizeListener: (() => void) | null = null;
    private timelineResizeObserver: ResizeObserver | null = null;
    private timelineFrame: number | null = null;
    private timelineTooltipCleanup: (() => void) | null = null;
    private breakdownFrame: number | null = null;

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

        // Real-pixel layout is finalised at mount() once the container width is
        // known; the initial markup is drawn against an estimated width so the
        // chart is valid and testable before mount, and re-laid-out afterwards.
        const numPoints = timeline.length;
        const maxDuration = Math.max(1, ...timeline.map(p => p.durationMinutes));
        const axis = computeTimelineAxis(maxDuration);

        // Stash for the mount-time layout + animation pass.
        this.timeline = timeline;
        this.timelineAxis = axis;

        const dims = this.timelineDims;
        const estimatedWidth = TIMELINE_ESTIMATED_WIDTH;
        const layout = computeTimelineLayout(timeline, axis, estimatedWidth, dims);

        const gridSvg = layout.ticks.map(t =>
            `<line class="timeline-grid-line" x1="${dims.paddingLeft}" y1="${t.y.toFixed(2)}" x2="${(estimatedWidth - dims.paddingRight).toFixed(2)}" y2="${t.y.toFixed(2)}" ${t.minutes === 0 ? "" : `stroke-dasharray="3,3"`} />`
        ).join("");

        const yLabelsSvg = layout.ticks.map(t =>
            `<text class="timeline-axis-label timeline-y-label" x="${(dims.paddingLeft - 8).toFixed(2)}" y="${(t.y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(t.label)}</text>`
        ).join("");

        const barsSvg = layout.bars.map((b, idx) => {
            const pt = timeline[idx];
            const tooltip = `${pt.dateFormatted}${pt.timeFormatted ? ` ${pt.timeFormatted}` : ""} · ${pt.durationFormatted}`;
            return `
                <g class="timeline-bar-group" tabindex="0" role="img"
                   aria-label="${escapeHtml(pt.dateFormatted)}: ${escapeHtml(pt.durationFormatted)}"
                   data-minutes="${pt.durationMinutes}"
                   data-index="${idx}"
                   data-tooltip="${escapeHtml(tooltip)}">
                    <rect class="timeline-bar-anim"
                          x="${(b.x - b.width / 2).toFixed(2)}"
                          y="${b.y.toFixed(2)}"
                          width="${b.width.toFixed(2)}"
                          height="${b.height.toFixed(2)}"
                          rx="3"
                          fill="var(--accent-blue, #3b82f6)" />
                    <circle class="timeline-bar-dot"
                            cx="${b.x.toFixed(2)}"
                            cy="${b.y.toFixed(2)}"
                            r="2.5"
                            fill="var(--status-forever, #8b5cf6)" />
                </g>
            `;
        }).join("");

        const xLabelsSvg = layout.xLabels.map(l =>
            `<text class="timeline-axis-label timeline-x-label" x="${l.x.toFixed(2)}" y="${(dims.chartHeight - 8).toFixed(2)}" text-anchor="middle">${escapeHtml(l.label)}</text>`
        ).join("");

        return `
            <div class="game-detail-card timeline-card">
                <div class="detail-card-header">
                    <div>
                        <h3 class="detail-card-title">Game Session History</h3>
                        <p class="detail-card-subtitle">${numPoints} ${numPoints === 1 ? "session" : "sessions"} recorded</p>
                    </div>
                </div>
                <div class="timeline-chart-wrapper">
                    <svg class="session-timeline-svg" width="${estimatedWidth}" height="${dims.chartHeight}"
                         viewBox="0 0 ${estimatedWidth} ${dims.chartHeight}" preserveAspectRatio="xMinYMin meet">
                        <g class="timeline-grid">${gridSvg}</g>
                        <g class="timeline-y-axis">${yLabelsSvg}</g>
                        <g class="timeline-bars">${barsSvg}</g>
                        <g class="timeline-x-axis">${xLabelsSvg}</g>
                    </svg>
                    <div class="timeline-tooltip" role="tooltip" aria-hidden="true"></div>
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

        this.setupTimeline(container);
        this.setupBreakdownAnimation(container);
    }

    /**
     * Lays out the timeline at the measured container width, wires the instant
     * tooltip, triggers the grow-up animation, and keeps the chart responsive
     * to width changes.
     */
    private setupTimeline(container: HTMLElement): void {
        const svg = container.querySelector<SVGSVGElement>(".session-timeline-svg");
        const wrapper = container.querySelector<HTMLElement>(".timeline-chart-wrapper");
        if (!svg || !wrapper || !this.timelineAxis || this.timeline.length === 0) {
            return;
        }

        const relayout = () => this.layoutTimelineSvg(svg, wrapper);

        // Initial layout on the next frame so the wrapper has a measured width.
        const raf = typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame.bind(window)
            : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number;
        this.timelineFrame = raf(() => {
            relayout();
            this.animateTimeline(svg);
        });

        // Stay responsive to width changes without re-animating.
        if (typeof ResizeObserver !== "undefined") {
            this.timelineResizeObserver = new ResizeObserver(() => relayout());
            this.timelineResizeObserver.observe(wrapper);
        } else if (typeof window !== "undefined") {
            this.timelineResizeListener = () => relayout();
            window.addEventListener("resize", this.timelineResizeListener);
        }

        this.setupTimelineTooltip(svg, wrapper);
    }

    /** Recomputes bar/grid/label coordinates for the current wrapper width. */
    private layoutTimelineSvg(svg: SVGSVGElement, wrapper: HTMLElement): void {
        if (!this.timelineAxis) return;
        const width = Math.max(1, Math.round(wrapper.clientWidth || TIMELINE_ESTIMATED_WIDTH));
        const dims = this.timelineDims;
        const layout = computeTimelineLayout(this.timeline, this.timelineAxis, width, dims);

        svg.setAttribute("width", String(width));
        svg.setAttribute("height", String(dims.chartHeight));
        svg.setAttribute("viewBox", `0 0 ${width} ${dims.chartHeight}`);

        const gridLines = svg.querySelectorAll<SVGLineElement>(".timeline-grid .timeline-grid-line");
        const yLabels = svg.querySelectorAll<SVGTextElement>(".timeline-y-axis .timeline-y-label");
        layout.ticks.forEach((t, i) => {
            const line = gridLines[i];
            if (line) {
                line.setAttribute("x1", String(dims.paddingLeft));
                line.setAttribute("y1", t.y.toFixed(2));
                line.setAttribute("x2", String(width - dims.paddingRight));
                line.setAttribute("y2", t.y.toFixed(2));
            }
            const label = yLabels[i];
            if (label) {
                label.setAttribute("x", String(dims.paddingLeft - 8));
                label.setAttribute("y", (t.y + 4).toFixed(2));
            }
        });

        const groups = svg.querySelectorAll<SVGGElement>(".timeline-bars .timeline-bar-group");
        layout.bars.forEach((b, i) => {
            const group = groups[i];
            if (!group) return;
            const rect = group.querySelector<SVGRectElement>(".timeline-bar-anim");
            const dot = group.querySelector<SVGCircleElement>(".timeline-bar-dot");
            if (rect) {
                rect.setAttribute("x", (b.x - b.width / 2).toFixed(2));
                rect.setAttribute("width", b.width.toFixed(2));
                // Preserve mid-animation state: only set full geometry when not animating.
                if (!svg.classList.contains("is-animating")) {
                    rect.setAttribute("y", b.y.toFixed(2));
                    rect.setAttribute("height", b.height.toFixed(2));
                }
                rect.dataset.fullY = b.y.toFixed(2);
                rect.dataset.fullHeight = b.height.toFixed(2);
                rect.dataset.baselineY = layout.baselineY.toFixed(2);
            }
            if (dot) {
                dot.setAttribute("cx", b.x.toFixed(2));
                if (!svg.classList.contains("is-animating")) {
                    dot.setAttribute("cy", b.y.toFixed(2));
                }
                dot.dataset.fullCy = b.y.toFixed(2);
                dot.dataset.baselineY = layout.baselineY.toFixed(2);
            }
        });

        const xLabels = svg.querySelectorAll<SVGTextElement>(".timeline-x-axis .timeline-x-label");
        layout.xLabels.forEach((l, i) => {
            const label = xLabels[i];
            if (label) {
                label.setAttribute("x", l.x.toFixed(2));
                label.setAttribute("y", (dims.chartHeight - 8).toFixed(2));
            }
        });
    }

    /**
     * Animates bars growing from the baseline to full height, staggered
     * left-to-right. Respects prefers-reduced-motion by leaving bars at full
     * height instantly.
     */
    private animateTimeline(svg: SVGSVGElement): void {
        const prefersReduced = typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) return;

        const rects = Array.from(svg.querySelectorAll<SVGRectElement>(".timeline-bar-anim"));
        const dots = Array.from(svg.querySelectorAll<SVGCircleElement>(".timeline-bar-dot"));
        if (rects.length === 0) return;

        const stagger = Math.min(TIMELINE_STAGGER_MS, TIMELINE_STAGGER_TOTAL_CAP_MS / rects.length);

        svg.classList.add("is-animating");

        // Collapse to baseline, then release to full height on the next frame.
        rects.forEach(rect => {
            const baselineY = rect.dataset.baselineY;
            if (baselineY === undefined) return;
            rect.style.transition = "none";
            rect.setAttribute("y", baselineY);
            rect.setAttribute("height", "0");
        });
        dots.forEach(dot => {
            const baselineY = dot.dataset.baselineY;
            if (baselineY === undefined) return;
            dot.style.transition = "none";
            dot.setAttribute("cy", baselineY);
        });

        const raf = typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame.bind(window)
            : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number;

        raf(() => {
            rects.forEach((rect, i) => {
                const delay = i * stagger;
                rect.style.transition = `y ${TIMELINE_BAR_GROW_MS}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, height ${TIMELINE_BAR_GROW_MS}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`;
                const fullY = rect.dataset.fullY;
                const fullHeight = rect.dataset.fullHeight;
                if (fullY !== undefined) rect.setAttribute("y", fullY);
                if (fullHeight !== undefined) rect.setAttribute("height", fullHeight);
            });
            dots.forEach((dot, i) => {
                const delay = i * stagger;
                dot.style.transition = `cy ${TIMELINE_BAR_GROW_MS}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`;
                const fullCy = dot.dataset.fullCy;
                if (fullCy !== undefined) dot.setAttribute("cy", fullCy);
            });

            const totalMs = TIMELINE_BAR_GROW_MS + (rects.length - 1) * stagger + 50;
            setTimeout(() => svg.classList.remove("is-animating"), totalMs);
        });
    }

    /** Wires an instant custom tooltip anchored above the hovered/focused bar. */
    private setupTimelineTooltip(svg: SVGSVGElement, wrapper: HTMLElement): void {
        const tooltip = wrapper.querySelector<HTMLElement>(".timeline-tooltip");
        if (!tooltip) return;

        const show = (group: SVGGElement) => {
            const text = group.dataset.tooltip || "";
            if (!text) return;
            tooltip.textContent = text;
            tooltip.setAttribute("aria-hidden", "false");
            tooltip.classList.add("is-visible");

            // Anchor above the bar centre, in wrapper-local coordinates.
            const rect = group.querySelector<SVGRectElement>(".timeline-bar-anim");
            const wrapperBox = wrapper.getBoundingClientRect();
            const barBox = (rect || group).getBoundingClientRect();
            const centreX = barBox.left + barBox.width / 2 - wrapperBox.left;
            const topY = barBox.top - wrapperBox.top;
            tooltip.style.left = `${centreX}px`;
            tooltip.style.top = `${topY}px`;
        };

        const hide = () => {
            tooltip.classList.remove("is-visible");
            tooltip.setAttribute("aria-hidden", "true");
        };

        const onOver = (e: Event) => {
            const group = (e.target as Element).closest<SVGGElement>(".timeline-bar-group");
            if (group) show(group);
        };
        const onFocusIn = (e: Event) => {
            const group = (e.target as Element).closest<SVGGElement>(".timeline-bar-group");
            if (group) show(group);
        };

        svg.addEventListener("mouseover", onOver);
        svg.addEventListener("mouseout", hide);
        svg.addEventListener("focusin", onFocusIn);
        svg.addEventListener("focusout", hide);

        this.timelineTooltipCleanup = () => {
            svg.removeEventListener("mouseover", onOver);
            svg.removeEventListener("mouseout", hide);
            svg.removeEventListener("focusin", onFocusIn);
            svg.removeEventListener("focusout", hide);
        };
    }

    /**
     * Animates the Session Breakdown bars filling left-to-right after mount:
     * the four time-of-day slot bars stagger top-to-bottom, and the two-segment
     * weekday/weekend split bar animates as a closing beat. Honors
     * prefers-reduced-motion by leaving bars at their target width instantly.
     */
    private setupBreakdownAnimation(container: HTMLElement): void {
        const slotFills = Array.from(
            container.querySelectorAll<HTMLElement>(".breakdown-slots-container .breakdown-progress-fill")
        );
        const splitFills = Array.from(
            container.querySelectorAll<HTMLElement>(".breakdown-split-bar .split-bar-fill")
        );
        const allFills = [...slotFills, ...splitFills];
        if (allFills.length === 0) return;

        const prefersReduced = typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) return; // Leave inline target widths untouched.

        // Capture each target width (set inline at render) and collapse to 0.
        allFills.forEach(el => {
            el.dataset.targetWidth = el.style.width || "0%";
            el.style.transition = "none";
            el.style.width = "0%";
        });

        const raf = typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame.bind(window)
            : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number;

        this.breakdownFrame = raf(() => {
            // Slot bars: staggered top-to-bottom.
            slotFills.forEach((el, i) => {
                const delay = i * BREAKDOWN_STAGGER_MS;
                el.style.transition = `width ${BREAKDOWN_FILL_MS}ms ${ANIM_EASE} ${delay}ms`;
                el.style.width = el.dataset.targetWidth || "0%";
            });
            // Split bar: closing beat, one stagger step after the last slot,
            // both segments together.
            const splitDelay = slotFills.length * BREAKDOWN_STAGGER_MS;
            splitFills.forEach(el => {
                el.style.transition = `width ${BREAKDOWN_FILL_MS}ms ${ANIM_EASE} ${splitDelay}ms`;
                el.style.width = el.dataset.targetWidth || "0%";
            });
        });
    }

    destroy(): void {
        if (this.currentContainer && this.backBtnListener) {
            const backBtn = this.currentContainer.querySelector<HTMLButtonElement>("#game-detail-back-btn");
            if (backBtn) {
                backBtn.removeEventListener("click", this.backBtnListener);
            }
        }

        if (this.timelineFrame !== null && typeof cancelAnimationFrame !== "undefined") {
            cancelAnimationFrame(this.timelineFrame);
        }
        this.timelineFrame = null;

        if (this.breakdownFrame !== null && typeof cancelAnimationFrame !== "undefined") {
            cancelAnimationFrame(this.breakdownFrame);
        }
        this.breakdownFrame = null;

        if (this.timelineResizeObserver) {
            this.timelineResizeObserver.disconnect();
            this.timelineResizeObserver = null;
        }
        if (this.timelineResizeListener && typeof window !== "undefined") {
            window.removeEventListener("resize", this.timelineResizeListener);
            this.timelineResizeListener = null;
        }
        if (this.timelineTooltipCleanup) {
            this.timelineTooltipCleanup();
            this.timelineTooltipCleanup = null;
        }

        this.backBtnListener = null;
        this.currentContainer = null;
    }
}
