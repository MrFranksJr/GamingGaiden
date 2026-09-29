import {GameData} from "../types/GameData.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";
import {formatPlaytime} from "../utils/TimeUtils.js";
import {
    RigDetail,
    RigGameRow,
    RigSummary,
    buildRigDetail,
    buildRigList
} from "../utils/RigStatsCalculator.js";

function rigInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function rigIconHtml(iconPath: string | null, name: string): string {
    const safe = safeCachedImagePath(iconPath);
    if (safe) {
        return `<div class="rig-hero-icon"><img src="${escapeHtml(safe)}" alt="${escapeHtml(name)}" class="rig-hero-img"></div>`;
    }
    return `<div class="rig-hero-icon"><div class="rig-icon-fallback"><i class="fa-solid fa-computer"></i><span class="rig-icon-initials">${escapeHtml(rigInitials(name))}</span></div></div>`;
}

function gamePosterHtml(iconPath: string | null, name: string): string {
    const safe = safeCachedImagePath(iconPath);
    if (safe) {
        return `<div class="game-poster-frame games-played-poster"><img src="${escapeHtml(safe)}" alt="${escapeHtml(name)}" class="game-poster-img"></div>`;
    }
    return `<div class="game-poster-frame games-played-poster"><div class="poster-fallback"><span class="fallback-initials">${escapeHtml(rigInitials(name))}</span><span class="fallback-icon">🎮</span></div></div>`;
}

export class MyRigsComponent {
    render(data: GameData, parameter?: string | null): string {
        const rigs = buildRigList(data);
        if (rigs.length === 0) {
            return this.renderEmptyState();
        }

        const params = new URLSearchParams(parameter ?? "");
        const requested = params.get("rig");
        const selectedName = requested && rigs.some(r => r.name === requested)
            ? requested
            : rigs[0].name;

        const detail = buildRigDetail(data, selectedName);
        if (!detail) {
            return this.renderEmptyState();
        }

        return `
            <div id="my-rigs-view" class="my-rigs-page">
                <header class="my-rigs-header">
                    <h1>My Rigs</h1>
                    <p class="my-rigs-subtitle">The machines you game on, and what they've earned their keep with.</p>
                </header>
                ${this.renderSwitcher(rigs, selectedName)}
                ${this.renderDetail(detail)}
            </div>
        `;
    }

    private renderEmptyState(): string {
        return `
            <div id="my-rigs-view" class="my-rigs-page">
                <div class="rig-empty-state">
                    <i class="fa-solid fa-computer"></i>
                    <h2>No rigs recorded yet</h2>
                    <p>Add a gaming PC in the desktop app to see it here.</p>
                </div>
            </div>
        `;
    }

    private renderSwitcher(rigs: RigSummary[], selectedName: string): string {
        if (rigs.length < 2) return "";
        const chips = rigs.map(rig => `
            <a class="rig-chip ${rig.name === selectedName ? "active" : ""}"
               href="#my-rigs?rig=${encodeURIComponent(rig.name)}">
                <i class="fa-solid fa-computer"></i>
                <span class="rig-chip-name">${escapeHtml(rig.name)}</span>
                ${rig.isInUse ? `<span class="rig-chip-dot" title="In use"></span>` : ""}
            </a>
        `).join("");
        return `<nav class="rig-switcher" aria-label="Select a rig">${chips}</nav>`;
    }

    private renderDetail(detail: RigDetail): string {
        const statusClass = detail.isInUse ? "in-use" : "retired";
        const statusLabel = detail.isInUse ? "In use" : "Retired";
        const lifespanIcon = detail.isInUse ? "fa-clock" : "fa-calendar-check";
        const lifespan = detail.lifespan.label
            ? `<span class="rig-hero-lifespan"><i class="fa-solid ${lifespanIcon}"></i>${escapeHtml(detail.lifespan.label)}</span>`
            : "";

        return `
            <div class="rig-detail">
                <div class="rig-hero">
                    ${rigIconHtml(detail.iconPath, detail.name)}
                    <div class="rig-hero-info">
                        <div class="rig-hero-top">
                            <h2 class="rig-hero-name">${escapeHtml(detail.name)}</h2>
                            <span class="rig-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
                        </div>
                        ${lifespan}
                    </div>
                </div>
                ${this.renderStatCards(detail)}
                ${this.renderGames(detail.games)}
            </div>
        `;
    }

    private renderStatCards(detail: RigDetail): string {
        // Cost card: raw total is the headline; cost-per-hour is a sub-line when
        // it is meaningful. This keeps the total visible (what the rig cost) while
        // still surfacing the fun per-hour value.
        const costSub = detail.cost.perHourFormatted
            ? `<span class="stat-subline">${escapeHtml(detail.cost.perHourFormatted)}</span>`
            : "";

        const cards = [
            {icon: "fa-clock", value: escapeHtml(formatPlaytime(detail.totalPlayTimeMinutes)), label: "Total Playtime", sub: ""},
            {icon: "fa-gamepad", value: String(detail.gamesPlayed), label: "Games Played", sub: ""},
            {icon: "fa-play", value: String(detail.sessionCount), label: "Total Sessions", sub: ""},
            {icon: "fa-coins", value: escapeHtml(detail.cost.formatted), label: "Cost", sub: costSub}
        ];

        const body = cards.map(card => `
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-label">${escapeHtml(card.label)}</span>
                    <div class="stat-icon-badge"><i class="fa-solid ${escapeHtml(card.icon)}"></i></div>
                </div>
                <div class="stat-card-body">
                    <span class="stat-value">${card.value}</span>
                    ${card.sub}
                </div>
            </div>
        `).join("");

        return `<div class="rig-stats-grid">${body}</div>`;
    }

    private renderGames(games: RigGameRow[]): string {
        if (games.length === 0) {
            return `
                <div class="rig-games">
                    <h3 class="rig-games-title">Games on this rig</h3>
                    <p class="rig-games-empty">No games are tagged to this rig yet.</p>
                </div>
            `;
        }
        const rows = games.map(game => {
            const barStyle = ["--bar-width:", String(game.percentage), "%;--bar-color:", escapeHtml(game.color)].join("");
            return `
            <a class="session-games-played-row" href="${escapeHtml(game.detailHref)}">
                ${gamePosterHtml(game.iconPath, game.gameName)}
                <div class="games-played-info">
                    <div class="games-played-top">
                        <span class="games-played-name">${escapeHtml(game.gameName)}</span>
                        <span class="games-played-time">${escapeHtml(game.formatted)}</span>
                    </div>
                    <div class="games-played-bar-track">
                        <div class="games-played-bar-fill" style="${barStyle}"></div>
                    </div>
                </div>
                <span class="games-played-pct">${game.percentage}%</span>
            </a>
        `;
        }).join("");
        return `
            <div class="rig-games">
                <h3 class="rig-games-title">Games on this rig</h3>
                ${rows}
            </div>
        `;
    }
}
