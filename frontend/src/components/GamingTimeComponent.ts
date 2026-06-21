import {GameData} from "../types/GameData.js";
import {formatPlaytime} from "../utils/TimeUtils.js";
import {escapeHtml} from "../utils/HtmlUtils.js";

export class GamingTimeComponent {
    render(data: GameData) {
        if (!data || !data.daily_playtime) return "<p>No daily playtime data found.</p>";
        const validData = data.daily_playtime.filter(entry => entry !== null)
            .sort((first, second) => first.play_date.localeCompare(second.play_date));
        if (validData.length === 0) return "<p>No daily playtime data found.</p>";
        const rows = validData.slice(-30).reverse().map(entry => `
            <tr class="daily-row">
                <td class="daily-date">${escapeHtml(entry.play_date)}</td>
                <td class="daily-playtime">${formatPlaytime(entry.play_time)}</td>
            </tr>
        `).join("");
        return `
            <div id="gaming-time-view">
                <h2>Daily Gaming Time (Last 30 Days)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Playtime</th>
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
