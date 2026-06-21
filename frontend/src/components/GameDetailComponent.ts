import {GameData} from "../types/GameData.js";
import {formatPlaytime, toSortableTimestamp} from "../utils/TimeUtils.js";
import {escapeHtml, safeCachedImagePath} from "../utils/HtmlUtils.js";

export class GameDetailComponent {
    render(data: GameData, gameName?: string | null) {
        if (!data || !data.games) return "<p>No games found.</p>";
        if (!gameName) return "<p>No game was selected.</p>";
        const validGames = data.games.filter(g => g !== null);
        const game = validGames.find(g => g.name === gameName);
        if (!game) return `<p>Game "${escapeHtml(gameName)}" not found.</p>`;
        const validSessions = (data.session_history || []).filter(s => s !== null);
        const sessions = validSessions.filter(s => s.game_name === gameName)
            .sort((first, second) => toSortableTimestamp(second.start_time) - toSortableTimestamp(first.start_time));
        const sessionRows = sessions.map(s => `<tr class="detail-session-row"><td class="detail-session-start">${escapeHtml(s.start_time)}</td><td class="detail-session-duration">${s.duration} Min</td></tr>`).join("");
        const iconPath = safeCachedImagePath(game.icon_path);
        const iconHtml = iconPath ? `<img src="${escapeHtml(iconPath)}" alt="${escapeHtml(game.name)} icon" id="detail-game-icon" style="width: 64px; height: 64px; margin-bottom: 10px;">` : "";
        return `<div id="game-detail-view"><a href="#all-games" class="back-link">Back to List</a>${iconHtml}<h2 id="detail-game-name">${escapeHtml(game.name)}</h2><div class="game-info"><p><strong>Total Playtime:</strong> <span id="detail-playtime">${formatPlaytime(game.play_time || 0)}</span></p><p><strong>Sessions:</strong> <span id="detail-sessions">${game.session_count}</span></p><p><strong>Status:</strong> <span id="detail-status">${escapeHtml(game.status)}</span></p><p><strong>Last Played:</strong> <span id="detail-last-played">${escapeHtml(game.last_play_date || "N/A")}</span></p></div><h3>Session History</h3><table><thead><tr><th>Start Time</th><th>Duration</th></tr></thead><tbody>${sessionRows}</tbody></table></div>`;
    }
}
