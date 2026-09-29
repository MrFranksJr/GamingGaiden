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
 * Parses a session start_time into a Date.
 *
 * Real data stores start_time as Unix epoch SECONDS (sometimes as a numeric
 * string). Legacy/mock data uses human date strings like "2023-01-01 10:00".
 * Numbers and all-numeric strings are treated as epoch seconds; everything
 * else is parsed as a date string.
 */
export function parseSessionStart(value: number | string): Date {
    if (typeof value === "number") {
        return new Date((Number.isFinite(value) ? value : 0) * 1000);
    }
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
        return new Date(Number(trimmed) * 1000);
    }
    const parsed = Date.parse(trimmed);
    return new Date(Number.isFinite(parsed) ? parsed : 0);
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
