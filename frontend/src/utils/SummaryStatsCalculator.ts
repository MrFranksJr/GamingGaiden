import {Game, GameData} from "../types/GameData";
import {toSortableTimestamp} from "./TimeUtils";

export interface StatDelta {
    text: string;
    type: "positive" | "negative" | "neutral";
}

export interface LifetimeStats {
    totalGames: number;
    totalPlayTimeMinutes: number;
    totalPlayTimeHours: number;
    totalPlayTimeDays: number;
    totalPlayTimeFormatted: string;
    totalSessions: number;
    avgSessionMinutes: number;
    avgSessionFormatted: string;
    gamesDelta?: StatDelta;
    playTimeDelta?: StatDelta;
    sessionsDelta?: StatDelta;
    avgSessionDelta?: StatDelta;
}

export type GameStatusCategory = "Completed" | "In Progress" | "On Hold" | "Forever" | "Dropped";

export interface StatusCount {
    category: GameStatusCategory;
    count: number;
    percentage: number;
    color: string;
}

export interface GameStatusBreakdown {
    totalGames: number;
    statuses: StatusCount[];
}

export interface GameBubble {
    name: string;
    playTimeMinutes: number;
    playTimeHours: number;
    iconPath: string | null;
    status: string;
    initials: string;
    rank: number;
    isTop10: boolean;
    radius?: number;
}

export type TopGameBubble = GameBubble;

export interface RecentSessionActivity {
    gameName: string;
    startTime: string | number;
    durationMinutes: number;
    durationFormatted: string; // e.g. "+2 h" or "+45 m"
    relativeTime: string; // e.g. "Played 2h ago", "Yesterday", "3 days ago"
    iconPath: string | null;
}

export interface MilestoneProgress {
    completedCount: number;
    totalGames: number;
    eligibleGames: number;
    foreverCount: number;
    completionPercentage: number;
    message: string;
    annotation: string;
}

export interface SummaryDashboardMetrics {
    stats: LifetimeStats;
    statusBreakdown: GameStatusBreakdown;
    topGames: TopGameBubble[];
    recentActivity: RecentSessionActivity[];
    milestone: MilestoneProgress;
}

/**
 * Categorizes a game into one of five standard statuses:
 * - Forever: status is forever
 * - Dropped: status is dropped/abandoned
 * - On Hold: status is hold/on hold/to be picked up later
 * - Completed: status is finished/completed/done or completed === "TRUE"
 * - In Progress: default state for playing/active or added games
 */
export function categorizeGameStatus(game: Game): GameStatusCategory {
    const st = game.status ? game.status.toLowerCase().trim() : "";

    if (st === "forever") {
        return "Forever";
    }

    if (st === "dropped" || st === "abandoned") {
        return "Dropped";
    }

    if (st === "hold" || st === "on hold" || st === "on_hold" || st === "to be picked up later" || st === "paused") {
        return "On Hold";
    }

    const isCompleted = game.completed === "TRUE" ||
        st === "finished" ||
        st === "completed" ||
        st === "done";

    if (isCompleted) {
        return "Completed";
    }

    return "In Progress";
}

/**
 * Extracts initials for game name fallback.
 */
