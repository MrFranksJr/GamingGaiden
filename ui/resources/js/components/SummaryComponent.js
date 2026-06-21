export class SummaryComponent {
    render(data) {
        if (!data || !data.games) return '<p>No data available for summary.</p>';

        const totalGames = data.games.length;
        const totalPlaytime = data.games.reduce((acc, game) => acc + (game.play_time || 0), 0);
        const completedGames = data.games.filter(game => game.completed === 'TRUE' || game.status === 'finished').length;

        return `
            <div id="summary-view">
                <h2>Summary Dashboard</h2>
                <div class="summary-stats">
                    <div class="stat-card">
                        <span class="stat-label">Total Games</span>
                        <span class="stat-value">${totalGames}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Total Playtime</span>
                        <span class="stat-value">${this.formatPlaytime(totalPlaytime)}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value">${completedGames}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatPlaytime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} Hr ${mins} Min`;
    }
}
