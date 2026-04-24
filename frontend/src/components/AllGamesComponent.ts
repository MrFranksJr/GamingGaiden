import {GameData} from "../types/GameData.js";
import {formatPlaytime} from "../utils/TimeUtils.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";

export class AllGamesComponent {
    render(data: GameData) {
        if (!data || !data.games) return "<p>No games found.</p>";
        const validGames = data.games.filter(game => game !== null)
            .sort((first, second) => first.name.localeCompare(second.name, undefined, {sensitivity: "base"}));
        if (validGames.length === 0 && data.games.length === 0) return "<p>No games found.</p>";
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }
        const rows = validGames.map(game => {
            const iconPath = safeCachedImagePath(game.icon_path);
            const iconHtml = iconPath ? `<img src="${escapeHtml(iconPath)}" alt="${escapeHtml(game.name)} icon" class="game-icon" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px;">` : "";
            return `<tr class="game-row"><td class="game-name">${iconHtml}<a href="#game-detail?name=${encodeURIComponent(game.name)}">${escapeHtml(game.name)}</a></td><td class="game-playtime">${formatPlaytime(game.play_time || 0)}</td><td class="game-sessions">${game.session_count}</td><td class="game-status">${escapeHtml(game.status)}</td></tr>`;
        }).join("");
        return `<div id="all-games-view"><table><thead><tr><th>Name</th><th>Playtime</th><th>Sessions</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
}