export function getGameInitials(name: string): string {
    if (!name || typeof name !== "string") return "?";
    const cleaned = name.replace(/[^\w\s]/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return name.slice(0, 2).toUpperCase() || "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Formats duration for recent activity badges (e.g., "+2 h" or "+45 m" or "+2h 30m").
 */
export function formatRecentDuration(minutes: number): string {
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
    if (safeMinutes < 60) {
        return `+${safeMinutes} m`;
    }
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (mins === 0) {
        return `+${hours} h`;
    }
    return `+${hours}h ${mins}m`;
}

/**
 * Formats relative time from a timestamp compared to now.
 */
export function formatRelativeTime(startTime: string | number, referenceNow?: Date): string {
    const now = referenceNow || new Date();
    let sessionDate: Date;

    if (typeof startTime === "number") {
        // Handle Unix timestamp (in seconds or ms)
        sessionDate = startTime < 10000000000 ? new Date(startTime * 1000) : new Date(startTime);
    } else {
        const num = Number(startTime);
        if (Number.isFinite(num) && num > 0) {
            sessionDate = num < 10000000000 ? new Date(num * 1000) : new Date(num);
        } else {
            const parsed = Date.parse(startTime);
            sessionDate = Number.isFinite(parsed) ? new Date(parsed) : new Date(startTime);
        }
    }

    if (isNaN(sessionDate.getTime())) {
        return "Recently";
    }

    const diffMs = now.getTime() - sessionDate.getTime();
    if (diffMs < 0) {
        return "Just now";
    }

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) {
        return "Just now";
    }
    if (diffMin < 60) {
        return `Played ${diffMin}m ago`;
    }
    if (diffHours < 24) {
        return `Played ${diffHours}h ago`;
    }
    if (diffDays === 1) {
        return "Yesterday";
    }
    if (diffDays < 7) {
        return `Played ${diffDays} days ago`;
    }
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `Played ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }

    return sessionDate.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"});
}

/**
 * Parses a session's year from start_time.
 */
function getSessionYear(startTime: string | number): number | null {
    if (typeof startTime === "number") {
        const d = startTime < 10000000000 ? new Date(startTime * 1000) : new Date(startTime);
        return isNaN(d.getTime()) ? null : d.getFullYear();
    }
    if (typeof startTime === "string") {
        const num = Number(startTime);
        if (Number.isFinite(num) && num > 0) {
            const d = num < 10000000000 ? new Date(num * 1000) : new Date(num);
            return isNaN(d.getTime()) ? null : d.getFullYear();
        }
        const parsed = Date.parse(startTime);
        if (Number.isFinite(parsed)) {
            return new Date(parsed).getFullYear();
        }
    }
    return null;
}

/**
 * Pure calculation engine for summary dashboard metrics.
 */
export class SummaryStatsCalculator {
    public static compute(data: GameData | null | undefined, referenceNow?: Date): SummaryDashboardMetrics {
        const validGames = Array.isArray(data?.games) ? data.games.filter(g => g && typeof g.name === "string") : [];
        const sessions = Array.isArray(data?.session_history) ? data.session_history.filter(s => s && typeof s.game_name === "string") : [];
        const now = referenceNow || new Date();

        // 1. Lifetime Calculations
        const totalGames = validGames.length;
        const totalPlayTimeMinutes = validGames.reduce((acc, g) => acc + (Number.isFinite(g.play_time) ? Math.max(0, g.play_time) : 0), 0);
        const totalPlayTimeHours = Math.round((totalPlayTimeMinutes / 60) * 10) / 10;
        const totalPlayTimeDays = Math.round((totalPlayTimeMinutes / 1440) * 10) / 10;

        const hoursInt = Math.floor(totalPlayTimeMinutes / 60);
        const minsInt = Math.floor(totalPlayTimeMinutes % 60);
        const totalPlayTimeFormatted = `${hoursInt.toLocaleString()}h ${minsInt}m`;

        const totalSessions = sessions.length > 0
            ? sessions.length
            : validGames.reduce((acc, g) => acc + (Number.isFinite(g.session_count) ? Math.max(0, g.session_count) : 0), 0);

        const avgSessionMinutes = totalSessions > 0 ? Math.round(totalPlayTimeMinutes / totalSessions) : 0;
        const avgHours = Math.floor(avgSessionMinutes / 60);
        const avgMins = avgSessionMinutes % 60;
        const avgSessionFormatted = avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`;

        // 2. Year-over-Year / Current Year Delta Calculations
        // Identify latest year from data or current calendar year
        let maxSessionYear = 0;
        sessions.forEach(s => {
            const y = getSessionYear(s.start_time);
            if (y && y > maxSessionYear) maxSessionYear = y;
        });

        const targetYear = maxSessionYear > 0 ? maxSessionYear : now.getFullYear();
        const prevYear = targetYear - 1;

        const thisYearSessions = sessions.filter(s => getSessionYear(s.start_time) === targetYear);
        const prevYearSessions = sessions.filter(s => getSessionYear(s.start_time) === prevYear);

        let gamesDelta: StatDelta | undefined;
        let playTimeDelta: StatDelta | undefined;
        let sessionsDelta: StatDelta | undefined;
        let avgSessionDelta: StatDelta | undefined;

        if (thisYearSessions.length > 0) {
            const thisYearGames = new Set(thisYearSessions.map(s => s.game_name)).size;
            const thisYearPlayTime = thisYearSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
            const thisYearAvg = thisYearSessions.length > 0 ? thisYearPlayTime / thisYearSessions.length : 0;

            if (prevYearSessions.length > 0) {
                const prevYearGames = new Set(prevYearSessions.map(s => s.game_name)).size;
                const prevYearPlayTime = prevYearSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
                const prevYearAvg = prevYearSessions.length > 0 ? prevYearPlayTime / prevYearSessions.length : 0;

                const gDiff = thisYearGames - prevYearGames;
                gamesDelta = {
                    text: `${gDiff >= 0 ? "+" : ""}${gDiff} vs last year`,
                    type: gDiff >= 0 ? "positive" : "negative"
                };

                const ptDiffHours = Math.round(((thisYearPlayTime - prevYearPlayTime) / 60) * 10) / 10;
                playTimeDelta = {
                    text: `${ptDiffHours >= 0 ? "+" : ""}${ptDiffHours}h vs last year`,
                    type: ptDiffHours >= 0 ? "positive" : "negative"
                };

                const sDiff = thisYearSessions.length - prevYearSessions.length;
                sessionsDelta = {
                    text: `${sDiff >= 0 ? "+" : ""}${sDiff} vs last year`,
                    type: sDiff >= 0 ? "positive" : "negative"
                };

                const avgDiffMin = Math.round(thisYearAvg - prevYearAvg);
                avgSessionDelta = {
                    text: `${avgDiffMin >= 0 ? "+" : ""}${avgDiffMin}m vs last year`,
                    type: avgDiffMin >= 0 ? "positive" : "negative"
                };
            } else {
                gamesDelta = {text: `+${thisYearGames} this year`, type: "positive"};
                const ptHours = Math.round((thisYearPlayTime / 60) * 10) / 10;
                playTimeDelta = {text: `+${ptHours}h this year`, type: "positive"};
                sessionsDelta = {text: `+${thisYearSessions.length} this year`, type: "positive"};
                const thisAvgHours = Math.round((thisYearAvg / 60) * 10) / 10;
                avgSessionDelta = {text: `${thisAvgHours}h avg this year`, type: "neutral"};
            }
        }

        // 3. Status Breakdown
        const statusMap: Record<GameStatusCategory, number> = {
            "Completed": 0,
            "In Progress": 0,
            "On Hold": 0,
            "Forever": 0,
            "Dropped": 0
        };

        validGames.forEach(g => {
            const cat = categorizeGameStatus(g);
            statusMap[cat] = (statusMap[cat] || 0) + 1;
        });

        const colorMap: Record<GameStatusCategory, string> = {
            "Completed": "#10b981",    // Emerald / Green
            "In Progress": "#6366f1",  // Indigo / Purple
            "On Hold": "#f59e0b",      // Amber / Orange
            "Forever": "#a855f7",      // Purple / Violet
            "Dropped": "#ef4444"       // Rose / Red
        };

        const statuses: StatusCount[] = (["Completed", "In Progress", "On Hold", "Forever", "Dropped"] as const).map(category => {
            const count = statusMap[category] || 0;
            const percentage = totalGames > 0 ? Math.round((count / totalGames) * 100) : 0;
            return {
                category,
                count,
                percentage,
                color: colorMap[category]
            };
        });

        // 4. Game Bubbles (All library games, sorted descending by playtime)
        const gameIconMap = new Map<string, string | null>();
        validGames.forEach(g => {
            gameIconMap.set(g.name, g.icon_path || null);
        });

        const sortedGames = [...validGames].sort((a, b) => (b.play_time || 0) - (a.play_time || 0));
        const topGames: GameBubble[] = sortedGames.map((g, index) => {
            const pt = Number.isFinite(g.play_time) ? Math.max(0, g.play_time) : 0;
            const rank = index + 1;
            return {
                name: g.name,
                playTimeMinutes: pt,
                playTimeHours: Math.round((pt / 60) * 10) / 10,
                iconPath: g.icon_path || null,
                status: categorizeGameStatus(g),
                initials: getGameInitials(g.name),
                rank,
                isTop10: rank <= 10
            };
        });

        // 5. Recent Activity (Latest 5 Sessions)
        const sortedSessions = [...sessions].sort((a, b) => {
            return toSortableTimestamp(b.start_time) - toSortableTimestamp(a.start_time);
        });

        const recent5 = sortedSessions.slice(0, 5);
        const recentActivity: RecentSessionActivity[] = recent5.map(s => ({
            gameName: s.game_name,
            startTime: s.start_time,
            durationMinutes: s.duration || 0,
            durationFormatted: formatRecentDuration(s.duration || 0),
            relativeTime: formatRelativeTime(s.start_time, now),
            iconPath: gameIconMap.get(s.game_name) || null
        }));

        // 6. Milestone Progress (Excludes 'Forever' games)
        const foreverCount = statusMap["Forever"] || 0;
        const eligibleGames = totalGames - foreverCount;
        const completedCount = statusMap["Completed"] || 0;
        const completionPercentage = eligibleGames > 0 ? Math.round((completedCount / eligibleGames) * 100) : 0;
        const message = eligibleGames === 0
            ? (totalGames > 0 ? "All games in your library are forever games." : "Your library is empty. Add games to track milestones!")
            : `You've completed ${completedCount} ${completedCount === 1 ? "game" : "games"} so far! That's ${completionPercentage}% of your library. Keep going!`;

        const annotation = foreverCount > 0
            ? `*Excludes ${foreverCount} forever ${foreverCount === 1 ? "game" : "games"}`
            : "*Excludes forever games";

        return {
            stats: {
                totalGames,
                totalPlayTimeMinutes,
                totalPlayTimeHours,
                totalPlayTimeDays,
                totalPlayTimeFormatted,
                totalSessions,
                avgSessionMinutes,
                avgSessionFormatted,
                gamesDelta,
                playTimeDelta,
                sessionsDelta,
                avgSessionDelta
            },
            statusBreakdown: {
                totalGames,
                statuses
            },
            topGames,
            recentActivity,
            milestone: {
                completedCount,
                totalGames,
                eligibleGames,
                foreverCount,
                completionPercentage,
                message,
                annotation
            }
        };
    }
}
