import {describe, expect, it} from "vitest";
import {formatPlaytime, toSortableTimestamp} from "../src/utils/TimeUtils";

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
});
