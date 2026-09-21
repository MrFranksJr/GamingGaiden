import {Game, Session} from "../types/GameData";
import {formatPlaytime, toSortableTimestamp} from "./TimeUtils";
import {categorizeGameStatus, formatRelativeTime, getGameInitials, GameStatusCategory} from "./SummaryStatsCalculator";

export type TimeOfDaySlot = "Morning" | "Afternoon" | "Evening" | "Night";

export interface TimeOfDayItem {
    slot: TimeOfDaySlot;
    label: string;
    hoursLabel: string;
    count: number;
    totalMinutes: number;
    percentage: number; // 0 - 100 (based on session count or minutes, count by default)
    color: string;
}

export interface DayOfWeekItem {
    dayIndex: number; // 0 = Sunday, 1 = Monday, ...
    name: string;
    shortName: string;
    count: number;
    totalMinutes: number;
    percentage: number;
}

export interface LongestSessionInfo {
    durationMinutes: number;
    durationFormatted: string;
    startTime: string | number;
    dateFormatted: string;
}

export interface TimelineSessionPoint {
    id?: number;
    startTime: string | number;
    date: Date;
    dateFormatted: string;
    timeFormatted: string;
    durationMinutes: number;
    durationFormatted: string;
    relativeHeight: number; // 0 to 1 relative to max duration
}

export interface DetailedSessionItem {
    id?: number;
    startTime: string | number;
    dateFormatted: string;
    durationMinutes: number;
    durationFormatted: string;
    relativeTime: string;
}

export interface GameDetailStats {
    game: Game;
    gameName: string;
    statusCategory: GameStatusCategory;
    statusSlug: string;
    initials: string;
    iconPath: string | null;
    steamSearchUrl: string;
    releaseDateFormatted: string;
    finishedDateFormatted: string | null;
    lastPlayedFormatted: string;

    // Core metrics
    totalPlayTimeMinutes: number;
    totalPlayTimeFormatted: string;
    totalSessions: number;
    avgSessionMinutes: number;
    avgSessionFormatted: string;
    longestSession: LongestSessionInfo | null;

    // Breakdowns
    timeOfDay: TimeOfDayItem[];
    dayOfWeek: DayOfWeekItem[];
    weekdayMinutes: number;
    weekendMinutes: number;
    weekdayPercentage: number;
    weekendPercentage: number;

    // Timeline & Sessions
    timeline: TimelineSessionPoint[];
    recentSessions: DetailedSessionItem[];
    allSessions: Session[];
}

/**
 * Parses any timestamp representation (seconds number/string, ms number/string, ISO string) into a Date object.
 */
