import {AllGamesComponent} from "./components/AllGamesComponent.js";
import {SummaryComponent} from "./components/SummaryComponent.js";
import {SessionHistoryComponent} from "./components/SessionHistoryComponent.js";
import {MyRigsComponent} from "./components/MyRigsComponent.js";
import {GameDetailComponent} from "./components/GameDetailComponent.js";
import {GameData} from "./types/GameData.js";
import {validateGameData} from "./data/GameDataValidator.js";
import {escapeHtml} from "./utils/HtmlUtils.js";
import {initThemeManager} from "./utils/ThemeManager.js";

interface ViewComponent {
    render(data: GameData, parameter?: string | null): string;

    mount?(container: HTMLElement): void;

    destroy?(): void;
}

type ViewComponentConstructor = new () => ViewComponent;

export interface RouteDefinition {
    name: string;
    title?: string;
    component: ViewComponentConstructor;
    /**
     * Extracts this route's render parameter from the raw query string. Each
     * route owns its own query keys here, so the router never grows a per-route
     * parsing ladder. Omit for screens that take the raw query (or no param).
     */
    parseParam?: (query: string) => string | null;
}

export type RouteTable = Record<string, RouteDefinition>;

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "gaming_gaiden_sidebar_collapsed";

export function updateNavIndicatorPosition(activeElement?: HTMLElement | null): void {
    if (typeof document === "undefined") return;
    const indicator = document.getElementById("nav-indicator");
    if (!indicator) return;

    const active = activeElement || document.querySelector<HTMLElement>("#sidebar-nav .nav-link.active");
    if (active) {
        indicator.style.opacity = "1";
        indicator.style.transform = `translateY(${active.offsetTop}px)`;
        if (active.offsetHeight > 0) {
            indicator.style.height = `${active.offsetHeight}px`;
        }
    } else {
        indicator.style.opacity = "0";
    }
}

export function initSidebarToggle(): () => void {
    if (typeof document === "undefined") {
        return () => {};
    }
    const sidebar = document.getElementById("sidebar-nav");
    const toggleBtn = document.getElementById("sidebar-toggle");
    const expandLogo = document.getElementById("sidebar-expand");
    if (!sidebar || !toggleBtn) {
        return () => {};
    }

    const setCollapsed = (collapsed: boolean) => {
        if (collapsed) {
            sidebar.classList.add("collapsed");
            toggleBtn.setAttribute("aria-expanded", "false");
            toggleBtn.setAttribute("title", "Expand sidebar");
            // Toggle button is hidden when collapsed; take it out of the tab order.
            toggleBtn.setAttribute("tabindex", "-1");
            toggleBtn.setAttribute("aria-hidden", "true");
            if (expandLogo) {
                expandLogo.setAttribute("tabindex", "0");
                expandLogo.removeAttribute("aria-hidden");
            }
        } else {
            sidebar.classList.remove("collapsed");
            toggleBtn.setAttribute("aria-expanded", "true");
            toggleBtn.setAttribute("title", "Collapse sidebar");
            toggleBtn.removeAttribute("tabindex");
            toggleBtn.removeAttribute("aria-hidden");
            // Logo is inert when expanded.
            if (expandLogo) {
                expandLogo.setAttribute("tabindex", "-1");
                expandLogo.setAttribute("aria-hidden", "true");
            }
        }
        updateNavIndicatorPosition();
        if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(() => updateNavIndicatorPosition());
        }
    };

    const onTransitionEnd = (e: TransitionEvent) => {
        if (e.target === sidebar && (e.propertyName === "width" || e.propertyName === "padding")) {
            updateNavIndicatorPosition();
        }
    };
    sidebar.addEventListener("transitionend", onTransitionEnd as EventListener);

    // Restore saved state
    try {
        const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
        if (savedState === "true") {
            setCollapsed(true);
        } else {
            setCollapsed(false);
        }
    } catch {
        // Ignore localStorage access errors
    }

    const onToggleClick = () => {
        const isCollapsed = !sidebar.classList.contains("collapsed");
        setCollapsed(isCollapsed);
        try {
            localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
        } catch {
            // Ignore storage write error
        }
    };

    const expand = () => {
        // Only meaningful while collapsed; expands and persists the state.
        if (!sidebar.classList.contains("collapsed")) return;
        setCollapsed(false);
        try {
            localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "false");
        } catch {
            // Ignore storage write error
        }
    };

    const onLogoClick = () => expand();
    const onLogoKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            expand();
        }
    };

    toggleBtn.addEventListener("click", onToggleClick);
    if (expandLogo) {
        expandLogo.addEventListener("click", onLogoClick);
        expandLogo.addEventListener("keydown", onLogoKeydown as EventListener);
    }
    return () => {
        toggleBtn.removeEventListener("click", onToggleClick);
        sidebar.removeEventListener("transitionend", onTransitionEnd as EventListener);
        if (expandLogo) {
            expandLogo.removeEventListener("click", onLogoClick);
            expandLogo.removeEventListener("keydown", onLogoKeydown as EventListener);
        }
    };
}

