export function formatPlaytime(minutes: number): string {
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours} Hr ${mins} Min`;
}

/**
 * Compact playtime for the Session History UI: "2h 5m", "45m", "0m".
 * Hours are omitted when zero; minutes are always shown.
 */
export function formatPlaytimeCompact(minutes: number): string {
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/**
 * Parses a session start_time into a Date, with one explicit epoch policy.
 *
 * Real data stores start_time as Unix epoch SECONDS (sometimes as a numeric
 * string). Legacy/mock data uses human date strings like "2023-01-01 10:00".
 * Epoch policy: a numeric value < 1e10 is treated as SECONDS (×1000), a value
 * >= 1e10 as MILLISECONDS. Non-positive or unparseable input falls back to the
 * epoch (new Date(0)) so callers never see an Invalid Date.
 */
export function parseSessionStart(value: number | string): Date {
    return parseEpoch(value) ?? new Date(0);
}

/**
 * Nullable variant of the same policy: returns null for missing/invalid input
 * instead of the epoch. Use where "no date" must be distinguishable from 1970.
 */
export function parseSessionStartOrNull(value: number | string | null | undefined): Date | null {
    if (value === null || value === undefined) return null;
    return parseEpoch(value);
}

const EPOCH_SECONDS_CEILING = 1e10;

function parseEpoch(value: number | string): Date | null {
    if (typeof value === "number") {
        return epochNumberToDate(value);
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
        return epochNumberToDate(Number(trimmed));
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function epochNumberToDate(value: number): Date | null {
    if (!Number.isFinite(value) || value <= 0) return null;
    const millis = value < EPOCH_SECONDS_CEILING ? value * 1000 : value;
    const date = new Date(millis);
    return isNaN(date.getTime()) ? null : date;
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/** Formats a Date as zero-padded local "HH:MM". */
export function formatClock(date: Date): string {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "HH:MM–HH:MM" (en dash) from a start_time and a duration in minutes. */
export function formatSessionTimeRange(startTime: number | string, durationMinutes: number): string {
    const start = parseSessionStart(startTime);
    const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0;
    const end = new Date(start.getTime() + safeDuration * 60 * 1000);
    return `${formatClock(start)}\u2013${formatClock(end)}`;
}

/** Local calendar-day key "YYYY-MM-DD" for a session start_time. */
export function dayKey(startTime: number | string): string {
    const date = parseSessionStart(startTime);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local month key "YYYY-MM" for a session start_time. */
export function monthKey(startTime: number | string): string {
    const date = parseSessionStart(startTime);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function toSortableTimestamp(value: number | string): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
    const dateValue = Date.parse(value);
    return Number.isFinite(dateValue) ? dateValue : 0;
}
