import {GameData} from "../types/GameData";
import {formatPlaytime} from "../utils/TimeUtils";

export class AllGamesComponent {
    render(data: GameData) {
        if (!data || !data.games) return "<p>No games found.</p>";
        const validGames = data.games.filter(game => game !== null);
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }
        const rows = validGames.map(game => {
            const iconHtml = game.icon_path ? `<img src="${game.icon_path}" alt="${game.name} icon" class="game-icon" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px;">` : "";
            return `<tr class="game-row"><td class="game-name">${iconHtml}<a href="#game-detail?name=${encodeURIComponent(game.name)}">${game.name}</a></td><td class="game-playtime">${formatPlaytime(game.play_time || 0)}</td><td class="game-sessions">${game.session_count}</td><td class="game-status">${game.status}</td></tr>`;
        }).join("");
        return `<div id="all-games-view"><table><thead><tr><th>Name</th><th>Playtime</th><th>Sessions</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
}
