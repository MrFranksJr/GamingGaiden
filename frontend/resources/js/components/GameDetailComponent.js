export class GameDetailComponent {
    render(data, gameName) {
        if (!data || !data.games) return '<p>No games found.</p>';
        
        const game = data.games.find(g => g.name === gameName);
        if (!game) return `<p>Game "${gameName}" not found.</p>`;

        const sessions = data.session_history.filter(s => s.game_name === gameName).reverse();
        const sessionRows = sessions.map(s => `
            <tr>
                <td>${s.start_time}</td>
                <td>${s.duration} Min</td>
            </tr>
        `).join('');

        return `
            <div id="game-detail-view">
                <button onclick="window.location.hash='#all-games'">Back to List</button>
                <h2>${game.name}</h2>
                <div class="game-info">
                    <p><strong>Total Playtime:</strong> ${this.formatPlaytime(game.play_time)}</p>
                    <p><strong>Sessions:</strong> ${game.session_count}</p>
                    <p><strong>Status:</strong> ${game.status}</p>
                    <p><strong>Last Played:</strong> ${game.last_play_date}</p>
                </div>
                <h3>Session History</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Start Time</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessionRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    formatPlaytime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} Hr ${mins} Min`;
    }
}
