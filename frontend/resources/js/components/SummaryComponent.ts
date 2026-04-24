import {GameData} from "../types/GameData";
import {formatPlaytime} from "../utils/TimeUtils";

export class SummaryComponent {
    render(data: GameData | null) {
        if (!data || !data.games) return "<p>No data available for summary.</p>";
        const validGames = data.games.filter(game => game !== null);
        if (validGames.length === 0 && data.games.length > 0) {
            return "<div id=\"error-message\"><h2>Error</h2><p>Data contains invalid entries.</p></div>";
        }
        const totalGames = validGames.length;
        const totalPlaytime = validGames.reduce((acc, game) => acc + (game.play_time || 0), 0);
        const completedGames = validGames.filter(game => game.completed === "TRUE" || game.status === "finished").length;
        return `<div id=\"summary-view\"><h2>Summary Dashboard</h2><div class=\"summary-stats\"><div class=\"stat-card\"><span class=\"stat-label\">Total Games</span><span class=\"stat-value\" id=\"total-games-value\">${totalGames}</span></div><div class=\"stat-card\"><span class=\"stat-label\">Total Playtime</span><span class=\"stat-value\" id=\"total-playtime-value\">${formatPlaytime(totalPlaytime)}</span></div><div class=\"stat-card\"><span class=\"stat-label\">Completed</span><span class=\"stat-value\" id=\"completed-games-value\">${completedGames}</span></div></div></div>`;
    }
}
