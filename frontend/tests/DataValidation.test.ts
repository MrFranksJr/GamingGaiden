import {describe, expect, it} from "vitest";
import {SummaryComponent} from "../resources/js/components/SummaryComponent";
import {AllGamesComponent} from "../resources/js/components/AllGamesComponent";
import {GameData} from "../resources/js/types/GameData";

describe("Data Validation", () => {
    const malformedData = {
        games: [null],
        session_history: [null],
        gaming_pcs: [null],
        daily_playtime: [null],
        export_date: "2026-04-24 14:46:39",
        hash: "somehash"
    } as unknown as GameData;
    it("SummaryComponent should handle null game entries and show error", () => {
        const component = new SummaryComponent();
        const html = component.render(malformedData);
        expect(html).toContain("Error");
        expect(html).toContain("invalid entries");
    });
    it("AllGamesComponent should handle null game entries and show error", () => {
        const component = new AllGamesComponent();
        const html = component.render(malformedData);
        expect(html).toContain("Error");
        expect(html).toContain("invalid entries");
    });
});
