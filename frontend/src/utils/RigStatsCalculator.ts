import {GamingPC, GameData, Game} from "../types/GameData";
import {monthShortName} from "./CalendarModel";
import {GamePlayedRow, rankGamesPlayed} from "./GamesPlayedRanking";

export interface RigSummary {
    name: string;
    isInUse: boolean;
    iconPath: string | null;
}

export interface RigCost {
    recorded: boolean; // true when a positive cost was recorded
    formatted: string; // "€2500" when recorded, "Not recorded" otherwise
    perHourFormatted: string | null; // "€2.50/h" when cost>0 and hours>0, else null
}

export interface RigLifespan {
    isOngoing: boolean; // true for an in-use rig (live age), false for a fixed span
    label: string; // "In use for 3 years" | "Jan 2021 – Mar 2024" | "" when unknown
}

/**
 * One game in the "Games on this rig" ranked list. Same shape as a Session
 * History games-played row — both come from the shared ranking module.
 */
export type RigGameRow = GamePlayedRow;

export interface RigDetail {
    name: string;
    isInUse: boolean;
    iconPath: string | null;
    totalPlayTimeMinutes: number;
    gamesPlayed: number;
    sessionCount: number;
    cost: RigCost;
    lifespan: RigLifespan;
    games: RigGameRow[];
}

function validRigs(data: GameData): GamingPC[] {
    if (!data || !Array.isArray(data.gaming_pcs)) return [];
    return data.gaming_pcs.filter((rig): rig is GamingPC => rig != null && typeof rig.name === "string");
}

function isInUse(rig: GamingPC): boolean {
    return rig.in_use === "TRUE";
}

function endDateValue(rig: GamingPC): number {
    const value = rig.end_date;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

/** Epoch seconds → Date, or null when missing/zero/unparseable. */
function epochToDate(value: number | string | null | undefined): Date | null {
    const seconds = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(seconds * 1000);
}

function spanLabel(date: Date): string {
    return `${monthShortName(date.getMonth() + 1)} ${date.getFullYear()}`;
}

function pluralize(count: number, unit: string): string {
    return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** "3 years, 2 months", trimming zero components; "" when both zero. */
function ongoingAgeLabel(start: Date, now: Date): string {
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    months = Math.max(0, months);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    const parts: string[] = [];
    if (years > 0) parts.push(pluralize(years, "year"));
    if (remMonths > 0) parts.push(pluralize(remMonths, "month"));
    if (parts.length === 0) return "";
    return parts.join(", ");
}

function buildLifespan(rig: GamingPC, now: Date): RigLifespan {
    const start = epochToDate(rig.start_date);
    if (isInUse(rig)) {
        return {isOngoing: true, label: start ? ongoingAgeLabel(start, now) : ""};
    }
    const end = epochToDate(rig.end_date);
    if (start && end) {
        return {isOngoing: false, label: `${spanLabel(start)} \u2013 ${spanLabel(end)}`};
    }
    if (start) {
        return {isOngoing: false, label: `Since ${spanLabel(start)}`};
    }
    return {isOngoing: false, label: ""};
}

/** The rig names a game is tagged to, from its comma-joined gaming_pc_name. */
function rigNamesFor(game: Game): string[] {
    if (typeof game.gaming_pc_name !== "string") return [];
    return game.gaming_pc_name
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
}

/** Games tagged to the named rig (via comma-split gaming_pc_name). */
function gamesOnRig(data: GameData, rigName: string): Game[] {
    const games = Array.isArray(data?.games) ? data.games : [];
    return games.filter((game): game is Game => game != null && rigNamesFor(game).includes(rigName));
}

function safeCount(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Ranked "Games on this rig" rows: games tagged to the rig, ranked by stored
 * per-game play_time via the shared games-played module. Share is of the summed
 * game playtime, not the rig's stored total_play_time (those can diverge; see
 * docs/features/MyRigsPage.md).
 */
function buildRigGames(games: Game[]): RigGameRow[] {
    return rankGamesPlayed(
        games.map((game) => ({
            gameName: game.name,
            minutes: safeCount(game.play_time),
            iconPath: typeof game.icon_path === "string" ? game.icon_path : null
        }))
    );
}

/** Parses the string cost into a number, or null when missing/blank/non-positive. */
function parseCost(value: unknown): number | null {
    if (typeof value !== "string") return null;
    const amount = Number(value.trim());
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function buildCost(rig: GamingPC, totalMinutes: number): RigCost {
    const symbol = typeof rig.currency === "string" ? rig.currency.trim() : "";
    const amount = parseCost(rig.cost);
    if (amount === null) {
        return {recorded: false, formatted: "Not recorded", perHourFormatted: null};
    }
    // Trim trailing ".00" for whole amounts so "€2500" reads cleanly.
    const amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    const formatted = `${symbol}${amountText}`;

    const hours = totalMinutes / 60;
    const perHourFormatted = hours > 0 ? `${symbol}${(amount / hours).toFixed(2)}/h` : null;

    return {recorded: true, formatted, perHourFormatted};
}

/**
 * Rigs in default display order: in-use first, then retired rigs by most
 * recent end_date. Mirrors the legacy backend ordering
 * (ORDER BY in_use DESC, end_date DESC) so the frontend and backend agree.
 */
export function buildRigList(data: GameData): RigSummary[] {
    return validRigs(data)
        .slice()
        .sort((a, b) => {
            const useDiff = Number(isInUse(b)) - Number(isInUse(a));
            if (useDiff !== 0) return useDiff;
            return endDateValue(b) - endDateValue(a);
        })
        .map((rig) => ({
            name: rig.name,
            isInUse: isInUse(rig),
            iconPath: typeof rig.icon_path === "string" ? rig.icon_path : null
        }));
}

export function buildRigDetail(data: GameData, rigName: string, now: Date = new Date()): RigDetail | null {
    const rig = validRigs(data).find((r) => r.name === rigName);
    if (!rig) return null;

    const games = gamesOnRig(data, rigName);
    const sessionCount = games.reduce((sum, game) => sum + safeCount(game.session_count), 0);
    const totalPlayTimeMinutes = safeCount(rig.total_play_time);

    return {
        name: rig.name,
        isInUse: isInUse(rig),
        iconPath: typeof rig.icon_path === "string" ? rig.icon_path : null,
        totalPlayTimeMinutes,
        gamesPlayed: games.length,
        sessionCount,
        cost: buildCost(rig, totalPlayTimeMinutes),
        lifespan: buildLifespan(rig, now),
        games: buildRigGames(games)
    };
}
