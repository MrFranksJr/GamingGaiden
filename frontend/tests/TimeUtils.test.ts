import {describe, expect, it} from "vitest";
import {
    formatPlaytime,
    formatPlaytimeCompact,
    parseSessionStart,
    formatClock,
    formatSessionTimeRange,
    dayKey,
    monthKey,
    toSortableTimestamp
} from "../src/utils/TimeUtils";

describe("time utilities", () => {
    it("formats whole, fractional, and invalid minute values safely", () => {
        expect(formatPlaytime(125)).toBe("2 Hr 5 Min");
        expect(formatPlaytime(1.9)).toBe("0 Hr 1 Min");
        expect(formatPlaytime(-10)).toBe("0 Hr 0 Min");
        expect(formatPlaytime(Number.NaN)).toBe("0 Hr 0 Min");
    });

    it("sorts Unix values, numeric strings, and legacy date strings", () => {
        expect(toSortableTimestamp(200)).toBe(200);
        expect(toSortableTimestamp("200")).toBe(200);
        expect(toSortableTimestamp("2023-01-02 10:00")).toBeGreaterThan(toSortableTimestamp("2023-01-01 10:00"));
        expect(toSortableTimestamp("not a date")).toBe(0);
    });

    it("formats compact playtime as Xh Ym", () => {
        expect(formatPlaytimeCompact(125)).toBe("2h 5m");
        expect(formatPlaytimeCompact(60)).toBe("1h 0m");
        expect(formatPlaytimeCompact(45)).toBe("45m");
        expect(formatPlaytimeCompact(0)).toBe("0m");
        expect(formatPlaytimeCompact(-10)).toBe("0m");
        expect(formatPlaytimeCompact(Number.NaN)).toBe("0m");
    });

    it("parses epoch-second numbers, numeric strings, and legacy date strings into a Date", () => {
        // 2023-01-01 10:00 local
        const legacy = parseSessionStart("2023-01-01 10:00");
        expect(legacy.getFullYear()).toBe(2023);
        expect(legacy.getMonth()).toBe(0);
        expect(legacy.getDate()).toBe(1);

        // epoch seconds should be multiplied by 1000
        const epochSeconds = 1_700_000_000; // seconds
        const asDate = parseSessionStart(epochSeconds);
        expect(asDate.getTime()).toBe(epochSeconds * 1000);

        // numeric string treated as epoch seconds
        expect(parseSessionStart("1700000000").getTime()).toBe(epochSeconds * 1000);
    });

    it("formats a clock as zero-padded HH:MM", () => {
        expect(formatClock(parseSessionStart("2023-01-01 09:05"))).toBe("09:05");
        expect(formatClock(parseSessionStart("2023-01-01 23:59"))).toBe("23:59");
    });

    it("formats a session time range from start + duration minutes", () => {
        // 10:00 for 30 minutes -> 10:00–10:30 (en dash)
        expect(formatSessionTimeRange("2023-01-01 10:00", 30)).toBe("10:00\u201310:30");
    });

    it("derives day and month keys in local time", () => {
        expect(dayKey("2023-01-02 11:00")).toBe("2023-01-02");
        expect(monthKey("2023-01-02 11:00")).toBe("2023-01");
    });
});
