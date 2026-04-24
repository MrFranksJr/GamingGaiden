import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Router } from '../resources/js/app'
import { SummaryComponent } from '../resources/js/components/SummaryComponent'
import { AllGamesComponent } from '../resources/js/components/AllGamesComponent'
import { GameDetailComponent } from '../resources/js/components/GameDetailComponent'
import { mockData } from './test-utils'

describe('Router', () => {
    let container: HTMLElement
    let router: Router

    beforeEach(() => {
        document.body.innerHTML = '<div id="view-container"></div>'
        container = document.getElementById('view-container')!
        window.location.hash = ''

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData)
        })
    })

    it('should load data and render default route', async () => {
        const routes = {
            '#summary': { name: 'summary', component: SummaryComponent }
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async init

        expect(container.innerHTML).toContain('Summary Dashboard')
    })

    it('should handle route change', async () => {
        const routes = {
            '#summary': { name: 'summary', component: SummaryComponent },
            '#all-games': { name: 'all-games', component: AllGamesComponent }
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        window.location.hash = '#all-games'
        router.handleRoute()

        expect(container.innerHTML).toContain('Name</th>')
    })

    it('should handle dynamic routes with params', async () => {
        const routes = {
            '#summary': { name: 'summary', component: SummaryComponent },
            '#game-detail': { name: 'game-detail', component: GameDetailComponent }
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        window.location.hash = '#game-detail?name=Game%20A'
        router.handleRoute()

        expect(document.getElementById('detail-game-name')?.textContent).toBe('Game A')
    })
})
