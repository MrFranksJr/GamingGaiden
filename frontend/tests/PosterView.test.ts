import {describe, expect, it} from "vitest";
import {escapeHtml, gameInitials, posterFallbackHtml, safeCachedImagePath} from "../src/utils/HtmlUtils";

// A1: the poster/initials view primitive. Before this module the initials logic
// existed as four divergent copies (AllGames, Summary, SessionHistory, MyRigs) and
// the fallback tile markup was inlined in five places. These tests pin the one
// unified contract so the copies can be deleted.

describe("escapeHtml", () => {
    it("escapes the five HTML-sensitive characters", () => {
        expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#039;");
    });

    it("coerces null and undefined to an empty string", () => {
        expect(escapeHtml(null)).toBe("");
        expect(escapeHtml(undefined)).toBe("");
    });

    it("neutralises a script payload so no tag survives", () => {
        const escaped = escapeHtml("<img src=x onerror=alert(1)>");
        expect(escaped).not.toContain("<");
        expect(escaped).not.toContain(">");
    });
});

describe("safeCachedImagePath", () => {
    it("accepts a cached image path with an allowed extension", () => {
        expect(safeCachedImagePath("resources/images/cache/abc-123.png")).toBe("resources/images/cache/abc-123.png");
    });

    it("rejects a path outside the cache directory", () => {
        expect(safeCachedImagePath("resources/images/other/abc.png")).toBeNull();
        expect(safeCachedImagePath("../etc/passwd")).toBeNull();
    });

    it("rejects a path with an attribute-injection payload", () => {
        expect(safeCachedImagePath('x" onerror="alert(1)')).toBeNull();
    });

    it("rejects non-string input", () => {
        expect(safeCachedImagePath(null)).toBeNull();
        expect(safeCachedImagePath(42)).toBeNull();
    });
});

describe("gameInitials", () => {
    it("takes the first letter of the first two words", () => {
        expect(gameInitials("Elden Ring")).toBe("ER");
    });

    it("takes the first two letters of a single-word name", () => {
        expect(gameInitials("Hades")).toBe("HA");
    });

    it("uppercases the result", () => {
        expect(gameInitials("elden ring")).toBe("ER");
    });

    it("returns '?' for an empty or whitespace-only name", () => {
        expect(gameInitials("")).toBe("?");
        expect(gameInitials("   ")).toBe("?");
    });

    it("strips leading punctuation so it never emits a symbol as an initial", () => {
        // Summary's algorithm (the most robust of the four) drove this: a name like
        // ":Explore" must not yield ":" as an initial.
        expect(gameInitials("!Xtreme Racing")).toBe("XR");
    });

    it("handles a non-string defensively", () => {
        // The old Summary copy guarded typeof; preserve that.
        expect(gameInitials(undefined as unknown as string)).toBe("?");
    });
});

describe("posterFallbackHtml", () => {
    it("renders escaped initials and the game glyph", () => {
        const html = posterFallbackHtml("Elden Ring");
        expect(html).toContain('class="poster-fallback"');
        expect(html).toContain('class="fallback-initials"');
        expect(html).toContain("ER");
        expect(html).toContain("🎮");
    });

    it("defaults to icon-first order (AllGames / Session History / Game Detail markup)", () => {
        const html = posterFallbackHtml("Elden Ring");
        expect(html.indexOf("fallback-icon")).toBeLessThan(html.indexOf("fallback-initials"));
    });

    it("supports initials-first order (My Rigs markup)", () => {
        const html = posterFallbackHtml("Elden Ring", {order: "initials-first"});
        expect(html.indexOf("fallback-initials")).toBeLessThan(html.indexOf("fallback-icon"));
    });

    it("omits aria-hidden by default and adds it on request", () => {
        expect(posterFallbackHtml("Elden Ring")).not.toContain("aria-hidden");
        expect(posterFallbackHtml("Elden Ring", {ariaHidden: true})).toContain('aria-hidden="true"');
    });

    it("escapes a hostile name inside the fallback", () => {
        const html = posterFallbackHtml("<img src=x onerror=alert(1)>");
        expect(html).not.toContain("<img");
    });
});
