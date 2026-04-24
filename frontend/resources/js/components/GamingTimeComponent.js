export class GamingTimeComponent {
    render(data) {
        if (!data || !data.daily_playtime) return '<p>No daily play time data found.</p>';

        const rows = data.daily_playtime.slice(-30).reverse().map(entry => `
            <tr>
                <td>${entry.play_date}</td>
                <td>${this.formatPlaytime(entry.play_time)}</td>
            </tr>
        `).join('');

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

    formatPlaytime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} Hr ${mins} Min`;
    }
}
