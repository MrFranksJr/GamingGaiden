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
    private searchQuery: string = "";
    private filterClickListener: ((e: MouseEvent) => void) | null = null;
    private searchInputListener: ((e: Event) => void) | null = null;
    private searchKeyDownListener: ((e: KeyboardEvent) => void) | null = null;
    private clearClickListener: ((e: MouseEvent) => void) | null = null;

    render(data: GameData, parameter?: string | null): string {
        if (!data || !data.games) return "<p>No games found.</p>";
        const validGames = data.games.filter(game => game !== null)
            .sort((first, second) => first.name.localeCompare(second.name, undefined, {sensitivity: "base"}));
        if (validGames.length === 0 && data.games.length === 0) return "<p>No games found.</p>";
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }

        this.currentData = data;
        this.activeFilter = normalizeFilterId(parameter || this.activeFilter);

        return this.renderViewHtml(validGames);
    }

    private getFilteredGames(validGames: Game[]): Game[] {
        let filtered = this.activeFilter === "all"
            ? validGames
            : validGames.filter(game => getStatusSlug(categorizeGameStatus(game)) === this.activeFilter);

        const query = this.searchQuery.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(game => game.name.toLowerCase().includes(query));
        }
        return filtered;
    }

    private renderViewHtml(validGames: Game[]): string {
        const filteredGames = this.getFilteredGames(validGames);
        const currentFilterOption = FILTER_OPTIONS.find(f => f.id === this.activeFilter) || FILTER_OPTIONS[0];
        const countText = `${filteredGames.length} ${filteredGames.length === 1 ? "game" : "games"}`;

        let gridContentHtml = "";
        if (filteredGames.length === 0) {
            const query = this.searchQuery.trim();
            let emptyMsg = `No games found for "${escapeHtml(currentFilterOption.label)}".`;
            if (query) {
                emptyMsg = this.activeFilter === "all"
                    ? `No games found matching "${escapeHtml(query)}".`
                    : `No games found matching "${escapeHtml(query)}" in "${escapeHtml(currentFilterOption.label)}".`;
            }
            gridContentHtml = `
                <div class="all-games-empty">
                    <p>${emptyMsg}</p>
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

        const isClearVisible = Boolean(this.searchQuery.trim());

        return `
            <div id="all-games-view">
                <div class="all-games-header">
                    <div class="all-games-header-left">
                        <h2 class="all-games-title">${escapeHtml(currentFilterOption.label)}</h2>
                        <span class="all-games-count">${escapeHtml(countText)}</span>
                    </div>
                    <div class="all-games-search-wrapper">
                        <span class="all-games-search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input 
                            type="text" 
                            id="all-games-search-input" 
                            class="all-games-search-input" 
                            placeholder="Search games..." 
                            value="${escapeHtml(this.searchQuery)}"
                            aria-label="Search games"
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button type="button" 
                                id="all-games-search-clear" 
                                class="all-games-search-clear${isClearVisible ? " visible" : ""}" 
                                aria-label="Clear search" 
                                title="Clear search">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div id="all-games-content">
                    ${gridContentHtml}
                </div>
            </div>
        `;
    }

    mount(container: HTMLElement): void {
        this.currentContainer = container;
        if (!this.currentData || !this.currentData.games) return;

        const validGames = this.currentData.games.filter(game => game !== null);
        if (validGames.length === 0) return;

        this.mountSidebarFilters(validGames);
        this.attachSearchListeners(container, validGames);
    }

    private attachSearchListeners(container: HTMLElement, validGames: Game[]): void {
        const sortedGames = [...validGames].sort((first, second) =>
            first.name.localeCompare(second.name, undefined, {sensitivity: "base"})
        );
        const searchInput = container.querySelector<HTMLInputElement>("#all-games-search-input");
        const clearBtn = container.querySelector<HTMLButtonElement>("#all-games-search-clear");

        if (searchInput) {
            this.searchInputListener = (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.searchQuery = target.value;
                if (clearBtn) {
                    clearBtn.classList.toggle("visible", Boolean(this.searchQuery.trim()));
                }
                this.updateGridAndCount(container, sortedGames);
            };
            searchInput.addEventListener("input", this.searchInputListener);

            this.searchKeyDownListener = (e: KeyboardEvent) => {
                if (e.key === "Escape" && this.searchQuery) {
                    e.preventDefault();
                    this.clearSearch(container, sortedGames);
                }
            };
            searchInput.addEventListener("keydown", this.searchKeyDownListener);
        }

        if (clearBtn) {
            this.clearClickListener = (e: MouseEvent) => {
                e.preventDefault();
                this.clearSearch(container, sortedGames);
                if (searchInput) {
                    searchInput.focus();
                }
            };
            clearBtn.addEventListener("click", this.clearClickListener);
        }
    }

    private clearSearch(container: HTMLElement, validGames: Game[]): void {
        this.searchQuery = "";
        const searchInput = container.querySelector<HTMLInputElement>("#all-games-search-input");
        if (searchInput) {
            searchInput.value = "";
        }
        const clearBtn = container.querySelector<HTMLButtonElement>("#all-games-search-clear");
        if (clearBtn) {
            clearBtn.classList.remove("visible");
        }
        this.updateGridAndCount(container, validGames);
    }

    private updateGridAndCount(container: HTMLElement, validGames: Game[]): void {
        const filteredGames = this.getFilteredGames(validGames);
        const countEl = container.querySelector(".all-games-count");
        if (countEl) {
            countEl.textContent = `${filteredGames.length} ${filteredGames.length === 1 ? "game" : "games"}`;
        }

        const titleEl = container.querySelector(".all-games-title");
        const currentFilterOption = FILTER_OPTIONS.find(f => f.id === this.activeFilter) || FILTER_OPTIONS[0];
        if (titleEl) {
            titleEl.textContent = currentFilterOption.label;
        }

        const contentEl = container.querySelector("#all-games-content");
        if (contentEl) {
            if (filteredGames.length === 0) {
                const query = this.searchQuery.trim();
                let emptyMsg = `No games found for "${currentFilterOption.label}".`;
                if (query) {
                    emptyMsg = this.activeFilter === "all"
                        ? `No games found matching "${query}".`
                        : `No games found matching "${query}" in "${currentFilterOption.label}".`;
                }
                contentEl.innerHTML = `
                    <div class="all-games-empty">
                        <p>${escapeHtml(emptyMsg)}</p>
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
                contentEl.innerHTML = `<div id="all-games-grid">${cards}</div>`;
            }
        }
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
            const validGames = this.currentData.games.filter(game => game !== null);
            this.updateGridAndCount(this.currentContainer, validGames);
        }
        this.updateSidebarButtonsActiveState();
    }

    public getActiveFilter(): string {
        return this.activeFilter;
    }

    public setSearch(query: string): void {
        this.searchQuery = query;
        if (this.currentContainer) {
            const searchInput = this.currentContainer.querySelector<HTMLInputElement>("#all-games-search-input");
            if (searchInput && searchInput.value !== query) {
                searchInput.value = query;
            }
            const clearBtn = this.currentContainer.querySelector<HTMLButtonElement>("#all-games-search-clear");
            if (clearBtn) {
                clearBtn.classList.toggle("visible", Boolean(query.trim()));
            }
            if (this.currentData && this.currentData.games) {
                const validGames = this.currentData.games.filter(game => game !== null);
                this.updateGridAndCount(this.currentContainer, validGames);
            }
        }
    }

    public getSearch(): string {
        return this.searchQuery;
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
            if (this.currentContainer) {
                const searchInput = this.currentContainer.querySelector<HTMLInputElement>("#all-games-search-input");
                if (searchInput && this.searchInputListener) {
                    searchInput.removeEventListener("input", this.searchInputListener);
                    this.searchInputListener = null;
                }
                if (searchInput && this.searchKeyDownListener) {
                    searchInput.removeEventListener("keydown", this.searchKeyDownListener);
                    this.searchKeyDownListener = null;
                }
                const clearBtn = this.currentContainer.querySelector<HTMLButtonElement>("#all-games-search-clear");
                if (clearBtn && this.clearClickListener) {
                    clearBtn.removeEventListener("click", this.clearClickListener);
                    this.clearClickListener = null;
                }
            }
        }
        this.currentData = null;
        this.currentContainer = null;
    }
}
