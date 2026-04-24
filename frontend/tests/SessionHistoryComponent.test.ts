import {describe, expect, it} from 'vitest'
import {SessionHistoryComponent} from '../resources/js/components/SessionHistoryComponent'
import {mockData} from './test-utils'

describe('SessionHistoryComponent', () => {
    it('should render recent sessions', () => {
        const component = new SessionHistoryComponent()
        document.body.innerHTML = component.render(mockData)

        const rows = document.querySelectorAll('.session-row')
        expect(rows.length).toBe(2)

        // Reversed order in mockData: Game B is second in array, so first in rendered list
        expect(rows[0].querySelector('.session-game')?.textContent).toBe('Game B')
        expect(rows[0].querySelector('.session-start')?.textContent).toBe('2023-01-02 11:00')
        expect(rows[0].querySelector('.session-duration')?.textContent).toBe('60 Min')

        expect(rows[1].querySelector('.session-game')?.textContent).toBe('Game A')
        expect(rows[1].querySelector('.session-start')?.textContent).toBe('2023-01-01 10:00')
        expect(rows[1].querySelector('.session-duration')?.textContent).toBe('30 Min')
    })
})
