import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {GameDetailComponent} from '../src/components/GameDetailComponent';
import {mockData} from './test-utils';
import {GameData} from '../src/types/GameData';

describe('GameDetailComponent', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('should render details for a specific game', () => {
        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(mockData, 'Game A');

        expect(document.getElementById('detail-game-name')?.textContent).toBe('Game A');
        expect(document.getElementById('detail-playtime')?.textContent).toBe('2 Hr 0 Min');
        expect(document.getElementById('detail-sessions')?.textContent).toBe('5');
        expect(document.getElementById('detail-status')?.textContent?.trim()).toBe('In Progress');
        expect(document.getElementById('detail-finish-date')).toBeNull();

        const sessionRows = document.querySelectorAll('.detail-session-row');
        expect(sessionRows.length).toBe(1);
        expect(sessionRows[0].querySelector('.detail-session-start')?.textContent).toBe('01-01-2023 10:00');
        expect(sessionRows[0].querySelector('.detail-session-duration')?.textContent).toBe('30 Min');
    });

    it('shows a finish date only when one was recorded', () => {
        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(mockData, 'Game B');

        expect(document.getElementById('detail-finish-date')?.textContent).toBe('01-09-2026');
    });

    it('should handle game not found', () => {
        const component = new GameDetailComponent();
        const html = component.render(mockData, 'NonExistent');
        expect(html).toContain('Game "NonExistent" not found');
    });

    it('renders hero header with poster image, Steam link, and metadata', () => {
        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(mockData, 'Game A');

        const posterImg = document.querySelector<HTMLImageElement>('#detail-game-icon');
        expect(posterImg).not.toBeNull();
        expect(posterImg?.src).toContain('Game_A.jpg');

        // Poster frame should NOT have a status pill
        const posterPill = document.querySelector('.game-poster-frame .game-status-pill');
        expect(posterPill).toBeNull();

        // Status badge above title should exist
        const heroBadge = document.querySelector('.game-detail-hero-badges #detail-status');
        expect(heroBadge).not.toBeNull();
        expect(heroBadge?.textContent?.trim()).toBe('In Progress');

        // Meta items should NOT have a redundant status line
        const metaLabels = Array.from(document.querySelectorAll('.game-detail-hero-meta .meta-label')).map(el => el.textContent);
        expect(metaLabels).not.toContain('Status:');

        const steamBtn = document.querySelector<HTMLAnchorElement>('.steam-store-btn');
        expect(steamBtn).not.toBeNull();
        expect(steamBtn?.href).toContain('store.steampowered.com/search/?term=Game%20A');
        expect(steamBtn?.target).toBe('_blank');
        expect(steamBtn?.rel).toContain('noopener');

        const backBtn = document.querySelector<HTMLButtonElement>('#game-detail-back-btn');
        expect(backBtn).not.toBeNull();
    });

    it('renders poster fallback initials when icon_path is null', () => {
        const customData: GameData = {
            ...mockData,
            games: [
                {
                    name: 'Super Metroid',
                    play_time: 120,
                    session_count: 2,
                    status: 'completed',
                    completed: 'TRUE',
                    icon_path: null
                }
            ],
            session_history: []
        };

        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(customData, 'Super Metroid');

        const fallback = document.querySelector('.poster-fallback');
        expect(fallback).not.toBeNull();
        expect(fallback?.querySelector('.fallback-initials')?.textContent).toBe('SM');
    });

    it('renders the SVG timeline chart and session breakdown', () => {
        const customData: GameData = {
            ...mockData,
            games: [
                {
                    name: 'Hades',
                    play_time: 300,
                    session_count: 3,
                    status: 'playing',
                    completed: 'FALSE',
                    icon_path: null
                }
            ],
            session_history: [
                {game_name: 'Hades', start_time: 1771631171, duration: 60},
                {game_name: 'Hades', start_time: 1771703524, duration: 120},
                {game_name: 'Hades', start_time: 1771765905, duration: 120}
            ]
        };

        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(customData, 'Hades');

        const timelineSvg = document.querySelector('.session-timeline-svg');
        expect(timelineSvg).not.toBeNull();

        const timelineBars = document.querySelectorAll('.timeline-bar-anim');
        expect(timelineBars.length).toBe(3);

        const breakdownSlots = document.querySelectorAll('.breakdown-slot-item');
        expect(breakdownSlots.length).toBe(4); // Morning, Afternoon, Evening, Night
    });

    it('handles empty session history gracefully in timeline and recent sessions cards', () => {
        const customData: GameData = {
            ...mockData,
            games: [
                {
                    name: 'Empty Game',
                    play_time: 0,
                    session_count: 0,
                    status: 'in progress',
                    completed: 'FALSE',
                    icon_path: null
                }
            ],
            session_history: []
        };

        const component = new GameDetailComponent();
        document.body.innerHTML = component.render(customData, 'Empty Game');

        expect(document.querySelector('.timeline-card .detail-card-empty')).not.toBeNull();
        expect(document.querySelector('.recent-sessions-card .detail-card-empty')).not.toBeNull();
        expect(document.getElementById('detail-playtime')?.textContent).toBe('0 Hr 0 Min');
        expect(document.getElementById('detail-sessions')?.textContent).toBe('0');
    });

    it('attaches and cleans up back navigation in mount() and destroy()', () => {
        const component = new GameDetailComponent();
        const container = document.createElement('div');
        container.innerHTML = component.render(mockData, 'Game A');
        document.body.appendChild(container);

        // When history has entries
        Object.defineProperty(window.history, 'length', {value: 3, configurable: true});
        const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
        });

        component.mount(container);

        const backBtn = container.querySelector<HTMLButtonElement>('#game-detail-back-btn');
        expect(backBtn).not.toBeNull();

        // Simulate click triggers history.back()
        backBtn?.click();
        expect(historyBackSpy).toHaveBeenCalled();

        // Destroy component
        component.destroy();

        historyBackSpy.mockRestore();

        // Fallback when no history entries exist
        Object.defineProperty(window.history, 'length', {value: 1, configurable: true});
        component.mount(container);
        window.location.hash = '#game-detail?name=Game%20A';
        backBtn?.click();
        expect(window.location.hash).toBe('#all-games');
        component.destroy();
    });

    it('handles missing game parameter or empty data gracefully', () => {
        const component = new GameDetailComponent();
        expect(component.render(mockData, null)).toContain('No game was selected');
        expect(component.render(null as any, 'Game A')).toContain('No games found');
    });
});
