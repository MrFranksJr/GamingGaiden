import {GameData} from "../types/GameData.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";

function getGameInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

export class AllGamesComponent {
    render(data: GameData) {
        if (!data || !data.games) return "<p>No games found.</p>";
        const validGames = data.games.filter(game => game !== null)
            .sort((first, second) => first.name.localeCompare(second.name, undefined, {sensitivity: "base"}));
        if (validGames.length === 0 && data.games.length === 0) return "<p>No games found.</p>";
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }
        const cards = validGames.map(game => {
            const iconPath = safeCachedImagePath(game.icon_path);
            const posterHtml = iconPath
                ? `<img src="${escapeHtml(iconPath)}" alt="${escapeHtml(game.name)} cover" class="game-poster-img" loading="lazy">`
                : `<div class="poster-fallback" aria-hidden="true"><span class="fallback-icon">🎮</span><span class="fallback-initials">${escapeHtml(getGameInitials(game.name))}</span></div>`;
            return `<a href="#game-detail?name=${encodeURIComponent(game.name)}" class="game-card" title="${escapeHtml(game.name)}"><div class="game-poster-frame">${posterHtml}</div><div class="game-card-title">${escapeHtml(game.name)}</div></a>`;
        }).join("");
        return `<div id="all-games-view"><div id="all-games-grid">${cards}</div></div>`;
    }
}
