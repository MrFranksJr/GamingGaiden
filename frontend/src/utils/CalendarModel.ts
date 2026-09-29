/**
 * Pure helpers for the Session History calendar (By day) and year grid (By month).
 * All date math is local-time and works on "YYYY-MM"/"YYYY-MM-DD" string keys so
 * it matches the day/month keys produced by TimeUtils.
 */

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

export interface CalendarCell {
    dayKey: string;   // "" for blank padding cells
    dayNumber: number; // 0 for blank padding cells
    inMonth: boolean;
    hasData: boolean;
    isSelected: boolean;
}

export interface MonthGrid {
    monthKey: string;
    weeks: CalendarCell[][]; // rows of 7, Monday-first
}

function blankCell(): CalendarCell {
    return {dayKey: "", dayNumber: 0, inMonth: false, hasData: false, isSelected: false};
}

/** Build a Monday-first month grid for a "YYYY-MM" key. */
export function buildMonthGrid(monthKey: string, dataDays: Set<string>, selectedDayKey: string): MonthGrid {
    const [year, month] = monthKey.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // JS getDay(): 0=Sun..6=Sat. Convert to Monday-first index 0=Mon..6=Sun.
    const leading = (first.getDay() + 6) % 7;

    const cells: CalendarCell[] = [];
    for (let i = 0; i < leading; i++) cells.push(blankCell());
    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${year}-${pad2(month)}-${pad2(day)}`;
        cells.push({
            dayKey: key,
            dayNumber: day,
            inMonth: true,
            hasData: dataDays.has(key),
            isSelected: key === selectedDayKey
        });
    }
    while (cells.length % 7 !== 0) cells.push(blankCell());

    const weeks: CalendarCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return {monthKey, weeks};
}

export function monthLabel(monthKey: string): string {
    const [year, month] = monthKey.split("-").map(Number);
    return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Short month name by 1..12. */
export function monthShortName(month: number): string {
    return MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
}

export function monthNameFull(month: number): string {
    return MONTH_NAMES[month - 1] ?? "";
}

export function shiftMonth(monthKey: string, delta: number): string {
    const [year, month] = monthKey.split("-").map(Number);
    const base = new Date(year, month - 1 + delta, 1);
    return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}`;
}

export function shiftYear(year: number, delta: number): number {
    return year + delta;
}

export function todayDayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function yearOf(monthOrDayKey: string): number {
    return Number(monthOrDayKey.split("-")[0]);
}
