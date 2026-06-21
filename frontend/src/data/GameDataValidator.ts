import {DailyPlaytime, Game, GameData, GamingPC, Session} from "../types/GameData";

export class GameDataValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GameDataValidationError";
    }
}

export interface ValidatedGameData {
    data: GameData;
    warnings: string[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredArray(source: UnknownRecord, key: string): unknown[] {
    const value = source[key];
    if (!Array.isArray(value)) {
        throw new GameDataValidationError(`Data field "${key}" must be an array.`);
    }
    return value;
}

function nonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeNumber(value: unknown): value is number {
    return finiteNumber(value) && value >= 0;
}

function optionalString(value: unknown): string | null | undefined {
    return typeof value === "string" || value === null ? value : undefined;
}

function optionalDateValue(value: unknown): number | string | null | undefined {
    return finiteNumber(value) || typeof value === "string" || value === null ? value : undefined;
}

function parseGame(value: unknown): Game | null {
    if (!isRecord(value) || !nonEmptyString(value.name)) return null;
    return {
        name: value.name,
        play_time: nonNegativeNumber(value.play_time) ? value.play_time : 0,
        session_count: nonNegativeNumber(value.session_count) ? value.session_count : 0,
        status: typeof value.status === "string" ? value.status : "",
        completed: typeof value.completed === "string" ? value.completed : "FALSE",
        exe_name: optionalString(value.exe_name),
        last_play_date: optionalDateValue(value.last_play_date),
        icon_path: optionalString(value.icon_path),
        gaming_pc_name: optionalString(value.gaming_pc_name),
        release_date: optionalString(value.release_date)
    };
}

function parseSession(value: unknown): Session | null {
    if (!isRecord(value) || !nonEmptyString(value.game_name) ||
        !(finiteNumber(value.start_time) || typeof value.start_time === "string") ||
        !nonNegativeNumber(value.duration)) return null;
    return {game_name: value.game_name, start_time: value.start_time, duration: value.duration};
}

function parseDailyPlaytime(value: unknown): DailyPlaytime | null {
    if (!isRecord(value) || !nonEmptyString(value.play_date) || !nonNegativeNumber(value.play_time)) return null;
    return {play_date: value.play_date, play_time: value.play_time};
}

function parseGamingPC(value: unknown): GamingPC | null {
    if (!isRecord(value) || !nonEmptyString(value.name)) return null;
    return {
        name: value.name,
        in_use: typeof value.in_use === "string" ? value.in_use : "FALSE",
        icon_path: optionalString(value.icon_path),
        cost: optionalString(value.cost),
        currency: optionalString(value.currency),
        start_date: optionalDateValue(value.start_date),
        end_date: optionalDateValue(value.end_date),
        total_play_time: nonNegativeNumber(value.total_play_time) ? value.total_play_time : 0
    };
}

function parseEntries<T>(values: unknown[], collectionName: string, parser: (value: unknown) => T | null,
                         warnings: string[]): T[] {
    const parsed = values.map(parser).filter((value): value is T => value !== null);
    const rejectedCount = values.length - parsed.length;
    if (rejectedCount > 0) warnings.push(`${collectionName}: ignored ${rejectedCount} invalid entr${rejectedCount === 1 ? "y" : "ies"}.`);
    return parsed;
}

export function validateGameData(value: unknown): ValidatedGameData {
    if (!isRecord(value)) throw new GameDataValidationError("Exported data must be an object.");

    const schemaVersion = value.schema_version ?? 1;
    if (schemaVersion !== 1) {
        throw new GameDataValidationError(`Unsupported data schema version: ${String(schemaVersion)}.`);
    }

    const warnings: string[] = [];
    const data: GameData = {
        schema_version: 1,
        games: parseEntries(requiredArray(value, "games"), "games", parseGame, warnings),
        session_history: parseEntries(requiredArray(value, "session_history"), "session_history", parseSession, warnings),
        daily_playtime: parseEntries(requiredArray(value, "daily_playtime"), "daily_playtime", parseDailyPlaytime, warnings),
        gaming_pcs: parseEntries(requiredArray(value, "gaming_pcs"), "gaming_pcs", parseGamingPC, warnings),
        export_date: typeof value.export_date === "string" ? value.export_date : undefined,
        hash: typeof value.hash === "string" ? value.hash : undefined
    };

    return {data, warnings};
}
