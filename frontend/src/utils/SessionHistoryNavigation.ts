import {yearOf} from "./CalendarModel";

/**
 * Pure navigation state for the Session History screen: the query string in the
 * URL hash maps to a ParsedState, and each click maps a ParsedState (plus the
 * clicked target's data) to the next query string. The component is a thin
 * adapter over this module and no longer re-reads window.location for the
 * "current" selection.
 */

export type ViewMode = "day" | "month";

export interface ParsedState {
    view: ViewMode;
    date: string; // YYYY-MM-DD (day view selection)
    month: string; // YYYY-MM (month view selection)
    calendarMonth: string; // YYYY-MM currently displayed in the calendar
    year: number; // year displayed in the month grid
}

/** "Now" anchors, injected so parsing and tab resets are testable without a clock. */
export interface NavNow {
    today: string; // YYYY-MM-DD
    thisMonth: string; // YYYY-MM
}

export function parseSessionHistoryState(query: string | null | undefined, now: NavNow): ParsedState {
    const params = new URLSearchParams(query ?? "");
    const view: ViewMode = params.get("view") === "month" ? "month" : "day";
    const date = params.get("date") || now.today;
    const month = params.get("month") || now.thisMonth;
    // The calendar can be browsed independently of the selected day via `cal`.
    const calendarMonth = params.get("cal") || date.slice(0, 7);
    const year = view === "month" ? yearOf(month) : yearOf(date);
    return {view, date, month, calendarMonth, year};
}

/** Switching tabs resets to a fresh today / this-month selection. */
export function tabNavHref(view: ViewMode, now: NavNow): string {
    return view === "month" ? `view=month&month=${now.thisMonth}` : `view=day&date=${now.today}`;
}

export const dayNavHref = {
    /** Browse the calendar to a month while keeping the selected day. */
    calendar(state: ParsedState, calendarMonth: string): string {
        return `view=day&date=${state.date}&cal=${calendarMonth}`;
    },
    /** Select a specific day. */
    select(dayKey: string): string {
        return `view=day&date=${dayKey}`;
    }
};

export const monthNavHref = {
    /** Navigate the year while keeping the selected month's month-of-year. */
    year(state: ParsedState, year: string): string {
        const monthOfYear = state.month.slice(5);
        return `view=month&month=${year}-${monthOfYear}`;
    },
    /** Select a specific month. */
    select(monthKey: string): string {
        return `view=month&month=${monthKey}`;
    }
};
