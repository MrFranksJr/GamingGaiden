import {GameData} from "../types/GameData.js";
import {escapeHtml} from "../utils/HtmlUtils.js";
import {toSortableTimestamp} from "../utils/TimeUtils.js";

export class SessionHistoryComponent {
    render(data: GameData) {
        if (!data || !data.session_history) return "<p>No session history was found.</p>";
        const validSessions = data.session_history.filter(session => session !== null)
            .sort((first, second) => toSortableTimestamp(first.start_time) - toSortableTimestamp(second.start_time));
        if (validSessions.length === 0) return "<p>No session history was found.</p>";
        const rows = validSessions.slice(-20).reverse().map(session => `
            <tr class="session-row">
                <td class="session-game">${escapeHtml(session.game_name)}</td>
                <td class="session-start">${escapeHtml(session.start_time)}</td>
                <td class="session-duration">${session.duration} Min</td>
            </tr>
        `).join("");
        return `
            <div id="session-history-view">
                <h2>Recent Session History</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Game</th>
                            <th>Start Time</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
}
