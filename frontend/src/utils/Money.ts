/**
 * Money parsing and formatting for stored rig cost/currency. The stored model
 * keeps cost as a string and currency as a symbol; this is the one place that
 * knows how to turn them into a positive amount and human-readable text.
 */

/** Parses a stored cost string into a positive number, or null when missing/blank/non-positive. */
export function parseAmount(value: unknown): number | null {
    if (typeof value !== "string") return null;
    const amount = Number(value.trim());
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** "€2500" for whole amounts, "€19.99" for fractional ones. */
export function formatMoney(amount: number, symbol: string): string {
    const amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    return `${symbol}${amountText}`;
}

/** "€25.00/h" from an amount and a number of hours, or null when hours <= 0. */
export function formatMoneyPerHour(amount: number, symbol: string, hours: number): string | null {
    if (hours <= 0) return null;
    return `${symbol}${(amount / hours).toFixed(2)}/h`;
}
