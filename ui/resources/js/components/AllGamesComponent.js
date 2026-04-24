export class AllGamesComponent {
    render(data) {
        if (!data || !data.games) return '<p>No games found.</p>';

        const rows = data.games.map(game => `
            <tr>
                <td>${game.name}</td>
                <td>${this.formatPlaytime(game.play_time)}</td>
                <td>${game.session_count}</td>
                <td>${game.status}</td>
            </tr>
        `).join('');

        return `
            <div id="all-games-view">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Playtime</th>
                            <th>Sessions</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
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
