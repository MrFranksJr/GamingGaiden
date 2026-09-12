/// <reference path="./raw-imports.d.ts" />

import {describe, expect, it} from "vitest";
import dataTablesSource from "../../ui/resources/js/libraries/jquery.dataTables.min.js?raw";
import jquerySource from "../../ui/resources/js/libraries/jquery-3.7.1.min.js?raw";
import rendererSource from "../../modules/UIFunctions.psm1?raw";

type DataTable = {
    order: (order: [number, string]) => { draw: () => void };
    column: (column: number, options: object) => { nodes: () => { toArray: () => HTMLTableCellElement[] } };
};

type JQueryWindow = Window & {
    $: (selector: string) => { DataTable: (options: object) => DataTable };
};

function sortStatusCells(cells: string[]): string[] {
    const rows = cells.map(cell => `<tr><td>${cell}</td></tr>`).join("");
    document.body.innerHTML = `<table><thead><tr><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    window.eval(jquerySource);
    window.eval(dataTablesSource);
    const table = (window as unknown as JQueryWindow).$("table").DataTable({paging: false});

    table.order([0, "asc"]).draw();
    return table.column(0, {order: "current"}).nodes().toArray().map(cell => cell.textContent?.trim() ?? "");
}

describe("classic All Games status sorting", () => {
    it("sorts the labels emitted by the legacy renderer", () => {
        expect(rendererSource).toMatch(/\$statusUri = .*status-sort-label.*Finished/);

        expect(sortStatusCells([
            '<img class="game-status-icon icon-forever" alt="Forever"><span class="status-sort-label">Forever</span>',
            '<img class="game-status-icon icon-finished" alt="Finished"><span class="status-sort-label">Finished</span>'
        ])).toEqual(["Finished", "Forever"]);
    });
});
