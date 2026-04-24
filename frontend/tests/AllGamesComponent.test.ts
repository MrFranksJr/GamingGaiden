import {describe, expect, it} from "vitest";
import {AllGamesComponent} from "../resources/js/components/AllGamesComponent";
import {mockData} from "./test-utils";

describe("AllGamesComponent", () => {
    it("should render a list of games with icons", () => {
        const component = new AllGamesComponent();
        document.body.innerHTML = component.render(mockData);
        const rows = document.querySelectorAll(".game-row");
        expect(rows.length).toBe(2);
        const firstRow = rows[0];
        expect(firstRow.querySelector(".game-name")?.textContent).toContain("Game A");
        const icon = firstRow.querySelector(".game-icon") as HTMLImageElement;
        expect(icon).not.toBeNull();
        expect(icon.src).toContain("resources/images/cache/Game_A.jpg");
    });
});
