import {describe, expect, it} from 'vitest'
import {GameDetailComponent} from '../resources/js/components/GameDetailComponent'
import {mockData} from './test-utils'

describe('GameDetailComponent', () => {
    it('should render details for a specific game', () => {
        const component = new GameDetailComponent()
        document.body.innerHTML = component.render(mockData, 'Game A')

        expect(document.getElementById('detail-game-name')?.textContent).toBe('Game A')
        expect(document.getElementById('detail-playtime')?.textContent).toBe('2 Hr 0 Min')
        expect(document.getElementById('detail-sessions')?.textContent).toBe('5')
        expect(document.getElementById('detail-status')?.textContent).toBe('playing')

        const sessionRows = document.querySelectorAll('.detail-session-row')
        expect(sessionRows.length).toBe(1)
        expect(sessionRows[0].querySelector('.detail-session-start')?.textContent).toBe('2023-01-01 10:00')
        expect(sessionRows[0].querySelector('.detail-session-duration')?.textContent).toBe('30 Min')
    })

    it('should handle game not found', () => {
        const component = new GameDetailComponent()
        const html = component.render(mockData, 'NonExistent')
        expect(html).toContain('Game "NonExistent" not found')
    })
})
