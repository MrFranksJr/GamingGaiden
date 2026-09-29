import {Game, GameData, Session} from "../types/GameData";
import {
    dayKey,
    formatPlaytimeCompact,
    formatSessionTimeRange,
    monthKey,
    parseSessionStart,
    toSortableTimestamp
} from "./TimeUtils";
import {categorizeGameStatus} from "./SummaryStatsCalculator";
import {getStatusSlug} from "./GameDetailStatsCalculator";

/**
 * Per-game bar colors for the Session History sidebar. Reuses the exact
 * palette from summary/BubbleGraphComponent.ts so the two screens look
 * consistent. Assignment is INDEX-BASED (by playtime rank within the
 * selected day/month), mirroring the bubble graph — a game's color is
 * therefore not stable across different days. See docs/features/SessionHistoryPage.md.
 */
export const SESSION_COLOR_PALETTE = [
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

export interface DiaryCard {
    gameName: string;
    iconPath: string | null;
    statusSlug: string;
    timeRange: string;        // "HH:MM–HH:MM"
    durationMinutes: number;
    durationFormatted: string; // compact "2h 0m"
    detailHref: string;        // "#game-detail?name=..."
    sortKey: number;
}

export interface GamePlayedRow {
    gameName: string;
    iconPath: string | null;
    minutes: number;
    formatted: string;
    percentage: number; // rounded integer 0..100
    color: string;
    detailHref: string;
}

export interface PeriodStats {
    gamesCount: number;
    sessionCount: number;
    totalMinutes: number;
    totalFormatted: string;
    avgSessionMinutes: number;
    avgSessionFormatted: string;
}

export interface DayView {
    dayKey: string;
    isEmpty: boolean;
    sessions: DiaryCard[];      // one per session (diary mode)
    gamesPlayed: GamePlayedRow[]; // aggregated per game
    totalMinutes: number;
    stats: PeriodStats;
}

export interface MonthView {
    monthKey: string;
    isEmpty: boolean;
    gamesPlayed: GamePlayedRow[]; // aggregated per game (cards + sidebar bars share this)
    totalMinutes: number;
    stats: PeriodStats;
}

export interface RecentDay {
    dayKey: string;
    totalMinutes: number;
    totalFormatted: string;
}

function validSessions(data: GameData): Session[] {
    if (!data || !Array.isArray(data.session_history)) return [];
    return data.session_history.filter((session): session is Session => session != null);
}

function gameLookup(data: GameData): Map<string, Game> {
    const map = new Map<string, Game>();
    for (const game of data?.games ?? []) {
        if (game && typeof game.name === "string") map.set(game.name, game);
    }
    return map;
}

function statusSlugFor(games: Map<string, Game>, gameName: string): string {
    const game = games.get(gameName);
    if (!game) return "in-progress";
    return getStatusSlug(categorizeGameStatus(game));
}

function detailHref(gameName: string): string {
    return `#game-detail?name=${encodeURIComponent(gameName)}`;
}

function safeDuration(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Aggregates sessions per game, sorted by minutes desc (ties broken by name),
 * assigning an index-based palette color and a percentage of the period total.
 */
function aggregateGames(sessions: Session[], games: Map<string, Game>): GamePlayedRow[] {
    const totals = new Map<string, number>();
    for (const session of sessions) {
        const minutes = safeDuration(session.duration);
        totals.set(session.game_name, (totals.get(session.game_name) ?? 0) + minutes);
    }
    const totalMinutes = Array.from(totals.values()).reduce((sum, m) => sum + m, 0);

    return Array.from(totals.entries())
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
        .map(([gameName, minutes], index) => ({
            gameName,
            iconPath: games.get(gameName)?.icon_path ?? null,
            minutes,
            formatted: formatPlaytimeCompact(minutes),
            percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
            color: SESSION_COLOR_PALETTE[index % SESSION_COLOR_PALETTE.length],
            detailHref: detailHref(gameName)
        }));
}

function computeStats(sessions: Session[]): PeriodStats {
    const distinctGames = new Set(sessions.map(s => s.game_name));
    const sessionCount = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + safeDuration(s.duration), 0);
    const avgSessionMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;
    return {
        gamesCount: distinctGames.size,
        sessionCount,
        totalMinutes,
        totalFormatted: formatPlaytimeCompact(totalMinutes),
        avgSessionMinutes,
        avgSessionFormatted: formatPlaytimeCompact(avgSessionMinutes)
    };
}

export function buildDayView(data: GameData, selectedDayKey: string): DayView {
    const games = gameLookup(data);
    const daySessions = validSessions(data)
        .filter(session => dayKey(session.start_time) === selectedDayKey)
        .sort((a, b) => toSortableTimestamp(a.start_time) - toSortableTimestamp(b.start_time));

    const cards: DiaryCard[] = daySessions.map(session => {
        const minutes = safeDuration(session.duration);
        return {
            gameName: session.game_name,
            iconPath: games.get(session.game_name)?.icon_path ?? null,
            statusSlug: statusSlugFor(games, session.game_name),
            timeRange: formatSessionTimeRange(session.start_time, minutes),
            durationMinutes: minutes,
            durationFormatted: formatPlaytimeCompact(minutes),
            detailHref: detailHref(session.game_name),
            sortKey: parseSessionStart(session.start_time).getTime()
        };
    });

    const stats = computeStats(daySessions);
    return {
        dayKey: selectedDayKey,
        isEmpty: daySessions.length === 0,
        sessions: cards,
        gamesPlayed: aggregateGames(daySessions, games),
        totalMinutes: stats.totalMinutes,
        stats
    };
}

export function buildMonthView(data: GameData, selectedMonthKey: string): MonthView {
    const games = gameLookup(data);
    const monthSessions = validSessions(data)
        .filter(session => monthKey(session.start_time) === selectedMonthKey);

    const stats = computeStats(monthSessions);
    return {
        monthKey: selectedMonthKey,
        isEmpty: monthSessions.length === 0,
        gamesPlayed: aggregateGames(monthSessions, games),
        totalMinutes: stats.totalMinutes,
        stats
    };
}

export function daysWithData(data: GameData): Set<string> {
    const set = new Set<string>();
    for (const session of validSessions(data)) {
        if (safeDuration(session.duration) > 0) set.add(dayKey(session.start_time));
    }
    // daily_playtime is authoritative for "has data" too
    for (const entry of data?.daily_playtime ?? []) {
        if (entry && entry.play_time > 0 && typeof entry.play_date === "string") {
            set.add(entry.play_date);
        }
    }
    return set;
}

export function monthsWithData(data: GameData): Set<string> {
    const set = new Set<string>();
    for (const session of validSessions(data)) {
        if (safeDuration(session.duration) > 0) set.add(monthKey(session.start_time));
    }
    return set;
}

export function recentDaysWithData(data: GameData, limit: number): RecentDay[] {
    const totals = new Map<string, number>();
    for (const session of validSessions(data)) {
        const key = dayKey(session.start_time);
        totals.set(key, (totals.get(key) ?? 0) + safeDuration(session.duration));
    }
    return Array.from(totals.entries())
        .filter(([, minutes]) => minutes > 0)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, Math.max(0, limit))
        .map(([key, minutes]) => ({
            dayKey: key,
            totalMinutes: minutes,
            totalFormatted: formatPlaytimeCompact(minutes)
        }));
}
