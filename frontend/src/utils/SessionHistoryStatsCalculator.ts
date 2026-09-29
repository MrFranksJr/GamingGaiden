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
import {monthNameFull, weekdayNameFull, yearOf} from "./CalendarModel";
import {GAMES_PLAYED_PALETTE, GamePlayedRow, rankGamesPlayed} from "./GamesPlayedRanking";

/**
 * Per-game bar colours for the Session History sidebar. Re-exported from the
 * shared games-played ranking module so both this screen and My Rigs draw from
 * one palette. Assignment is INDEX-BASED by playtime rank within the selected
 * day/month, so a game's colour is not stable across periods.
 * See docs/features/SessionHistoryPage.md.
 */
export const SESSION_COLOR_PALETTE = GAMES_PLAYED_PALETTE;

export type {GamePlayedRow};

export interface DiaryCard {
    gameName: string;
    iconPath: string | null;
    statusSlug: string;
    timeRange: string; // "HH:MM–HH:MM"
    durationMinutes: number;
    durationFormatted: string; // compact "2h 0m"
    detailHref: string; // "#game-detail?name=..."
    sortKey: number;
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
    sessions: DiaryCard[]; // one per session (diary mode)
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
    return rankGamesPlayed(
        Array.from(totals.entries()).map(([gameName, minutes]) => ({
            gameName,
            minutes,
            iconPath: games.get(gameName)?.icon_path ?? null
        }))
    );
}

