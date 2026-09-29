import {describe, expect, it} from "vitest";
import {formatMoney, formatMoneyPerHour, parseAmount} from "../src/utils/Money";

// CC2: money parsing/formatting for rig cost lived inline in RigStatsCalculator.
// These pin the value-object contract now that it has one named home.

describe("parseAmount", () => {
    it("parses a positive numeric string", () => {
        expect(parseAmount("2500")).toBe(2500);
        expect(parseAmount(" 19.99 ")).toBe(19.99);
    });

    it("returns null for missing, blank, non-numeric, zero, or negative input", () => {
        expect(parseAmount(null)).toBeNull();
        expect(parseAmount("")).toBeNull();
        expect(parseAmount("   ")).toBeNull();
        expect(parseAmount("free")).toBeNull();
        expect(parseAmount("0")).toBeNull();
        expect(parseAmount("-5")).toBeNull();
        expect(parseAmount(2500)).toBeNull(); // only strings are accepted from stored data
    });
});

describe("formatMoney", () => {
    it("drops trailing .00 for whole amounts so it reads cleanly", () => {
        expect(formatMoney(2500, "€")).toBe("€2500");
    });

    it("keeps two decimals for fractional amounts", () => {
        expect(formatMoney(19.99, "€")).toBe("€19.99");
        expect(formatMoney(19.5, "€")).toBe("€19.50");
    });

    it("works with an empty currency symbol", () => {
        expect(formatMoney(2500, "")).toBe("2500");
    });
});

describe("formatMoneyPerHour", () => {
    it("divides the amount over hours and appends /h", () => {
        expect(formatMoneyPerHour(2500, "€", 100)).toBe("€25.00/h");
    });

    it("returns null when there are no hours to divide by", () => {
        expect(formatMoneyPerHour(2500, "€", 0)).toBeNull();
        expect(formatMoneyPerHour(2500, "€", -1)).toBeNull();
    });
});
