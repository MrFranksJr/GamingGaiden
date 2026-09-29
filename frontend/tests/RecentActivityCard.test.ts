import {describe, expect, it} from "vitest";
import {RecentActivityCard} from "../src/components/summary/RecentActivityCard";
import {RecentSessionActivity} from "../src/utils/SummaryStatsCalculator";

// C2: RecentActivityCard had no test. Cover the empty state, item rendering,
// the icon-vs-initials-fallback branch, and HTML escaping.

function activity(overrides: Partial<RecentSessionActivity> = {}): RecentSessionActivity {
    return {
        gameName: "Elden Ring",
        startTime: 1_700_000_000,
        durationMinutes: 120,
        durationFormatted: "+2 h",
        relativeTime: "Played 2h ago",
        iconPath: null,
        ...overrides
    };
}

function render(activities: RecentSessionActivity[]): HTMLElement {
    const host = document.createElement("div");
    host.innerHTML = RecentActivityCard.render(activities);
    return host;
}

describe("RecentActivityCard", () => {
    it("shows an empty state when there is no activity", () => {
        const host = render([]);
        expect(host.querySelector(".recent-empty")?.textContent).toContain("No recent activity");
        expect(host.querySelectorAll(".recent-activity-item")).toHaveLength(0);
    });

    it("renders one item per activity with its title, relative time, and duration", () => {
        const host = render([activity(), activity({gameName: "Hades", relativeTime: "Yesterday"})]);
        expect(host.querySelectorAll(".recent-activity-item")).toHaveLength(2);
        expect(host.querySelector(".recent-game-title")?.textContent).toBe("Elden Ring");
        expect(host.querySelector(".recent-relative-time")?.textContent).toBe("Played 2h ago");
        expect(host.querySelector(".recent-duration-badge")?.textContent?.trim()).toBe("+2 h");
    });

    it("uses the cover image when an icon path is present", () => {
        const host = render([activity({iconPath: "resources/images/cache/er.png"})]);
        expect(host.querySelector("img.recent-thumb-img")).not.toBeNull();
        expect(host.querySelector(".recent-thumb-fallback")).toBeNull();
    });

    it("falls back to two-letter initials when there is no icon", () => {
        const host = render([activity({gameName: "Hades", iconPath: null})]);
        expect(host.querySelector("img.recent-thumb-img")).toBeNull();
        expect(host.querySelector(".recent-thumb-fallback")?.textContent).toBe("HA");
    });

    it("escapes a hostile game name so no tag survives", () => {
        const host = render([activity({gameName: "<img src=x onerror=alert(1)>"})]);
        expect(host.querySelector("#injected")).toBeNull();
        expect(host.querySelectorAll(".recent-activity-item")).toHaveLength(1);
    });
});
