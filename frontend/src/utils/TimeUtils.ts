export function formatPlaytime(minutes: number): string {
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours} Hr ${mins} Min`;
}

export function toSortableTimestamp(value: number | string): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
    const dateValue = Date.parse(value);
    return Number.isFinite(dateValue) ? dateValue : 0;
}
