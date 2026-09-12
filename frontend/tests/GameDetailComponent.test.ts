import {describe, expect, it} from 'vitest'
import {GameDetailComponent} from '../src/components/GameDetailComponent'
import {mockData} from './test-utils'

describe('GameDetailComponent', () => {
    it('should render details for a specific game', () => {
        const component = new GameDetailComponent()
        document.body.innerHTML = component.render(mockData, 'Game A')

        expect(document.getElementById('detail-game-name')?.textContent).toBe('Game A')
        expect(document.getElementById('detail-playtime')?.textContent).toBe('2 Hr 0 Min')
        expect(document.getElementById('detail-sessions')?.textContent).toBe('5')
        expect(document.getElementById('detail-status')?.textContent).toBe('playing')
        expect(document.getElementById('detail-finish-date')).toBeNull()

        const sessionRows = document.querySelectorAll('.detail-session-row')
        expect(sessionRows.length).toBe(1)
        expect(sessionRows[0].querySelector('.detail-session-start')?.textContent).toBe('2023-01-01 10:00')
        expect(sessionRows[0].querySelector('.detail-session-duration')?.textContent).toBe('30 Min')
    })

    it('shows a finish date only when one was recorded', () => {
        const component = new GameDetailComponent()
        document.body.innerHTML = component.render(mockData, 'Game B')

        expect(document.getElementById('detail-finish-date')?.textContent).toBe('2026-09-01')
    })

    it('should handle game not found', () => {
        const component = new GameDetailComponent()
        const html = component.render(mockData, 'NonExistent')
        expect(html).toContain('Game "NonExistent" not found')
    })
})
