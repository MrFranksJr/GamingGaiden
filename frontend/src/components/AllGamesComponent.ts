import {Game, GameData} from "../types/GameData.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";
import {categorizeGameStatus, GameStatusCategory} from "../utils/SummaryStatsCalculator.js";

function getGameInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

export function getStatusSlug(category: string): string {
    return category.toLowerCase().replace(/[\s_]+/g, "-");
}

export function normalizeFilterId(filter?: string | null): string {
    if (!filter) return "all";
    const slug = filter.trim().toLowerCase().replace(/[\s_]+/g, "-");
    const validSlugs = ["all", "in-progress", "completed", "on-hold", "forever", "dropped"];
    if (validSlugs.includes(slug)) {
        return slug;
    }
    if (slug === "playing" || slug === "active") return "in-progress";
    if (slug === "finished" || slug === "done") return "completed";
    if (slug === "hold" || slug === "paused") return "on-hold";
    if (slug === "abandoned") return "dropped";
    return "all";
}

export interface FilterOption {
    id: string;
    label: string;
    category: GameStatusCategory | "All";
    iconClass: string;
    colorVar?: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
    {id: "all", label: "All Games", category: "All", iconClass: "fa-solid fa-shapes", colorVar: "var(--accent-blue)"},
    {
        id: "in-progress",
        label: "In Progress",
        category: "In Progress",
        iconClass: "fa-solid fa-circle-play",
        colorVar: "var(--status-in-progress)"
    },
    {
        id: "completed",
        label: "Completed",
        category: "Completed",
        iconClass: "fa-solid fa-circle-check",
        colorVar: "var(--status-completed)"
    },
    {
        id: "on-hold",
        label: "On Hold",
        category: "On Hold",
        iconClass: "fa-solid fa-circle-pause",
        colorVar: "var(--status-on-hold)"
    },
    {
        id: "forever",
        label: "Forever",
        category: "Forever",
        iconClass: "fa-solid fa-infinity",
        colorVar: "var(--status-forever)"
    },
    {
        id: "dropped",
        label: "Dropped",
        category: "Dropped",
        iconClass: "fa-solid fa-circle-xmark",
        colorVar: "var(--status-dropped)"
    }
];

export class AllGamesComponent {
    private currentData: GameData | null = null;
    private currentContainer: HTMLElement | null = null;
    private activeFilter: string = "all";
    private filterClickListener: ((e: MouseEvent) => void) | null = null;

    render(data: GameData, parameter?: string | null): string {
        if (!data || !data.games) return "<p>No games found.</p>";
        const validGames = data.games.filter(game => game !== null)
            .sort((first, second) => first.name.localeCompare(second.name, undefined, {sensitivity: "base"}));
        if (validGames.length === 0 && data.games.length === 0) return "<p>No games found.</p>";
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }

        this.currentData = data;
        const filterId = normalizeFilterId(parameter || this.activeFilter);
        this.activeFilter = filterId;

        const filteredGames = filterId === "all"
            ? validGames
            : validGames.filter(game => getStatusSlug(categorizeGameStatus(game)) === filterId);

        const currentFilterOption = FILTER_OPTIONS.find(f => f.id === filterId) || FILTER_OPTIONS[0];
        const countText = `${filteredGames.length} ${filteredGames.length === 1 ? "game" : "games"}`;

        let gridContentHtml = "";
        if (filteredGames.length === 0) {
            gridContentHtml = `
                <div class="all-games-empty">
                    <p>No games found for "${escapeHtml(currentFilterOption.label)}".</p>
                </div>
            `;
        } else {
            const cards = filteredGames.map(game => {
                const iconPath = safeCachedImagePath(game.icon_path);
                const statusCategory = categorizeGameStatus(game);
                const statusSlug = getStatusSlug(statusCategory);
                const statusPillHtml = `<span class="game-status-pill status-${escapeHtml(statusSlug)}">${escapeHtml(statusCategory)}</span>`;
                const posterHtml = iconPath
                    ? `<img src="${escapeHtml(iconPath)}" alt="${escapeHtml(game.name)} cover" class="game-poster-img" loading="lazy">`
                    : `<div class="poster-fallback" aria-hidden="true"><span class="fallback-icon">🎮</span><span class="fallback-initials">${escapeHtml(getGameInitials(game.name))}</span></div>`;
                return `<a href="#game-detail?name=${encodeURIComponent(game.name)}" class="game-card" title="${escapeHtml(game.name)}"><div class="game-poster-frame">${posterHtml}${statusPillHtml}</div><div class="game-card-title">${escapeHtml(game.name)}</div></a>`;
            }).join("");
            gridContentHtml = `<div id="all-games-grid">${cards}</div>`;
        }

