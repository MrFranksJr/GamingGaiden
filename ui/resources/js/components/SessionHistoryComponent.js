export class SessionHistoryComponent {
    render(data) {
        if (!data || !data.session_history) return '<p>No session history found.</p>';

        const rows = data.session_history.slice(-20).reverse().map(session => `
            <tr>
                <td>${session.game_name}</td>
                <td>${session.start_time}</td>
                <td>${session.duration} Min</td>
            </tr>
        `).join('');

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
