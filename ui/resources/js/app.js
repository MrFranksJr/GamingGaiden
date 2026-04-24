import { AllGamesComponent } from './components/AllGamesComponent.js';
import { SummaryComponent } from './components/SummaryComponent.js';
import { SessionHistoryComponent } from './components/SessionHistoryComponent.js';

/**
 * Basic Router for Gaming Gaiden SPA
 */
class Router {
    constructor(routes) {
        this.routes = routes;
        this.container = document.getElementById('view-container');
        this.data = null;
        window.addEventListener('hashchange', () => this.handleRoute());
        this.init();
    }

    async init() {
        await this.loadData();
        this.handleRoute();
    }

    async loadData() {
        try {
            const response = await fetch('./resources/data.json');
            this.data = await response.json();
        } catch (error) {
            console.error('Failed to load game data:', error);
            this.container.innerHTML = '<p>Error loading data. Please ensure the app is running correctly.</p>';
        }
    }

    handleRoute() {
        const hash = window.location.hash || '#summary';
        const route = this.routes[hash] || this.routes['#summary'];
        this.render(route);
    }

    async render(route) {
        if (this.container) {
            if (route.component) {
                const component = new route.component();
                this.container.innerHTML = component.render(this.data);
            } else {
                this.container.innerHTML = `<h1>${route.title}</h1><p>Rendering ${route.name}...</p>`;
            }
        }
    }
}

const routes = {
    '#summary': { name: 'summary', title: 'Summary Dashboard', component: SummaryComponent },
    '#all-games': { name: 'all-games', title: 'All Games', component: AllGamesComponent },
    '#gaming-time': { name: 'gaming-time', title: 'Time Spent Gaming' },
    '#session-history': { name: 'session-history', title: 'Session History', component: SessionHistoryComponent }
};

document.addEventListener('DOMContentLoaded', () => {
    new Router(routes);
});