function computeStats(sessions: Session[]): PeriodStats {
    const distinctGames = new Set(sessions.map((s) => s.game_name));
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
        .filter((session) => dayKey(session.start_time) === selectedDayKey)
        .sort((a, b) => toSortableTimestamp(a.start_time) - toSortableTimestamp(b.start_time));

    const cards: DiaryCard[] = daySessions.map((session) => {
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
    const monthSessions = validSessions(data).filter((session) => monthKey(session.start_time) === selectedMonthKey);

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

// ---- Period insight (hybrid: milestone + "Did you know?") -------------------
//
// A single line for the bottom of a period (day or month) sidebar. It is a
// HYBRID: a genuine milestone (all-time record, or a top rank) when truly
// earned, otherwise an always-true, non-superlative "Did you know?" factoid,
// with a neutral fallback. Ranks/averages use ACTIVE periods only (days/months
// with play data). See CONTEXT.md ("Period insight") and
// docs/features/SessionHistoryPage.md.
//
// History: the first version let a rank fire for ANY non-record period, so a
// below-average day at rank #104/134 still showed "Among the year's best!".
// The rank tier is now capped (see thresholds below). Factoids were also
// seeded per period, which made them feel static (same message on every
// refresh); they are now picked at RANDOM per render, while the milestone
// tier stays deterministic so a genuine record/rank never flickers away.

export type InsightType = "record" | "rank" | "factoid" | "neutral";

export interface MilestoneInsight {
    type: InsightType;
    icon: string; // Font Awesome class, e.g. "fa-trophy"
    headline: string; // short bold line
    message: string; // sentence with the emphasized values
}

/** A day rank is a milestone only if it is within the top N AND the top percentile. */
export const RANK_TOP_N_DAY = 3;
export const RANK_TOP_PCT_DAY = 0.1;
/** A month rank is a milestone only at #1 (top-3-of-~12 is not brag-worthy). */
export const RANK_TOP_N_MONTH = 1;
/** "Did you know?" ratio factoid bands, relative to the active average. */
export const RATIO_ABOVE = 1.2;
export const RATIO_BELOW = 0.8;
/** Minimum distinct games for the variety factoid. */
export const VARIETY_MIN_GAMES = 2;

const ICON_BY_TYPE: Record<InsightType, string> = {
    record: "fa-trophy",
    rank: "fa-trophy",
    factoid: "fa-circle-info",
    neutral: "fa-gamepad"
};

interface Candidate {
    tier: number; // lower = higher priority (0 = milestone, 1 = factoid, 2 = neutral)
    type: InsightType;
    headline: string;
    message: string;
}

interface PeriodTotals {
    values: number[];
    activeCount: number;
    selectedMinutes: number;
    maxMinutes: number;
    average: number;
    rank: number; // 1 = biggest; ties share the better rank
}

/** Totals per active period (only entries with minutes > 0), keyed by period key. */
function activePeriodTotals(sessions: Session[], keyOf: (s: Session) => string, selectedKey: string): PeriodTotals {
    const totals = new Map<string, number>();
    for (const session of sessions) {
        const minutes = safeDuration(session.duration);
        if (minutes <= 0) continue;
        const key = keyOf(session);
        totals.set(key, (totals.get(key) ?? 0) + minutes);
    }
    const values = Array.from(totals.values());
    const selectedMinutes = totals.get(selectedKey) ?? 0;
    const activeCount = totals.size;
    const maxMinutes = values.reduce((max, v) => Math.max(max, v), 0);
    const sumMinutes = values.reduce((sum, v) => sum + v, 0);
    const average = activeCount > 0 ? sumMinutes / activeCount : 0;
    const rank = 1 + values.filter((v) => v > selectedMinutes).length;
    return {values, activeCount, selectedMinutes, maxMinutes, average, rank};
}

function ratioText(ratio: number): string {
    return (Math.round(ratio * 10) / 10).toFixed(1);
}

/**
 * Selects the insight from the highest (lowest-numbered) non-empty tier.
 * The milestone tier (0) and the neutral fallback (2) never hold more than one
 * candidate, so they are effectively deterministic and always win when present.
 * The "Did you know?" factoid tier (1) holds several equally-true candidates, so
 * we pick one at RANDOM on every call — the factoid changes on each refresh,
 * while a genuine milestone stays stable.
 */
function selectInsight(candidates: Candidate[], pick: InsightPicker = randomPick): Candidate {
    const bestTier = candidates.reduce((min, c) => Math.min(min, c.tier), Number.POSITIVE_INFINITY);
    const inTier = candidates.filter((c) => c.tier === bestTier);
    return pick(inTier);
}

/**
 * Chooses one candidate from the best-tier list. Injectable so tests can render
 * a deterministic insight; production uses {@link randomPick} so the "Did you
 * know?" factoid varies on each refresh.
 */
export type InsightPicker = (candidates: Candidate[]) => Candidate;

const randomPick: InsightPicker = (candidates) => candidates[Math.floor(Math.random() * candidates.length)];

/** Deterministic picker (always the first best-tier candidate) for tests/seams. */
export const firstInsightPick: InsightPicker = (candidates) => candidates[0];

/** Per-period per-game aggregate used for the "most-played game" / variety factoids. */
function periodGames(data: GameData, keyOf: (s: Session) => string, selectedKey: string): GamePlayedRow[] {
    const games = gameLookup(data);
    const periodSessions = validSessions(data).filter((session) => keyOf(session) === selectedKey);
    return aggregateGames(periodSessions, games);
}

function finish(chosen: Candidate): MilestoneInsight {
    return {type: chosen.type, icon: ICON_BY_TYPE[chosen.type], headline: chosen.headline, message: chosen.message};
}

export function buildDayInsight(
    data: GameData,
    selectedDayKey: string,
    pick: InsightPicker = randomPick
): MilestoneInsight | null {
    const t = activePeriodTotals(validSessions(data), (s) => dayKey(s.start_time), selectedDayKey);
    if (t.selectedMinutes <= 0) return null; // empty period -> no card

    const total = formatPlaytimeCompact(t.selectedMinutes);
    const games = periodGames(data, (s) => dayKey(s.start_time), selectedDayKey);
    const candidates: Candidate[] = [];

    // --- Tier 0: milestone ---
    if (t.selectedMinutes === t.maxMinutes && t.activeCount >= 2) {
        candidates.push({
            tier: 0,
            type: "record",
            headline: "A personal best!",
            message: `${total} in a single day — your biggest gaming day on record.`
        });
    } else {
        const topPct = t.activeCount > 0 ? t.rank / t.activeCount : 1;
        if (t.rank <= RANK_TOP_N_DAY && topPct <= RANK_TOP_PCT_DAY) {
            candidates.push({
                tier: 0,
                type: "rank",
                headline: "Among the year's best!",
                message: `The #${t.rank} biggest gaming day of ${yearOf(selectedDayKey)} — ${total} of play.`
            });
        }
    }

    // --- Tier 1: "Did you know?" factoids (always true) ---
    if (t.average > 0) {
        const ratio = t.selectedMinutes / t.average;
        if (ratio >= RATIO_ABOVE) {
            candidates.push({
                tier: 1,
                type: "factoid",
                headline: "Did you know?",
                message: `You played ${ratioText(ratio)}× more than a typical gaming day.`
            });
        } else if (ratio <= RATIO_BELOW) {
            candidates.push({
                tier: 1,
                type: "factoid",
                headline: "Did you know?",
                message: `A lighter session — about ${ratioText(ratio)}× a typical gaming day.`
            });
        }
    }
    if (games.length > 0) {
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `Your most-played game this day was ${games[0].gameName} (${games[0].formatted}).`
        });
    }
    if (games.length >= VARIETY_MIN_GAMES) {
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `You played ${games.length} different games on this day.`
        });
    }
    const [wy, wm, wd] = selectedDayKey.split("-").map(Number);
    if (wy && wm && wd) {
        const weekday = weekdayNameFull(new Date(wy, wm - 1, wd).getDay());
        const sameWeekday = Array.from(daysWithData(data)).filter((k) => {
            const [y, m, d] = k.split("-").map(Number);
            return y && m && d && weekdayNameFull(new Date(y, m - 1, d).getDay()) === weekday;
        }).length;
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `This was a ${weekday} — ${sameWeekday} of your gaming days fall on a ${weekday}.`
        });
    }
    const totalActiveDays = t.activeCount;
    candidates.push({
        tier: 1,
        type: "factoid",
        headline: "Did you know?",
        message: `This is one of ${totalActiveDays} days you've logged some gaming.`
    });

    // --- Tier 2: neutral fallback ---
    candidates.push({
        tier: 2,
        type: "neutral",
        headline: "A solid day of gaming!",
        message: `You played ${total} on this day.`
    });

    return finish(selectInsight(candidates, pick));
}

