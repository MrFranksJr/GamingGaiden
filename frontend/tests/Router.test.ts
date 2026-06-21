import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Router} from '../src/app'
import {SummaryComponent} from '../src/components/SummaryComponent'
import {AllGamesComponent} from '../src/components/AllGamesComponent'
import {GameDetailComponent} from '../src/components/GameDetailComponent'
import {mockData} from './test-utils'

describe('Router', () => {
    let container: HTMLElement
    let router: Router

    beforeEach(() => {
        document.body.innerHTML = '<div id="view-container"></div>'
        container = document.getElementById('view-container')!
        window.location.hash = ''

        // Mock fetch using Vitest's stubGlobal
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData)
        }))
    })

    afterEach(() => {
        router?.destroy()
        delete window.gamingGaidenData
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('should load data and render default route', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async init

        expect(container.innerHTML).toContain('Summary Dashboard')
    })

    it('should prefer data loaded by data.js without using fetch', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }
        window.gamingGaidenData = mockData

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(fetch).not.toHaveBeenCalled()
        expect(container.innerHTML).toContain('Summary Dashboard')
    })

    it('should handle route change', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        window.location.hash = '#all-games'
        router.handleRoute()

        expect(container.innerHTML).toContain('Name</th>')
    })

    it('should handle dynamic routes with params', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#game-detail': {name: 'game-detail', component: GameDetailComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        window.location.hash = '#game-detail?name=Game%20A'
        router.handleRoute()

        expect(document.getElementById('detail-game-name')?.textContent).toBe('Game A')
    })

    it('should show a visible error for an unknown route', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))
        window.location.hash = '#does-not-exist'
        router.handleRoute()

        expect(container.textContent).toContain('Page not found: #does-not-exist')
    })

    it('should show a visible validation error for malformed exported data', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({games: []})
        }))
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(container.textContent).toContain('Data field "session_history" must be an array.')
    })

    it('should keep a visible error when loading the export fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('disk read failed')))
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(container.textContent).toContain('Failed to load data: disk read failed')
    })

    it('should render an explicit state when a detail route has no game name', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#game-detail': {name: 'game-detail', component: GameDetailComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))
        window.location.hash = '#game-detail'
        router.handleRoute()

        expect(container.textContent).toContain('No game was selected.')
    })
})
