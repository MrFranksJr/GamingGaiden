import {GameData} from "../types/GameData.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";
import {
    DayView,
    GamePlayedRow,
    MonthView,
    MilestoneInsight,
    buildDayView,
    buildMonthView,
    buildDayInsight,
    buildMonthInsight,
    daysWithData,
    monthsWithData,
    recentDaysWithData
} from "../utils/SessionHistoryStatsCalculator.js";
import {
    CalendarCell,
    buildMonthGrid,
    currentMonthKey,
    monthLabel,
    monthNameFull,
    shiftMonth,
    todayDayKey,
    yearOf
} from "../utils/CalendarModel.js";

type ViewMode = "day" | "month";

interface ParsedState {
    view: ViewMode;
    date: string;   // YYYY-MM-DD (day view selection)
    month: string;  // YYYY-MM (month view selection)
    calendarMonth: string; // YYYY-MM currently displayed in the calendar
    year: number;   // year displayed in the month grid
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function gameInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function posterHtml(iconPath: string | null, name: string, extraClass = ""): string {
    const safe = safeCachedImagePath(iconPath);
    if (safe) {
        return `<div class="game-poster-frame ${extraClass}"><img src="${escapeHtml(safe)}" alt="${escapeHtml(name)}" class="game-poster-img"></div>`;
    }
    return `<div class="game-poster-frame ${extraClass}"><div class="poster-fallback"><span class="fallback-initials">${escapeHtml(gameInitials(name))}</span><span class="fallback-icon">🎮</span></div></div>`;
}

function humanDate(dayKey: string): string {
    const [y, m, d] = dayKey.split("-").map(Number);
    if (!y || !m || !d) return dayKey;
    const date = new Date(y, m - 1, d);
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    return `${weekday}, ${monthNameFull(m)} ${d}, ${y}`;
}

function weekdayShort(dayKey: string): string {
    const [y, m, d] = dayKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

export class SessionHistoryComponent {
    private data: GameData | null = null;
    private container: HTMLElement | null = null;

    render(data: GameData, parameter?: string | null): string {
        this.data = data;
        if (!data || !Array.isArray(data.session_history)) {
            return `<div id="session-history-view"><p class="session-empty-state">No session history was found.</p></div>`;
        }
        const hasAnySessions = data.session_history.some(session => session != null);
        if (!hasAnySessions) {
            return `<div id="session-history-view"><p class="session-empty-state">No session history was found.</p></div>`;
        }

        const state = this.parseState(parameter);

        return `
            <div id="session-history-view" class="session-history-page">
                <header class="session-history-header">
                    <h1>Session History</h1>
                    <p class="session-history-subtitle">Browse your gaming sessions, organized by day or month.</p>
                </header>
                <div class="session-tabs" role="tablist">
                    <button class="session-tab ${state.view === "day" ? "active" : ""}" data-view="day" role="tab">
                        <i class="fa-solid fa-calendar-day"></i> By day
                    </button>
                    <button class="session-tab ${state.view === "month" ? "active" : ""}" data-view="month" role="tab">
                        <i class="fa-solid fa-calendar"></i> By month
                    </button>
                </div>
                <div class="session-history-body">
                    ${state.view === "day" ? this.renderDayView(data, state) : this.renderMonthView(data, state)}
                </div>
            </div>
        `;
    }

    // ---- state ---------------------------------------------------------------

    private parseState(parameter?: string | null): ParsedState {
        const params = new URLSearchParams(parameter ?? "");
        const view: ViewMode = params.get("view") === "month" ? "month" : "day";
        const date = params.get("date") || todayDayKey();
        const month = params.get("month") || currentMonthKey();
        // The calendar can be browsed independently of the selected day via `cal`.
        const calendarMonth = params.get("cal") || date.slice(0, 7);
        const year = view === "month" ? yearOf(month) : yearOf(date);
        return {view, date, month, calendarMonth, year};
    }

    // ---- day view ------------------------------------------------------------

    private renderDayView(data: GameData, state: ParsedState): string {
        const view = buildDayView(data, state.date);
        const dataDays = daysWithData(data);
        return `
            <div class="session-col session-col-left">
                ${this.renderCalendar(state, dataDays)}
                ${this.renderRecentDays(data, state.date)}
            </div>
            <div class="session-col session-col-middle">
                ${view.isEmpty ? this.renderEmptyDay(state.date) : this.renderDiaryCards(view)}
            </div>
            <div class="session-col session-col-right">
                ${view.isEmpty ? "" : this.renderDaySidebar(view, state.date)}
            </div>
        `;
    }

    private renderCalendar(state: ParsedState, dataDays: Set<string>): string {
        const grid = buildMonthGrid(state.calendarMonth, dataDays, state.date);
        const prev = shiftMonth(state.calendarMonth, -1);
        const next = shiftMonth(state.calendarMonth, 1);
        const headers = WEEKDAY_HEADERS.map(h => `<span class="calendar-weekday">${h}</span>`).join("");
        const cells = grid.weeks.flat().map(cell => this.renderCalendarCell(cell)).join("");
        return `
            <div class="session-calendar">
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" data-cal-month="${escapeHtml(prev)}" aria-label="Previous month"><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="calendar-title">${escapeHtml(monthLabel(state.calendarMonth))}</span>
                    <button class="calendar-nav-btn" data-cal-month="${escapeHtml(next)}" aria-label="Next month"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="calendar-weekdays">${headers}</div>
                <div class="calendar-grid">${cells}</div>
            </div>
        `;
    }

    private renderCalendarCell(cell: CalendarCell): string {
        if (!cell.inMonth) return `<span class="calendar-day calendar-day-blank"></span>`;
        const classes = ["calendar-day"];
        if (cell.isSelected) classes.push("selected");
        if (cell.hasData) classes.push("has-data");
        const dot = cell.hasData ? `<span class="calendar-dot"></span>` : "";
        return `<button class="${classes.join(" ")}" data-day="${escapeHtml(cell.dayKey)}"><span class="calendar-day-num">${cell.dayNumber}</span>${dot}</button>`;
    }

    private renderRecentDays(data: GameData, selectedDay: string): string {
        const recent = recentDaysWithData(data, 5);
        if (recent.length === 0) return "";
        const rows = recent.map(day => `
            <button class="recent-day-row ${day.dayKey === selectedDay ? "active" : ""}" data-day="${escapeHtml(day.dayKey)}">
                <span class="recent-day-dot"></span>
                <span class="recent-day-label">
                    <span class="recent-day-date">${escapeHtml(day.dayKey)}</span>
                    <span class="recent-day-weekday">${escapeHtml(weekdayShort(day.dayKey))}</span>
                </span>
                <span class="recent-day-total">${escapeHtml(day.totalFormatted)}</span>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `).join("");
        return `
            <div class="recent-days">
                <h3 class="recent-days-title">Recent days</h3>
                ${rows}
            </div>
        `;
    }

    private renderDiaryCards(view: DayView): string {
        const cards = view.sessions.map(card => `
            <a class="session-diary-card" href="${escapeHtml(card.detailHref)}">
                ${posterHtml(card.iconPath, card.gameName, "session-card-poster")}
                <div class="session-card-info">
                    <div class="session-card-top">
                        <span class="session-card-title">${escapeHtml(card.gameName)}</span>
                        <span class="hero-status-pill status-${escapeHtml(card.statusSlug)}">${escapeHtml(this.statusLabel(card.statusSlug))}</span>
                    </div>
                    <span class="session-card-range">${escapeHtml(card.timeRange)}</span>
                    <span class="session-card-duration">${escapeHtml(card.durationFormatted)}</span>
                </div>
                <i class="fa-solid fa-chevron-right session-card-chevron"></i>
            </a>
        `).join("");
        return `
            <div class="session-diary">
                <div class="session-diary-header">
                    <h2>${escapeHtml(humanDate(view.dayKey))}</h2>
                    <span class="session-diary-total">${escapeHtml(view.stats.totalFormatted)} total playtime</span>
                </div>
                ${cards}
            </div>
        `;
    }

    private renderEmptyDay(dayKey: string): string {
        return `
            <div class="session-empty-state">
                <i class="fa-solid fa-moon"></i>
                <h2>No gaming sessions on ${escapeHtml(humanDate(dayKey))}</h2>
                <p>Pick a highlighted day from the calendar to see what was played.</p>
            </div>
        `;
    }

    private renderDaySidebar(view: DayView, dayKey: string): string {
        const insight = buildDayInsight(this.data!, dayKey);
        return `
            <div class="session-summary-card">
                <div class="session-summary-hero">
                    <span class="session-summary-date">${escapeHtml(humanDate(dayKey))}</span>
                    <span class="session-summary-total-label">Total playtime</span>
                    <span class="session-summary-total">${escapeHtml(view.stats.totalFormatted)}</span>
                </div>
                <div class="session-stat-tiles">
                    <div class="stat-card"><i class="fa-solid fa-gamepad"></i><span class="stat-value">${view.stats.gamesCount}</span><span class="stat-label">Games</span></div>
                    <div class="stat-card"><i class="fa-solid fa-play"></i><span class="stat-value">${view.stats.sessionCount}</span><span class="stat-label">Sessions</span></div>
                    <div class="stat-card"><i class="fa-solid fa-clock"></i><span class="stat-value">${escapeHtml(view.stats.avgSessionFormatted)}</span><span class="stat-label">Avg. session</span></div>
                </div>
                ${this.renderGamesPlayed(view.gamesPlayed)}
                ${this.renderMilestoneInsight(insight)}
            </div>
        `;
    }

    // ---- month view ----------------------------------------------------------

    private renderMonthView(data: GameData, state: ParsedState): string {
        const view = buildMonthView(data, state.month);
        const dataMonths = monthsWithData(data);
        return `
            <div class="session-col session-col-left">
                ${this.renderYearGrid(state, dataMonths)}
            </div>
            <div class="session-col session-col-middle">
                ${view.isEmpty ? this.renderEmptyMonth(state.month) : this.renderMonthCards(view, state.month)}
            </div>
            <div class="session-col session-col-right">
                ${view.isEmpty ? "" : this.renderMonthSidebar(view, state.month)}
            </div>
        `;
    }

    private renderYearGrid(state: ParsedState, dataMonths: Set<string>): string {
        const cards: string[] = [];
        for (let m = 1; m <= 12; m++) {
            const key = `${state.year}-${m < 10 ? "0" + m : m}`;
            const hasData = dataMonths.has(key);
            const isSelected = key === state.month;
            const dot = hasData ? `<span class="month-dot"></span>` : "";
            cards.push(`
                <button class="month-card ${isSelected ? "selected" : ""} ${hasData ? "has-data" : ""}" data-month="${escapeHtml(key)}">
                    <span class="month-card-name">${escapeHtml(monthNameFull(m).slice(0, 3).toUpperCase())}</span>
                    ${dot}
                </button>
            `);
        }
        return `
            <div class="session-year-grid">
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" data-year="${state.year - 1}" aria-label="Previous year"><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="calendar-title">${state.year}</span>
                    <button class="calendar-nav-btn" data-year="${state.year + 1}" aria-label="Next year"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="month-grid">${cards.join("")}</div>
            </div>
        `;
    }

    private renderMonthCards(view: MonthView, monthKey: string): string {
        const cards = view.gamesPlayed.map(game => `
            <a class="month-game-card" href="${escapeHtml(game.detailHref)}">
                ${posterHtml(game.iconPath, game.gameName, "session-card-poster")}
                <div class="session-card-info">
                    <span class="session-card-title">${escapeHtml(game.gameName)}</span>
                    <span class="session-card-duration">${escapeHtml(game.formatted)}</span>
                </div>
                <i class="fa-solid fa-chevron-right session-card-chevron"></i>
            </a>
        `).join("");
        return `
            <div class="session-diary">
                <div class="session-diary-header">
                    <h2>${escapeHtml(monthLabel(monthKey))}</h2>
                    <span class="session-diary-total">${escapeHtml(view.stats.totalFormatted)} total playtime</span>
                </div>
                ${cards}
            </div>
        `;
    }

    private renderEmptyMonth(monthKey: string): string {
        return `
            <div class="session-empty-state">
                <i class="fa-solid fa-moon"></i>
                <h2>No gaming sessions in ${escapeHtml(monthLabel(monthKey))}</h2>
                <p>Pick a highlighted month to see what was played.</p>
            </div>
        `;
    }

    private renderMonthSidebar(view: MonthView, monthKey: string): string {
        const insight = buildMonthInsight(this.data!, monthKey);
        return `
            <div class="session-summary-card">
                <div class="session-summary-hero">
                    <span class="session-summary-date">${escapeHtml(monthLabel(monthKey))}</span>
                    <span class="session-summary-total-label">Total playtime</span>
                    <span class="session-summary-total">${escapeHtml(view.stats.totalFormatted)}</span>
                </div>
                <div class="session-stat-tiles">
                    <div class="stat-card"><i class="fa-solid fa-gamepad"></i><span class="stat-value">${view.stats.gamesCount}</span><span class="stat-label">Games</span></div>
                    <div class="stat-card"><i class="fa-solid fa-play"></i><span class="stat-value">${view.stats.sessionCount}</span><span class="stat-label">Sessions</span></div>
                    <div class="stat-card"><i class="fa-solid fa-clock"></i><span class="stat-value">${escapeHtml(view.stats.avgSessionFormatted)}</span><span class="stat-label">Avg. session</span></div>
                </div>
                ${this.renderGamesPlayed(view.gamesPlayed)}
                ${this.renderMilestoneInsight(insight)}
            </div>
        `;
    }

    // ---- shared --------------------------------------------------------------

    private renderGamesPlayed(games: GamePlayedRow[]): string {
        if (games.length === 0) return "";
        const rows = games.map(game => {
            // Custom properties consumed by `.games-played-bar-fill` in common.css.
            // Built as a plain string so the IDE does not inject/parse it as a CSS ruleset.
            const barStyle = ["--bar-width:", String(game.percentage), "%;--bar-color:", escapeHtml(game.color)].join("");
            return `
            <div class="session-games-played-row">
                ${posterHtml(game.iconPath, game.gameName, "games-played-poster")}
                <div class="games-played-info">
                    <div class="games-played-top">
                        <span class="games-played-name">${escapeHtml(game.gameName)}</span>
                        <span class="games-played-time">${escapeHtml(game.formatted)}</span>
                    </div>
                    <div class="games-played-bar-track">
                        <div class="games-played-bar-fill" style="${barStyle}"></div>
                    </div>
                </div>
                <span class="games-played-pct">${game.percentage}%</span>
            </div>
        `;
        }).join("");
        return `
            <div class="session-games-played">
                <h3 class="session-games-played-title">Games played</h3>
                ${rows}
            </div>
        `;
    }

    /**
     * Milestone insight card at the bottom of the sidebar. Reuses the Summary
     * `.milestone-card` shell (badge icon + sub-label + title + message) but
     * drops the progress bar/annotation. Icon varies by insight type.
     */
    private renderMilestoneInsight(insight: MilestoneInsight | null): string {
        if (!insight) return "";
        return `
            <div class="milestone-card session-milestone-card" id="session-milestone-card" data-insight-type="${escapeHtml(insight.type)}">
                <div class="milestone-header">
                    <div class="milestone-badge-icon">
                        <i class="fa-solid ${escapeHtml(insight.icon)}"></i>
                    </div>
                    <div class="milestone-title-group">
                        <span class="milestone-sub">Milestone Highlight</span>
                        <h3 class="milestone-title">${escapeHtml(insight.headline)}</h3>
                    </div>
                </div>
                <p class="milestone-message">${escapeHtml(insight.message)}</p>
            </div>
        `;
    }

    private statusLabel(slug: string): string {
        switch (slug) {
            case "completed": return "Finished";
            case "in-progress": return "Playing";
            case "on-hold": return "On Hold";
            case "forever": return "Forever";
            case "dropped": return "Dropped";
            default: return "Playing";
        }
    }

    // ---- interaction ---------------------------------------------------------

    mount(container: HTMLElement): void {
        this.container = container;
        container.addEventListener("click", this.onClick);
    }

    destroy(): void {
        this.container?.removeEventListener("click", this.onClick);
        this.container = null;
    }

    private onClick = (event: Event): void => {
        const target = event.target as HTMLElement;

        const tab = target.closest<HTMLElement>(".session-tab");
        if (tab) {
            const view = tab.getAttribute("data-view");
            this.navigate(view === "month"
                ? `view=month&month=${currentMonthKey()}`
                : `view=day&date=${todayDayKey()}`);
            return;
        }

        const calNav = target.closest<HTMLElement>("[data-cal-month]");
        if (calNav) {
            // Navigate the displayed calendar month while keeping the selected day.
            const month = calNav.getAttribute("data-cal-month")!;
            const selected = this.currentSelectedDay();
            // Move selection into the shown month only if the current selection is elsewhere is NOT desired;
            // keep selection, just change what the calendar shows via the date's month proxy:
            this.navigate(`view=day&date=${selected}&cal=${month}`);
            return;
        }

        const yearNav = target.closest<HTMLElement>("[data-year]");
        if (yearNav) {
            const year = yearNav.getAttribute("data-year")!;
            const month = this.currentSelectedMonth();
            const mm = month.slice(5);
            this.navigate(`view=month&month=${year}-${mm}`);
            return;
        }

        const day = target.closest<HTMLElement>(".calendar-day[data-day], .recent-day-row[data-day]");
        if (day) {
            const dayKey = day.getAttribute("data-day");
            if (dayKey) {
                event.preventDefault();
                this.navigate(`view=day&date=${dayKey}`);
            }
            return;
        }

        const month = target.closest<HTMLElement>(".month-card[data-month]");
        if (month) {
            const monthKey = month.getAttribute("data-month");
            if (monthKey) this.navigate(`view=month&month=${monthKey}`);
            return;
        }
        // Diary/month game cards are plain <a href="#game-detail?..."> — let them navigate natively.
    };

    private currentSelectedDay(): string {
        const params = new URLSearchParams(window.location.hash.split("?", 2)[1] ?? "");
        return params.get("date") || todayDayKey();
    }

    private currentSelectedMonth(): string {
        const params = new URLSearchParams(window.location.hash.split("?", 2)[1] ?? "");
        return params.get("month") || currentMonthKey();
    }

    private navigate(query: string): void {
        if (typeof window !== "undefined") {
            window.location.hash = `#session-history?${query}`;
        }
    }
}
