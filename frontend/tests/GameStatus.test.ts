import {describe, expect, it} from "vitest";
import {statusPillLabel, statusSlug, statusPillHtml} from "../src/utils/GameStatus";

// A3: the status view module. Before this there were two divergent getStatusSlug
// implementations (an enum switch in GameDetailStatsCalculator, a regex in
// AllGamesComponent) and a private Finished/Playing label map buried in
// SessionHistoryComponent. These tests pin the one shared contract.

describe("statusSlug", () => {
    it("slugifies each category to its canonical slug", () => {
        expect(statusSlug("Completed")).toBe("completed");
        expect(statusSlug("In Progress")).toBe("in-progress");
        expect(statusSlug("On Hold")).toBe("on-hold");
        expect(statusSlug("Forever")).toBe("forever");
        expect(statusSlug("Dropped")).toBe("dropped");
    });

    it("lowercases and dashes whitespace/underscores generically", () => {
        expect(statusSlug("Some_New Status")).toBe("some-new-status");
    });
});

describe("statusPillLabel", () => {
    it("relabels the two verbs used on Session History diary cards", () => {
        expect(statusPillLabel("completed")).toBe("Finished");
        expect(statusPillLabel("in-progress")).toBe("Playing");
    });

    it("passes the remaining statuses through with title casing", () => {
        expect(statusPillLabel("on-hold")).toBe("On Hold");
        expect(statusPillLabel("forever")).toBe("Forever");
        expect(statusPillLabel("dropped")).toBe("Dropped");
    });
});

describe("statusPillHtml", () => {
    it("renders a game-status pill with the slug class and category text", () => {
        const html = statusPillHtml("In Progress");
        expect(html).toContain('class="game-status-pill status-in-progress"');
        expect(html).toContain(">In Progress<");
    });

    it("renders a hero-status pill variant using the relabelled text", () => {
        const html = statusPillHtml("Completed", {variant: "hero", relabel: true});
        expect(html).toContain('class="hero-status-pill status-completed"');
        expect(html).toContain(">Finished<");
    });

    it("escapes a hostile category so no tag survives", () => {
        const html = statusPillHtml("<img src=x onerror=alert(1)>");
        expect(html).not.toContain("<img");
    });
});
