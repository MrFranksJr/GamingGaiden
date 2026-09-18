import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    applyTheme,
    getResolvedTheme,
    getSystemTheme,
    getThemePreference,
    initThemeManager,
    setThemePreference,
    THEME_STORAGE_KEY,
    updateThemeUI
} from '../src/utils/ThemeManager';

describe('ThemeManager', () => {
    let matchMediaListeners: Array<(e: MediaQueryListEvent) => void> = [];
    let matchesDark = true;

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-theme-preference');
        matchMediaListeners = [];
        matchesDark = true;

        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: matchesDark,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((event: string, listener: any) => {
                if (event === 'change') {
                    matchMediaListeners.push(listener);
                }
            }),
            removeEventListener: vi.fn((event: string, listener: any) => {
                if (event === 'change') {
                    matchMediaListeners = matchMediaListeners.filter(l => l !== listener);
                }
            }),
            dispatchEvent: vi.fn()
        }));

        document.body.innerHTML = `
            <div id="sidebar-footer">
                <div id="theme-switcher">
                    <i id="theme-icon" class="fa-solid fa-desktop"></i>
                    <select id="theme-select">
                        <option value="system">System</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                    </select>
                </div>
            </div>
        `;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns system as default theme preference when nothing is stored', () => {
        expect(getThemePreference()).toBe('system');
    });

    it('reads valid theme preferences from localStorage', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        expect(getThemePreference()).toBe('dark');

        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        expect(getThemePreference()).toBe('light');

        localStorage.setItem(THEME_STORAGE_KEY, 'system');
        expect(getThemePreference()).toBe('system');
    });

    it('falls back to system for invalid stored values', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'invalid_theme');
        expect(getThemePreference()).toBe('system');
    });

    it('detects system theme from matchMedia', () => {
        matchesDark = true;
        expect(getSystemTheme()).toBe('dark');

        matchesDark = false;
        expect(getSystemTheme()).toBe('light');
    });

    it('resolves effective theme according to preference and system state', () => {
        matchesDark = true;
        expect(getResolvedTheme('system')).toBe('dark');
        expect(getResolvedTheme('dark')).toBe('dark');
        expect(getResolvedTheme('light')).toBe('light');

        matchesDark = false;
        expect(getResolvedTheme('system')).toBe('light');
        expect(getResolvedTheme('dark')).toBe('dark');
        expect(getResolvedTheme('light')).toBe('light');
    });

    it('applies theme attributes to documentElement and updates UI', () => {
        matchesDark = true;
        const resolved = applyTheme('dark');
        expect(resolved).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme-preference')).toBe('dark');

        const select = document.getElementById('theme-select') as HTMLSelectElement;
        expect(select.value).toBe('dark');

        const icon = document.getElementById('theme-icon');
        expect(icon?.className).toBe('fa-solid fa-moon');
    });

    it('updates icon properly for system, dark, and light modes', () => {
        updateThemeUI('system', 'dark');
        expect(document.getElementById('theme-icon')?.className).toBe('fa-solid fa-desktop');

        updateThemeUI('dark', 'dark');
        expect(document.getElementById('theme-icon')?.className).toBe('fa-solid fa-moon');

        updateThemeUI('light', 'light');
        expect(document.getElementById('theme-icon')?.className).toBe('fa-solid fa-sun');
    });

    it('saves preference to localStorage in setThemePreference', () => {
        setThemePreference('light');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        setThemePreference('dark');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('initializes theme manager and responds to dropdown change', () => {
        const cleanup = initThemeManager();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark'); // system default with dark match

        const select = document.getElementById('theme-select') as HTMLSelectElement;
        select.value = 'light';
        select.dispatchEvent(new Event('change'));

        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        cleanup();
    });

    it('responds dynamically to OS media query changes when in system mode', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'system');
        const cleanup = initThemeManager();

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

        // Simulate OS switching to light mode
        matchesDark = false;
        matchMediaListeners.forEach(l => l({matches: false} as any));

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        // Simulate OS switching back to dark mode
        matchesDark = true;
        matchMediaListeners.forEach(l => l({matches: true} as any));

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

        cleanup();
    });

    it('does not change theme on OS media change when an explicit theme is selected', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        const cleanup = initThemeManager();

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        // Simulate OS switching to dark mode
        matchesDark = true;
        matchMediaListeners.forEach(l => l({matches: true} as any));

        // Still light because user explicitly picked light
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        cleanup();
    });
});
