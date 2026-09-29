import {describe, expect, it} from "vitest";
import {MyRigsComponent} from "../src/components/MyRigsComponent";
import {GameData, GamingPC, Game} from "../src/types/GameData";

function pc(overrides: Partial<GamingPC> & {name: string}): GamingPC {
    return {
        in_use: false,
        cost: null,
        currency: null,
        start_date: 0,
        end_date: 0,
        total_play_time: 0,
        ...overrides
    };
}

function game(name: string, overrides: Partial<Game> = {}): Game {
    return {name, play_time: 0, session_count: 0, status: "playing", completed: false, ...overrides};
}

function dataOf(pcs: GamingPC[], games: Game[] = []): GameData {
    return {schema_version: 1, games, session_history: [], daily_playtime: [], gaming_pcs: pcs};
}

function renderInto(data: GameData, param: string | null = null): MyRigsComponent {
    const component = new MyRigsComponent();
    document.body.innerHTML = component.render(data, param);
    return component;
}

const soloRig = dataOf(
    [
        pc({
            name: "MINWU",
            in_use: true,
            cost: "2500",
            currency: "€ ",
            total_play_time: 6000,
            start_date: Date.UTC(2020, 10, 10) / 1000
        })
    ],
    [
        game("Big", {
            gaming_pc_name: "MINWU",
            play_time: 4000,
            session_count: 40,
            icon_path: "resources/images/cache/Big.png"
        }),
        game("Small", {gaming_pc_name: "MINWU", play_time: 2000, session_count: 20})
    ]
);

describe("MyRigsComponent", () => {
    it("renders the rig name and an In use status pill for the active rig", () => {
        renderInto(soloRig);
        expect(document.querySelector(".rig-hero-name")?.textContent).toContain("MINWU");
        const pill = document.querySelector(".rig-status-pill");
        expect(pill?.textContent).toContain("In use");
        expect(pill?.classList.contains("in-use")).toBe(true);
    });

    it("renders four stat cards: playtime, games, sessions, cost", () => {
        renderInto(soloRig);
        const cards = document.querySelectorAll("#my-rigs-view .rig-stats-grid .stat-card");
        expect(cards.length).toBe(4);
        const text = document.querySelector("#my-rigs-view")!.textContent!;
        expect(text).toContain("100 Hr 0 Min"); // 6000 minutes total playtime
        expect(text).toContain("2"); // games played
        expect(text).toContain("60"); // sessions (40 + 20)
    });

    it("shows both the raw system cost and cost-per-hour", () => {
        renderInto(soloRig);
        const text = document.querySelector("#my-rigs-view")!.textContent!;
        // €2500 total is the headline; €25.00/h (2500 / 100h) is the sub-line.
        expect(text).toContain("€2500");
        expect(text).toContain("€25.00/h");
        expect(document.querySelector(".stat-subline")?.textContent).toContain("€25.00/h");
    });

    it("lists games on the rig, ranked, linking to game detail", () => {
        renderInto(soloRig);
        const rows = document.querySelectorAll(".rig-games .session-games-played-row");
        expect(rows.length).toBe(2);
        const firstLink = document.querySelector(".rig-games a") as HTMLAnchorElement;
        expect(firstLink.getAttribute("href")).toBe("#game-detail?name=Big");
    });

    it("does not render a rig switcher when there is only one rig", () => {
        renderInto(soloRig);
        expect(document.querySelector(".rig-switcher")).toBeNull();
    });

    it("renders a rig switcher and defaults to the in-use rig when several rigs exist", () => {
        const data = dataOf([
            pc({name: "OLD", in_use: false, end_date: Date.UTC(2019, 0, 1) / 1000}),
            pc({name: "CURRENT", in_use: true})
        ]);
        renderInto(data);
        const chips = document.querySelectorAll(".rig-switcher .rig-chip");
        expect(chips.length).toBe(2);
        expect(document.querySelector(".rig-hero-name")?.textContent).toContain("CURRENT");
        expect(document.querySelector(".rig-chip.active")?.textContent).toContain("CURRENT");
    });

    it("honors the rig query parameter to select a specific rig", () => {
        const data = dataOf([pc({name: "OLD", in_use: false}), pc({name: "CURRENT", in_use: true})]);
        renderInto(data, "rig=OLD");
        expect(document.querySelector(".rig-hero-name")?.textContent).toContain("OLD");
    });

    it("shows 'Not recorded' and no cost-per-hour when cost is missing", () => {
        const data = dataOf([pc({name: "MINWU", in_use: true, cost: null, total_play_time: 600})]);
        renderInto(data);
        const text = document.querySelector("#my-rigs-view")!.textContent!;
        expect(text).toContain("Not recorded");
        expect(text).not.toContain("/h");
    });

    it("shows an empty state when there are no rigs", () => {
        renderInto(dataOf([]));
        expect(document.querySelector(".rig-empty-state")).not.toBeNull();
        expect(document.querySelector(".rig-hero-name")).toBeNull();
    });
});
