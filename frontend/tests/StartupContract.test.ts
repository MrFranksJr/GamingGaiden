import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import "../src/types/GameData";

describe("local-file startup contract", () => {
    afterEach(() => {
        delete window.gamingGaidenData;
        window.location.hash = "";
        document.body.innerHTML = "";
    });

    it("loads data.js before the bundled application", () => {
        const html = readFileSync(resolve("index.html"), "utf8");
        const document = new DOMParser().parseFromString(html, "text/html");
        const scripts = Array.from(document.querySelectorAll("script")).map(script => script.getAttribute("src"));

        expect(scripts).toEqual([
            "./resources/data.js",
            "./resources/route.js",
            "./resources/js/app.js"
        ]);
    });

    it("renders the controller logo next to the title in the sidebar header", () => {
        const html = readFileSync(resolve("index.html"), "utf8");
        const document = new DOMParser().parseFromString(html, "text/html");
        const header = document.querySelector(".sidebar-header");
        expect(header).not.toBeNull();

        const logo = header?.querySelector<HTMLImageElement>("img.app-logo");
        expect(logo).not.toBeNull();
        expect(logo?.getAttribute("src")).toBe("./resources/images/favicon.ico");

        const title = header?.querySelector(".app-title");
        expect(title).not.toBeNull();
        expect(title?.textContent?.trim()).toBe("Gaming Gaiden");
    });

    it("includes font-awesome stylesheet and bars icon for sidebar toggle", () => {
        const html = readFileSync(resolve("index.html"), "utf8");
        const document = new DOMParser().parseFromString(html, "text/html");
        const stylesheets = Array.from(document.querySelectorAll("link[rel='stylesheet']")).map(link => link.getAttribute("href"));
        expect(stylesheets).toContain("./resources/fontawesome/css/all.min.css");

        const toggleBtn = document.getElementById("sidebar-toggle");
        expect(toggleBtn).not.toBeNull();
        const icon = toggleBtn?.querySelector("i.fa-solid.fa-bars");
        expect(icon).not.toBeNull();
    });

    it("uses font-awesome icons for all sidebar navigation items", () => {
        const html = readFileSync(resolve("index.html"), "utf8");
        const document = new DOMParser().parseFromString(html, "text/html");

        expect(document.querySelector("a[href='#summary'] .nav-icon i.fa-solid.fa-clipboard-list")).not.toBeNull();
        expect(document.querySelector("a[href='#all-games'] .nav-icon i.fa-solid.fa-gamepad")).not.toBeNull();
        expect(document.querySelector("a[href='#gaming-time'] .nav-icon i.fa-solid.fa-stopwatch")).not.toBeNull();
        expect(document.querySelector("a[href='#session-history'] .nav-icon i.fa-solid.fa-calendar")).not.toBeNull();
    });

    it("defines playstation button colors and hover/active sidebar icon rules", () => {
        const themeCss = readFileSync(resolve("resources/css/theme.css"), "utf8");
        const commonCss = readFileSync(resolve("resources/css/common.css"), "utf8");

        expect(themeCss).toContain("--ps-triangle-green");
        expect(themeCss).toContain("--ps-circle-red");
        expect(themeCss).toContain("--ps-cross-blue");
        expect(themeCss).toContain("--ps-square-pink");

        expect(commonCss).toContain('.nav-link[href="#summary"]:hover .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#summary"].active .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#all-games"]:hover .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#all-games"].active .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#gaming-time"]:hover .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#gaming-time"].active .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#session-history"]:hover .nav-icon');
        expect(commonCss).toContain('.nav-link[href="#session-history"].active .nav-icon');
    });

    it("ships a classic bundled script without browser module imports", () => {
        const bundle = readFileSync(resolve("resources/js/app.js"), "utf8");

        expect(bundle.length).toBeGreaterThan(0);
        expect(bundle).not.toMatch(/^\s*import\s/m);
    });

    it("boots the production bundle with a real exporter-generated payload", async () => {
        const bundle = readFileSync(resolve("resources/js/app.js"), "utf8");
        window.gamingGaidenData = JSON.parse(readFileSync(resolve("resources/data.json"), "utf8"));
        document.body.innerHTML = '<div id="view-container">Loading...</div>';

        window.eval(bundle);
        document.dispatchEvent(new Event("DOMContentLoaded"));
        await new Promise(resolvePromise => setTimeout(resolvePromise, 0));

        expect(document.getElementById("summary-view")).not.toBeNull();
        expect(document.getElementById("total-games-value")?.textContent).toBe("10");
        expect(document.getElementById("error-message")).toBeNull();

        window.location.hash = "#all-games";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        expect(document.getElementById("all-games-view")).not.toBeNull();
        expect(document.querySelectorAll(".game-card")).toHaveLength(10);

        const firstGameLink = document.querySelector<HTMLAnchorElement>(".game-card");
        expect(firstGameLink?.hash).toMatch(/^#game-detail\?name=/);
        window.location.hash = firstGameLink!.hash;
        window.dispatchEvent(new HashChangeEvent("hashchange"));

        expect(document.getElementById("game-detail-view")).not.toBeNull();
        expect(document.getElementById("detail-game-name")?.textContent).not.toBe("");
        expect(document.querySelector<HTMLAnchorElement>(".back-link")?.hash).toBe("#all-games");
    });
});
