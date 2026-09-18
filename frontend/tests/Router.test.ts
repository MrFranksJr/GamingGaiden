import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Router, SIDEBAR_COLLAPSED_STORAGE_KEY} from '../src/app'
import {SummaryComponent} from '../src/components/SummaryComponent'
import {AllGamesComponent} from '../src/components/AllGamesComponent'
import {GameDetailComponent} from '../src/components/GameDetailComponent'
import {mockData} from './test-utils'

describe('Router', () => {
    let container: HTMLElement
    let router: Router

    beforeEach(() => {
        localStorage.clear()
        document.body.innerHTML = `
            <div id="app">
                <aside id="sidebar-nav">
                    <div class="sidebar-header">
                        <img src="../resources/images/favicon.ico" alt="Gaming Gaiden Logo" class="app-logo"/>
                        <h1 class="app-title">Gaming Gaiden</h1>
                        <button id="sidebar-toggle" class="sidebar-toggle-btn" aria-label="Toggle navigation sidebar" aria-expanded="true" title="Collapse sidebar">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                    </div>
                    <nav class="sidebar-menu" id="sidebar-menu">
                        <div class="nav-indicator" id="nav-indicator"></div>
                        <a href="#summary" class="nav-link" data-route="#summary" title="Summary Dashboard">
                            <span class="nav-icon"><i class="fa-solid fa-clipboard-list"></i></span>
                            <span class="nav-label">Summary</span>
                        </a>
                        <a href="#all-games" class="nav-link" data-route="#all-games" title="All Games">
                            <span class="nav-icon"><i class="fa-solid fa-gamepad"></i></span>
                            <span class="nav-label">All Games</span>
                            <span class="nav-badge games-count" id="sidebar-games-count">0</span>
                        </a>
                    </nav>
                </aside>
                <main id="main-content">
                    <div id="view-container"></div>
                    <div style="display:none">
                        <div id="summary"></div>
                        <div id="all-games"></div>
                    </div>
                </main>
            </div>
        `
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
        localStorage.clear()
        delete window.gamingGaidenData
        delete window.gamingGaidenInitialRoute
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('should render initial route from window.gamingGaidenInitialRoute when hash is empty', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }
        window.gamingGaidenInitialRoute = '#all-games'

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(container.innerHTML).toContain('id="all-games-grid"')
        expect(container.querySelectorAll('.game-card')).toHaveLength(2)
        const allGamesLink = document.querySelector<HTMLAnchorElement>('a[href="#all-games"]')!
        expect(allGamesLink.classList.contains('active')).toBe(true)
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

        expect(container.innerHTML).toContain('id="all-games-grid"')
        expect(container.querySelectorAll('.game-card')).toHaveLength(2)
    })

    it('should synchronize active class on sidebar navigation and update game count', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const summaryLink = document.querySelector<HTMLAnchorElement>('a[href="#summary"]')!
        const allGamesLink = document.querySelector<HTMLAnchorElement>('a[href="#all-games"]')!
        const badge = document.getElementById('sidebar-games-count')

        expect(badge?.textContent).toBe('2')
        expect(summaryLink.classList.contains('active')).toBe(true)
        expect(allGamesLink.classList.contains('active')).toBe(false)

        window.location.hash = '#all-games'
        router.handleRoute()

        expect(summaryLink.classList.contains('active')).toBe(false)
        expect(allGamesLink.classList.contains('active')).toBe(true)
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

    it('should toggle sidebar collapsed state and update aria attributes on button click', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const sidebar = document.getElementById('sidebar-nav')!
        const toggleBtn = document.getElementById('sidebar-toggle')!
        const toggleIcon = toggleBtn.querySelector('.fa-bars')!

        expect(sidebar.classList.contains('collapsed')).toBe(false)
        expect(toggleBtn.getAttribute('aria-expanded')).toBe('true')
        expect(toggleBtn.getAttribute('title')).toBe('Collapse sidebar')
        expect(toggleIcon).not.toBeNull()

        // Click to collapse
        toggleBtn.click()

        expect(sidebar.classList.contains('collapsed')).toBe(true)
        expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
        expect(toggleBtn.getAttribute('title')).toBe('Expand sidebar')
        expect(toggleBtn.querySelector('.fa-bars')).not.toBeNull()
        expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true')

        // Click to expand again
        toggleBtn.click()

        expect(sidebar.classList.contains('collapsed')).toBe(false)
        expect(toggleBtn.getAttribute('aria-expanded')).toBe('true')
        expect(toggleBtn.getAttribute('title')).toBe('Collapse sidebar')
        expect(toggleBtn.querySelector('.fa-bars')).not.toBeNull()
        expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false')
    })

    it('should restore collapsed sidebar state from localStorage upon initialization', async () => {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true')

        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const sidebar = document.getElementById('sidebar-nav')!
        const toggleBtn = document.getElementById('sidebar-toggle')!
        const toggleIcon = toggleBtn.querySelector('.fa-bars')!

        expect(sidebar.classList.contains('collapsed')).toBe(true)
        expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
        expect(toggleBtn.getAttribute('title')).toBe('Expand sidebar')
        expect(toggleIcon).not.toBeNull()
    })

    it('should preserve title tooltip attributes on navigation links for collapsed mode', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const summaryLink = document.querySelector<HTMLAnchorElement>('a[href="#summary"]')!
        const allGamesLink = document.querySelector<HTMLAnchorElement>('a[href="#all-games"]')!

        expect(summaryLink.getAttribute('title')).toBe('Summary Dashboard')
        expect(allGamesLink.getAttribute('title')).toBe('All Games')
    })

    it('should synchronize animated active indicator transform on route transitions', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const indicator = document.getElementById('nav-indicator')!
        const allGamesLink = document.querySelector<HTMLAnchorElement>('a[href="#all-games"]')!
        Object.defineProperty(allGamesLink, 'offsetTop', {configurable: true, value: 44})
        Object.defineProperty(allGamesLink, 'offsetHeight', {configurable: true, value: 36})

        expect(indicator.style.opacity).toBe('1')

        window.location.hash = '#all-games'
        router.handleRoute()

        expect(indicator.style.transform).toBe('translateY(44px)')
        expect(indicator.style.height).toBe('36px')
        expect(indicator.style.opacity).toBe('1')
    })

    it('should re-synchronize indicator position and height on transitionend events', async () => {
        const routes = {
            '#summary': {name: 'summary', component: SummaryComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        const sidebar = document.getElementById('sidebar-nav')!
        const indicator = document.getElementById('nav-indicator')!
        const summaryLink = document.querySelector<HTMLAnchorElement>('a[href="#summary"]')!

        Object.defineProperty(summaryLink, 'offsetTop', {configurable: true, value: 0})
        Object.defineProperty(summaryLink, 'offsetHeight', {configurable: true, value: 38})

        const transitionEvent = new Event('transitionend') as any
        transitionEvent.propertyName = 'width'
        sidebar.dispatchEvent(transitionEvent)

        expect(indicator.style.height).toBe('38px')
    })

    it('should call mount and destroy lifecycle methods on components during navigation', async () => {
        let mounted = false
        let destroyed = false

        class LifecycleComponent {
            render() {
                return '<div id="lifecycle-view">Lifecycle</div>'
            }

            mount() {
                mounted = true
            }

            destroy() {
                destroyed = true
            }
        }

        const routes = {
            '#summary': {name: 'summary', component: LifecycleComponent as any},
            '#all-games': {name: 'all-games', component: AllGamesComponent}
        }

        router = new Router(routes)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(mounted).toBe(true)
        expect(destroyed).toBe(false)

        window.location.hash = '#all-games'
        router.handleRoute()

        expect(destroyed).toBe(true)
    })
})