export class Router {
    private readonly routes: RouteTable;
    private readonly container: HTMLElement | null;
    private data: GameData | null;
    private readonly onHashChange: () => void;
    private readonly sidebarCleanup: (() => void) | null;
    private readonly themeCleanup: (() => void) | null;
    private activeComponent: ViewComponent | null = null;

    constructor(routes: RouteTable) {
        this.routes = routes;
        this.container = document.getElementById("view-container");
        this.data = null;
        this.onHashChange = () => this.handleRoute();
        window.addEventListener("hashchange", this.onHashChange);
        this.sidebarCleanup = initSidebarToggle();
        this.themeCleanup = initThemeManager();
        void this.init();
    }

    destroy() {
        window.removeEventListener("hashchange", this.onHashChange);
        this.sidebarCleanup?.();
        this.themeCleanup?.();
        this.activeComponent?.destroy?.();
        this.activeComponent = null;
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
            validated.warnings.forEach((warning) => console.warn(warning));
        } catch (error) {
            console.error("Failed to load game data:", error);
            const message = error instanceof Error ? error.message : "Unknown data error.";
            this.displayError(`Failed to load data: ${message}`);
        }
    }

    private updateActiveNavigation(routeKey: string) {
        if (typeof document === "undefined") return;
        const navLinks = document.querySelectorAll<HTMLAnchorElement>("#sidebar-nav .nav-link");
        let activeElement: HTMLAnchorElement | null = null;
        navLinks.forEach((link) => {
            const href = link.getAttribute("href") || link.dataset.route;
            if (href === routeKey) {
                link.classList.add("active");
                activeElement = link;
            } else {
                link.classList.remove("active");
            }
        });
        updateNavIndicatorPosition(activeElement);
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
        const initialRoute =
            typeof window !== "undefined" && window.gamingGaidenInitialRoute ? window.gamingGaidenInitialRoute : null;
        let hash = window.location.hash;
        if (!hash && typeof window !== "undefined" && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const routeParam = params.get("route") || params.get("page") || params.get("view");
            if (routeParam) {
                hash = routeParam.startsWith("#") ? routeParam : `#${routeParam}`;
            }
        }
        if (!hash && initialRoute) {
            hash = initialRoute.startsWith("#") ? initialRoute : `#${initialRoute}`;
            if (typeof window !== "undefined" && !window.location.hash) {
                try {
                    window.location.hash = hash;
                } catch {
                    // Ignore if modifying hash fails
                }
            }
        }
        if (!hash) {
            hash = "#summary";
        }

        const [routeKey, query = ""] = hash.split("?", 2);
        this.updateActiveNavigation(routeKey);

        const route = this.routes[routeKey];
        if (!route) {
            this.displayError(`Page not found: ${routeKey}`);
            return;
        }

        // Each route owns its query-key knowledge via parseParam; screens that
        // want the raw query (or no param) simply omit it.
        const parameter = route.parseParam ? route.parseParam(query) : query || null;
        this.render(route, parameter);
    }

    render(route: RouteDefinition, parameter: string | null = null) {
        if (this.container) {
            try {
                this.activeComponent?.destroy?.();
                const component = new route.component();
                this.activeComponent = component;
                this.container.innerHTML = component.render(this.data!, parameter);
                component.mount?.(this.container);
            } catch (error) {
                console.error("Rendering error:", error);
                this.displayError("An error occurred while rendering this view.");
            }
        }
    }
}

const routes = {
    "#summary": {name: "summary", title: "Summary Dashboard", component: SummaryComponent},
    "#all-games": {
        name: "all-games",
        title: "All Games",
        component: AllGamesComponent,
        parseParam: (query: string) => {
            const params = new URLSearchParams(query);
            return params.get("filter") || params.get("status");
        }
    },
    "#my-rigs": {name: "my-rigs", title: "My Rigs", component: MyRigsComponent},
    "#session-history": {name: "session-history", title: "Session History", component: SessionHistoryComponent},
    "#game-detail": {
        name: "game-detail",
        title: "Game Detail",
        component: GameDetailComponent,
        parseParam: (query: string) => new URLSearchParams(query).get("name")
    }
};

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        new Router(routes);
    });
}