        return `
            <div id="all-games-view">
                <div class="all-games-header">
                    <h2 class="all-games-title">${escapeHtml(currentFilterOption.label)}</h2>
                    <span class="all-games-count">${escapeHtml(countText)}</span>
                </div>
                ${gridContentHtml}
            </div>
        `;
    }

    mount(container: HTMLElement): void {
        this.currentContainer = container;
        if (!this.currentData || !this.currentData.games) return;

        const validGames = this.currentData.games.filter(game => game !== null);
        if (validGames.length === 0) return;

        this.mountSidebarFilters(validGames);
    }

    private mountSidebarFilters(validGames: Game[]): void {
        if (typeof document === "undefined") return;

        let filtersContainer = document.getElementById("sidebar-filters");
        if (!filtersContainer) {
            const sidebar = document.getElementById("sidebar-nav");
            if (!sidebar) return;
            filtersContainer = document.createElement("div");
            filtersContainer.id = "sidebar-filters";
            filtersContainer.className = "sidebar-filters-container";
            const footer = document.getElementById("sidebar-footer");
            if (footer && footer.parentNode === sidebar) {
                sidebar.insertBefore(filtersContainer, footer);
            } else {
                sidebar.appendChild(filtersContainer);
            }
        }

        const countsByFilter: Record<string, number> = {
            all: validGames.length
        };
        for (const game of validGames) {
            const slug = getStatusSlug(categorizeGameStatus(game));
            countsByFilter[slug] = (countsByFilter[slug] || 0) + 1;
        }

        const buttonsHtml = FILTER_OPTIONS.map(opt => {
            const count = countsByFilter[opt.id] || 0;
            const isActive = this.activeFilter === opt.id;
            return `
                <button type="button" 
                        class="sidebar-filter-btn${isActive ? " active" : ""}" 
                        data-filter="${escapeHtml(opt.id)}"
                        role="tab"
                        aria-selected="${isActive ? "true" : "false"}"
                        title="${escapeHtml(opt.label)} (${count})">
                    <span class="filter-icon"><i class="${escapeHtml(opt.iconClass)}"></i></span>
                    <span class="filter-label">${escapeHtml(opt.label)}</span>
                    <span class="filter-badge">${count}</span>
                </button>
            `;
        }).join("");

        filtersContainer.innerHTML = `
            <div id="sidebar-all-games-filter" class="sidebar-filter-section">
                <div class="sidebar-filter-header">
                    <span class="sidebar-filter-title">Filter by Status</span>
                </div>
                <div class="sidebar-filter-list" role="tablist" aria-label="Filter games by status">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        if (this.filterClickListener) {
            filtersContainer.removeEventListener("click", this.filterClickListener);
        }

        this.filterClickListener = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest<HTMLButtonElement>(".sidebar-filter-btn");
            if (!target) return;
            const filterId = target.dataset.filter;
            if (filterId) {
                this.setFilter(filterId);
            }
        };

        filtersContainer.addEventListener("click", this.filterClickListener);
    }

    public setFilter(filterId: string): void {
        this.activeFilter = normalizeFilterId(filterId);
        if (this.currentData && this.currentContainer) {
            this.currentContainer.innerHTML = this.render(this.currentData, this.activeFilter);
        }
        this.updateSidebarButtonsActiveState();
    }

    public getActiveFilter(): string {
        return this.activeFilter;
    }

    private updateSidebarButtonsActiveState(): void {
        if (typeof document === "undefined") return;
        const buttons = document.querySelectorAll<HTMLButtonElement>(".sidebar-filter-btn");
        buttons.forEach(btn => {
            const isMatch = btn.dataset.filter === this.activeFilter;
            btn.classList.toggle("active", isMatch);
            btn.setAttribute("aria-selected", isMatch ? "true" : "false");
        });
    }

    destroy(): void {
        if (typeof document !== "undefined") {
            const filtersContainer = document.getElementById("sidebar-filters");
            if (filtersContainer) {
                if (this.filterClickListener) {
                    filtersContainer.removeEventListener("click", this.filterClickListener);
                    this.filterClickListener = null;
                }
                filtersContainer.innerHTML = "";
            }
        }
        this.currentData = null;
        this.currentContainer = null;
    }
}
