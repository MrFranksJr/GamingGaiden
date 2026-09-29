import {describe, expect, it} from "vitest";
import {
    buildMonthGrid,
    monthLabel,
    shiftMonth,
    shiftYear,
    todayDayKey,
    currentMonthKey,
    weekdayNameFull,
    weekdayNameShort
} from "../src/utils/CalendarModel";

describe("CalendarModel - weekday names", () => {
    it("maps JS getDay() indices to full weekday names (0=Sunday)", () => {
        expect(weekdayNameFull(0)).toBe("Sunday");
        expect(weekdayNameFull(1)).toBe("Monday");
        expect(weekdayNameFull(6)).toBe("Saturday");
    });

    it("maps JS getDay() indices to short weekday names", () => {
        expect(weekdayNameShort(0)).toBe("Sun");
        expect(weekdayNameShort(6)).toBe("Sat");
    });

    it("returns an empty string for an out-of-range index", () => {
        expect(weekdayNameFull(7)).toBe("");
        expect(weekdayNameShort(-1)).toBe("");
    });
});

describe("CalendarModel - month grid", () => {
    it("builds a Mon-Sun grid with leading blanks for April 2025", () => {
        // April 1, 2025 is a Tuesday -> one leading blank (Monday)
        const grid = buildMonthGrid("2025-04", new Set(["2025-04-16"]), "2025-04-16");
        // First row starts Monday; first cell is a blank placeholder
        expect(grid.weeks[0][0].inMonth).toBe(false);
        expect(grid.weeks[0][1].inMonth).toBe(true);
        expect(grid.weeks[0][1].dayKey).toBe("2025-04-01");

        // All real days present
        const realDays = grid.weeks.flat().filter((c) => c.inMonth);
        expect(realDays).toHaveLength(30);

        // has-data + selected flags
        const apr16 = realDays.find((c) => c.dayKey === "2025-04-16")!;
        expect(apr16.hasData).toBe(true);
        expect(apr16.isSelected).toBe(true);
        const apr17 = realDays.find((c) => c.dayKey === "2025-04-17")!;
        expect(apr17.hasData).toBe(false);
        expect(apr17.isSelected).toBe(false);
    });

    it("labels a month key", () => {
        expect(monthLabel("2025-04")).toBe("April 2025");
        expect(monthLabel("2025-12")).toBe("December 2025");
    });

    it("shifts months across year boundaries", () => {
        expect(shiftMonth("2025-01", -1)).toBe("2024-12");
        expect(shiftMonth("2025-12", 1)).toBe("2026-01");
        expect(shiftMonth("2025-04", 2)).toBe("2025-06");
    });

    it("shifts years", () => {
        expect(shiftYear(2025, -1)).toBe(2024);
        expect(shiftYear(2025, 1)).toBe(2026);
    });

    it("derives today and current-month keys", () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        expect(todayDayKey()).toBe(`${yyyy}-${mm}-${dd}`);
        expect(currentMonthKey()).toBe(`${yyyy}-${mm}`);
    });
});
