import {describe, expect, it} from 'vitest'
import {GamingTimeComponent} from '../resources/js/components/GamingTimeComponent'
import {mockData} from './test-utils'

describe('GamingTimeComponent', () => {
    it('should render daily playtime', () => {
        const component = new GamingTimeComponent()
        document.body.innerHTML = component.render(mockData)

        const rows = document.querySelectorAll('.daily-row')
        // In our mock data we have 2 entries, component does .reverse()
        expect(rows.length).toBe(2)

        expect(rows[0].querySelector('.daily-date')?.textContent).toBe('2023-01-02')
        expect(rows[0].querySelector('.daily-playtime')?.textContent).toBe('1 Hr 0 Min')

        expect(rows[1].querySelector('.daily-date')?.textContent).toBe('2023-01-01')
        expect(rows[1].querySelector('.daily-playtime')?.textContent).toBe('0 Hr 30 Min')
    })
})