export function parseSessionDate(startTime: string | number | null | undefined): Date | null {
    if (startTime === null || startTime === undefined) return null;
    if (typeof startTime === "number") {
        if (!Number.isFinite(startTime) || startTime <= 0) return null;
        const d = startTime < 10000000000 ? new Date(startTime * 1000) : new Date(startTime);
        return isNaN(d.getTime()) ? null : d;
    }
    const str = String(startTime).trim();
    if (!str) return null;
    const num = Number(str);
    if (Number.isFinite(num) && num > 0) {
        const d = num < 10000000000 ? new Date(num * 1000) : new Date(num);
        return isNaN(d.getTime()) ? null : d;
    }
    const parsed = Date.parse(str);
    if (Number.isFinite(parsed)) {
        const d = new Date(parsed);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/**
 * Categorizes a local Date hour into Morning (06:00-12:00), Afternoon (12:00-18:00), Evening (18:00-24:00), or Night (00:00-06:00).
 */
export function getTimeOfDaySlot(date: Date): TimeOfDaySlot {
    const hours = date.getHours();
    if (hours >= 6 && hours < 12) return "Morning";
    if (hours >= 12 && hours < 18) return "Afternoon";
    if (hours >= 18 && hours < 24) return "Evening";
    return "Night";
}

/**
 * Formats a Date into standard readable string "DD-MM-YYYY HH:mm".
 */
export function formatDateTime(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${d}-${m}-${y} ${h}:${min}`;
}

/**
 * Formats a Date into short date "DD-MM-YYYY".
 */
export function formatDateOnly(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

/**
 * Returns slug for status styling (e.g. "completed", "in-progress", "on-hold", "forever", "dropped").
 */
export function getStatusSlug(category: GameStatusCategory): string {
    switch (category) {
        case "Completed":
            return "completed";
        case "In Progress":
            return "in-progress";
        case "On Hold":
            return "on-hold";
        case "Forever":
            return "forever";
        case "Dropped":
            return "dropped";
        default:
            return "in-progress";
    }
}

const TIME_OF_DAY_CONFIG: Array<{ slot: TimeOfDaySlot; label: string; hoursLabel: string; color: string }> = [
    {slot: "Morning", label: "Morning", hoursLabel: "06:00 – 12:00", color: "#f59e0b"},    // Amber
    {slot: "Afternoon", label: "Afternoon", hoursLabel: "12:00 – 18:00", color: "#3b82f6"},  // Blue
    {slot: "Evening", label: "Evening", hoursLabel: "18:00 – 24:00", color: "#8b5cf6"},    // Purple
    {slot: "Night", label: "Night", hoursLabel: "00:00 – 06:00", color: "#06b6d4"}         // Cyan
];

const DAYS_OF_WEEK = [
    {index: 1, name: "Monday", shortName: "Mon"},
    {index: 2, name: "Tuesday", shortName: "Tue"},
    {index: 3, name: "Wednesday", shortName: "Wed"},
    {index: 4, name: "Thursday", shortName: "Thu"},
    {index: 5, name: "Friday", shortName: "Fri"},
    {index: 6, name: "Saturday", shortName: "Sat"},
    {index: 0, name: "Sunday", shortName: "Sun"}
];

/**
 * Computes all statistical aggregations and view-model metrics for a game's detail page.
 */
export function calculateGameDetailStats(
    game: Game,
    allSessions: Session[] = [],
    referenceNow?: Date
): GameDetailStats {
    const now = referenceNow || new Date();
    const gameName = game.name || "Unknown Game";
    const statusCategory = categorizeGameStatus(game);
    const statusSlug = getStatusSlug(statusCategory);
    const initials = getGameInitials(gameName);
    const iconPath = game.icon_path || null;
    const steamSearchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}`;

    // Release Date
    let releaseDateFormatted = "TBD";
    if (game.release_date) {
        const relDate = parseSessionDate(game.release_date);
        releaseDateFormatted = relDate ? formatDateOnly(relDate) : String(game.release_date);
    }

    // Finished Date
    let finishedDateFormatted: string | null = null;
    if (game.finish_date) {
        const finDate = parseSessionDate(game.finish_date);
        finishedDateFormatted = finDate ? formatDateOnly(finDate) : String(game.finish_date);
    }

    // Filter valid sessions belonging to this game
    const gameSessions = allSessions.filter(s => s && s.game_name === game.name);

    // Sort chronologically ascending for timeline
    const chronologicalSessions = [...gameSessions].sort((a, b) => {
        return toSortableTimestamp(a.start_time) - toSortableTimestamp(b.start_time);
    });

    // Total Play Time
    const rawPlayTime = Number.isFinite(game.play_time) ? Math.max(0, game.play_time) : 0;
    const sessionsPlayTime = gameSessions.reduce((sum, s) => sum + (Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0), 0);
    // Use game.play_time if available and positive, otherwise fallback to sum of sessions
    const totalPlayTimeMinutes = rawPlayTime > 0 ? rawPlayTime : sessionsPlayTime;
    const totalPlayTimeFormatted = formatPlaytime(totalPlayTimeMinutes);

    // Total Sessions
    const rawSessionCount = Number.isFinite(game.session_count) ? Math.max(0, game.session_count) : 0;
    const totalSessions = Math.max(rawSessionCount, gameSessions.length);

    // Average Session Duration
    let avgSessionMinutes = 0;
    if (gameSessions.length > 0) {
        avgSessionMinutes = Math.round(sessionsPlayTime / gameSessions.length);
    } else if (totalSessions > 0 && totalPlayTimeMinutes > 0) {
        avgSessionMinutes = Math.round(totalPlayTimeMinutes / totalSessions);
    }
    const avgSessionFormatted = formatPlaytime(avgSessionMinutes);

    // Longest Session
    let longestSession: LongestSessionInfo | null = null;
    if (gameSessions.length > 0) {
        let maxDuration = -1;
        let maxSession: Session | null = null;
        for (const s of gameSessions) {
            const dur = Number.isFinite(s.duration) ? s.duration : 0;
            if (dur > maxDuration) {
                maxDuration = dur;
                maxSession = s;
            }
        }
        if (maxSession && maxDuration >= 0) {
            const parsed = parseSessionDate(maxSession.start_time);
            longestSession = {
                durationMinutes: maxDuration,
                durationFormatted: formatPlaytime(maxDuration),
                startTime: maxSession.start_time,
                dateFormatted: parsed ? formatDateOnly(parsed) : String(maxSession.start_time)
            };
        }
    }

    // Last played
    let lastPlayedFormatted = "Never";
    if (game.last_play_date) {
        const lpDate = parseSessionDate(game.last_play_date);
        lastPlayedFormatted = lpDate ? formatDateOnly(lpDate) : String(game.last_play_date);
    } else if (chronologicalSessions.length > 0) {
        const lastSession = chronologicalSessions[chronologicalSessions.length - 1];
        const parsed = parseSessionDate(lastSession.start_time);
        lastPlayedFormatted = parsed ? formatDateOnly(parsed) : String(lastSession.start_time);
    }

    // Time of Day aggregation
    const timeOfDayCounts: Record<TimeOfDaySlot, { count: number; minutes: number }> = {
        Morning: {count: 0, minutes: 0},
        Afternoon: {count: 0, minutes: 0},
        Evening: {count: 0, minutes: 0},
        Night: {count: 0, minutes: 0}
    };

    let totalSlotSessions = 0;
    let weekdayMinutes = 0;
    let weekendMinutes = 0;

    const dayCountsMap = new Map<number, { count: number; minutes: number }>();
    DAYS_OF_WEEK.forEach(d => dayCountsMap.set(d.index, {count: 0, minutes: 0}));

    for (const s of gameSessions) {
        const date = parseSessionDate(s.start_time);
        const dur = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
        if (date) {
            const slot = getTimeOfDaySlot(date);
            timeOfDayCounts[slot].count += 1;
            timeOfDayCounts[slot].minutes += dur;
            totalSlotSessions += 1;

            const dayIdx = date.getDay(); // 0 = Sun, 6 = Sat
            const curr = dayCountsMap.get(dayIdx) || {count: 0, minutes: 0};
            curr.count += 1;
            curr.minutes += dur;
            dayCountsMap.set(dayIdx, curr);

            if (dayIdx === 0 || dayIdx === 6) {
                weekendMinutes += dur;
            } else {
                weekdayMinutes += dur;
            }
        }
    }

    const timeOfDay: TimeOfDayItem[] = TIME_OF_DAY_CONFIG.map(cfg => {
        const slotData = timeOfDayCounts[cfg.slot];
        const percentage = totalSlotSessions > 0 ? Math.round((slotData.count / totalSlotSessions) * 100) : 0;
        return {
            slot: cfg.slot,
            label: cfg.label,
            hoursLabel: cfg.hoursLabel,
            count: slotData.count,
            totalMinutes: slotData.minutes,
            percentage,
            color: cfg.color
        };
    });

    const dayOfWeek: DayOfWeekItem[] = DAYS_OF_WEEK.map(d => {
        const stats = dayCountsMap.get(d.index) || {count: 0, minutes: 0};
        const percentage = totalSlotSessions > 0 ? Math.round((stats.count / totalSlotSessions) * 100) : 0;
        return {
            dayIndex: d.index,
            name: d.name,
            shortName: d.shortName,
            count: stats.count,
            totalMinutes: stats.minutes,
            percentage
        };
    });

    const totalWeekMinutes = weekdayMinutes + weekendMinutes;
    const weekdayPercentage = totalWeekMinutes > 0 ? Math.round((weekdayMinutes / totalWeekMinutes) * 100) : 0;
    const weekendPercentage = totalWeekMinutes > 0 ? Math.round((weekendMinutes / totalWeekMinutes) * 100) : 0;

    // Timeline Points
    const maxTimelineDuration = Math.max(1, ...chronologicalSessions.map(s => Number.isFinite(s.duration) ? s.duration : 0));
    const timeline: TimelineSessionPoint[] = chronologicalSessions.map(s => {
        const parsed = parseSessionDate(s.start_time);
        const dur = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
        const validDate = parsed || new Date(0);
        return {
            id: s.id,
            startTime: s.start_time,
            date: validDate,
            dateFormatted: parsed ? formatDateOnly(parsed) : String(s.start_time),
            timeFormatted: parsed ? `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}` : "",
            durationMinutes: dur,
            durationFormatted: formatPlaytime(dur),
            relativeHeight: Math.max(0.1, dur / maxTimelineDuration) // At least 10% height for visual clarity
        };
    });

    // Recent Sessions (Descending chronological for the recent list)
    const recentSessions: DetailedSessionItem[] = [...chronologicalSessions].reverse().map(s => {
        const parsed = parseSessionDate(s.start_time);
        const dur = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
        return {
            id: s.id,
            startTime: s.start_time,
            dateFormatted: parsed ? formatDateTime(parsed) : String(s.start_time),
            durationMinutes: dur,
            durationFormatted: `${dur} Min`,
            relativeTime: formatRelativeTime(s.start_time, now)
        };
    });

    return {
        game,
        gameName,
        statusCategory,
        statusSlug,
        initials,
        iconPath,
        steamSearchUrl,
        releaseDateFormatted,
        finishedDateFormatted,
        lastPlayedFormatted,
        totalPlayTimeMinutes,
        totalPlayTimeFormatted,
        totalSessions,
        avgSessionMinutes,
        avgSessionFormatted,
        longestSession,
        timeOfDay,
        dayOfWeek,
        weekdayMinutes,
        weekendMinutes,
        weekdayPercentage,
        weekendPercentage,
        timeline,
        recentSessions,
        allSessions: chronologicalSessions
    };
}
