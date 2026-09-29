import {describe, expect, it} from "vitest";
import {
    ParsedState,
    dayNavHref,
    monthNavHref,
    parseSessionHistoryState,
    tabNavHref
} from "../src/utils/SessionHistoryNavigation";

// A4: the Session History period-navigation module. Before this, parseState and
// the click->next-URL decisions lived in the component and re-read
// window.location.hash for the "current" selection. These tests pin the pure
// contract: query string in -> ParsedState + next-URL out, no DOM.

describe("parseSessionHistoryState", () => {
    it("defaults to the day view with today's day and this month", () => {
        const state = parseSessionHistoryState("", {today: "2025-04-16", thisMonth: "2025-04"});
        expect(state.view).toBe("day");
        expect(state.date).toBe("2025-04-16");
        expect(state.month).toBe("2025-04");
        expect(state.calendarMonth).toBe("2025-04");
        expect(state.year).toBe(2025);
    });

    it("reads the month view with an explicit month", () => {
        const state = parseSessionHistoryState("view=month&month=2023-11", {today: "2025-04-16", thisMonth: "2025-04"});
        expect(state.view).toBe("month");
        expect(state.month).toBe("2023-11");
        expect(state.year).toBe(2023);
    });

    it("lets the calendar be browsed independently of the selected day via cal", () => {
        const state = parseSessionHistoryState("view=day&date=2025-04-16&cal=2025-02", {
            today: "2025-04-16",
            thisMonth: "2025-04"
        });
        expect(state.date).toBe("2025-04-16");
        expect(state.calendarMonth).toBe("2025-02");
    });

    it("derives the calendar month from the selected day when cal is absent", () => {
        const state = parseSessionHistoryState("view=day&date=2024-12-25", {today: "2025-04-16", thisMonth: "2025-04"});
        expect(state.calendarMonth).toBe("2024-12");
    });
});

describe("next-URL builders", () => {
    const state: ParsedState = {
        view: "day",
        date: "2025-04-16",
        month: "2025-04",
        calendarMonth: "2025-04",
        year: 2025
    };

    it("switches tabs to a fresh today/this-month selection", () => {
        expect(tabNavHref("month", {today: "2025-04-16", thisMonth: "2025-04"})).toBe("view=month&month=2025-04");
        expect(tabNavHref("day", {today: "2025-04-16", thisMonth: "2025-04"})).toBe("view=day&date=2025-04-16");
    });

    it("navigates the calendar month while keeping the selected day (from state, not location)", () => {
        expect(dayNavHref.calendar(state, "2025-02")).toBe("view=day&date=2025-04-16&cal=2025-02");
    });

    it("selects a day", () => {
        expect(dayNavHref.select("2025-04-20")).toBe("view=day&date=2025-04-20");
    });

    it("navigates the year while keeping the selected month's month-of-year (from state)", () => {
        expect(monthNavHref.year(state, "2023")).toBe("view=month&month=2023-04");
    });

    it("selects a month", () => {
        expect(monthNavHref.select("2022-09")).toBe("view=month&month=2022-09");
    });
});
