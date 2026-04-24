import { describe, it, expect } from 'vitest'
import { SummaryComponent } from '../resources/js/components/SummaryComponent'
import { mockData } from './test-utils'

describe('SummaryComponent', () => {
    it('should correctly calculate summary stats', () => {
        const component = new SummaryComponent()
        const html = component.render(mockData)
        document.body.innerHTML = html

        expect(document.getElementById('total-games-value')?.textContent).toBe('2')
        expect(document.getElementById('total-playtime-value')?.textContent).toBe('3 Hr 0 Min')
        expect(document.getElementById('completed-games-value')?.textContent).toBe('1')
    })

    it('should handle missing data', () => {
        const component = new SummaryComponent()
        expect(component.render(null)).toContain('No data available')
    })
})
