import {AllGamesComponent} from "./components/AllGamesComponent.js";
import {SummaryComponent} from "./components/SummaryComponent.js";
import {SessionHistoryComponent} from "./components/SessionHistoryComponent.js";
import {GamingTimeComponent} from "./components/GamingTimeComponent.js";
import {GameDetailComponent} from "./components/GameDetailComponent.js";
import {GameData} from "./types/GameData.js";
import {validateGameData} from "./data/GameDataValidator.js";
import {escapeHtml} from "./utils/HtmlUtils.js";

interface ViewComponent {
    render(data: GameData, parameter?: string | null): string;
}

type ViewComponentConstructor = new () => ViewComponent;

export interface RouteDefinition {
    name: string;
    title?: string;
    component: ViewComponentConstructor;
}

export type RouteTable = Record<string, RouteDefinition>;

export class Router {
    private routes: RouteTable;
    private container: HTMLElement | null;
    private data: GameData | null;
    private readonly onHashChange: () => void;

    constructor(routes: RouteTable) {
        this.routes = routes;
        this.container = document.getElementById("view-container");
        this.data = null;
        this.onHashChange = () => this.handleRoute();
        window.addEventListener("hashchange", this.onHashChange);
        void this.init();
    }

    destroy() {
        window.removeEventListener("hashchange", this.onHashChange);
    }

    async init() {
        await this.loadData();
        this.handleRoute();
    }

    async loadData() {
        // Check if data is already loaded via data.js (fallback for file:/// restriction)
        try {
            let rawData: unknown;
            if (window.gamingGaidenData) {
                rawData = window.gamingGaidenData;
            } else {
                const response = await fetch("./resources/data.json");
                if (!response.ok) {
                    this.displayError(`HTTP error! status: ${response.status}`);
                    return;
                }
                rawData = await response.json();
            }

            const validated = validateGameData(rawData);
            this.data = validated.data;
            validated.warnings.forEach(warning => console.warn(warning));
        } catch (error) {
            console.error("Failed to load game data:", error);
            const message = error instanceof Error ? error.message : "Unknown data error.";
            this.displayError(`Failed to load data: ${message}`);
        }
    }

    private displayError(message: string) {
        if (this.container) {
            this.container.innerHTML = `<div id="error-message"><h2>Error</h2><p>${escapeHtml(message)}</p></div>`;
        }
    }

    handleRoute() {
        if (!this.data && this.container) {
            return;
        }
        const hash = window.location.hash || "#summary";
        const [routeKey, query = ""] = hash.split("?", 2);
        const route = this.routes[routeKey];
        if (!route) {
            this.displayError(`Page not found: ${routeKey}`);
            return;
        }

        const parameter = routeKey === "#game-detail" ? new URLSearchParams(query).get("name") : null;
        this.render(route, parameter);
    }

    render(route: RouteDefinition, parameter: string | null = null) {
        if (this.container) {
            try {
                const component = new route.component();
                this.container.innerHTML = component.render(this.data!, parameter);
            } catch (error) {
                console.error("Rendering error:", error);
                this.displayError("An error occurred while rendering this view.");
            }
        }
    }
}

const routes = {
    "#summary": {name: "summary", title: "Summary Dashboard", component: SummaryComponent},
    "#all-games": {name: "all-games", title: "All Games", component: AllGamesComponent},
    "#gaming-time": {name: "gaming-time", title: "Time Spent Gaming", component: GamingTimeComponent},
    "#session-history": {name: "session-history", title: "Session History", component: SessionHistoryComponent},
    "#game-detail": {name: "game-detail", title: "Game Detail", component: GameDetailComponent}
};

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        new Router(routes);
    });
}