export function buildMonthInsight(
    data: GameData,
    selectedMonthKey: string,
    pick: InsightPicker = randomPick
): MilestoneInsight | null {
    const t = activePeriodTotals(validSessions(data), (s) => monthKey(s.start_time), selectedMonthKey);
    if (t.selectedMinutes <= 0) return null; // empty period -> no card

    const [, m] = selectedMonthKey.split("-").map(Number);
    const monthName = monthNameFull(m);
    const total = formatPlaytimeCompact(t.selectedMinutes);
    const games = periodGames(data, (s) => monthKey(s.start_time), selectedMonthKey);
    const candidates: Candidate[] = [];

    // --- Tier 0: milestone ---
    if (t.selectedMinutes === t.maxMinutes && t.activeCount >= 2) {
        candidates.push({
            tier: 0,
            type: "record",
            headline: "A record month!",
            message: `${total} in ${monthName} — your biggest gaming month ever.`
        });
    } else if (t.rank <= RANK_TOP_N_MONTH) {
        candidates.push({
            tier: 0,
            type: "rank",
            headline: "Month of the year!",
            message: `You clocked more hours in ${monthName} than any other month of ${yearOf(selectedMonthKey)}.`
        });
    }

    // --- Tier 1: "Did you know?" factoids ---
    if (t.average > 0) {
        const ratio = t.selectedMinutes / t.average;
        if (ratio >= RATIO_ABOVE) {
            candidates.push({
                tier: 1,
                type: "factoid",
                headline: "Did you know?",
                message: `You played ${ratioText(ratio)}× more than a typical month.`
            });
        } else if (ratio <= RATIO_BELOW) {
            candidates.push({
                tier: 1,
                type: "factoid",
                headline: "Did you know?",
                message: `A quieter month — about ${ratioText(ratio)}× a typical month.`
            });
        }
    }
    if (games.length > 0) {
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `${games[0].gameName} was your most-played game in ${monthName} (${games[0].formatted}).`
        });
    }
    if (games.length >= VARIETY_MIN_GAMES) {
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `You played ${games.length} different games in ${monthName}.`
        });
    }
    const activeDaysInMonth = new Set(
        validSessions(data)
            .filter((s) => monthKey(s.start_time) === selectedMonthKey && safeDuration(s.duration) > 0)
            .map((s) => dayKey(s.start_time))
    ).size;
    if (activeDaysInMonth > 0) {
        candidates.push({
            tier: 1,
            type: "factoid",
            headline: "Did you know?",
            message: `You gamed on ${activeDaysInMonth} different days in ${monthName}.`
        });
    }
    candidates.push({
        tier: 1,
        type: "factoid",
        headline: "Did you know?",
        message: `One of ${t.activeCount} months you've logged some gaming.`
    });

    // --- Tier 2: neutral fallback ---
    candidates.push({
        tier: 2,
        type: "neutral",
        headline: "A solid month of gaming!",
        message: `You played ${total} in ${monthName}.`
    });

    return finish(selectInsight(candidates, pick));
}
