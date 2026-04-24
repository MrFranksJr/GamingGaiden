import {describe, expect, it} from 'vitest'
import {AllGamesComponent} from '../resources/js/components/AllGamesComponent'
import {mockData} from './test-utils'

describe('AllGamesComponent', () => {
    it('should render a list of games', () => {
        const component = new AllGamesComponent()
        document.body.innerHTML = component.render(mockData)

        const rows = document.querySelectorAll('.game-row')
        expect(rows.length).toBe(2)

        const firstRow = rows[0]
        expect(firstRow.querySelector('.game-name')?.textContent).toBe('Game A')
        expect(firstRow.querySelector('.game-playtime')?.textContent).toBe('2 Hr 0 Min')
        expect(firstRow.querySelector('.game-sessions')?.textContent).toBe('5')
        expect(firstRow.querySelector('.game-status')?.textContent).toBe('playing')

        const secondRow = rows[1]
        expect(secondRow.querySelector('.game-name')?.textContent).toBe('Game B')
        expect(secondRow.querySelector('.game-playtime')?.textContent).toBe('1 Hr 0 Min')
        expect(secondRow.querySelector('.game-sessions')?.textContent).toBe('2')
        expect(secondRow.querySelector('.game-status')?.textContent).toBe('finished')
    })
})
