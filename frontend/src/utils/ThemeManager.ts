export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'gaming_gaiden_theme';

/**
 * Reads the saved theme preference from localStorage.
 * Defaults to 'system' if not set or invalid.
 */
export function getThemePreference(): ThemePreference {
    if (typeof localStorage === 'undefined') {
        return 'system';
    }
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
            return stored;
        }
    } catch {
        // Fallback on storage errors
    }
    return 'system';
}

/**
 * Determines whether the user's operating system prefers dark mode.
 */
export function getSystemTheme(): ResolvedTheme {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
    }
    return 'dark'; // Default fallback
}

/**
 * Computes the effective resolved theme ('dark' or 'light') based on the preference.
 */
export function getResolvedTheme(preference: ThemePreference = getThemePreference()): ResolvedTheme {
    if (preference === 'system') {
        return getSystemTheme();
    }
    return preference;
}

/**
 * Updates the theme switcher UI icon and select element if present in the DOM.
 */
export function updateThemeUI(preference: ThemePreference, resolved: ResolvedTheme): void {
    if (typeof document === 'undefined') return;

    const select = document.getElementById('theme-select') as HTMLSelectElement | null;
    if (select && select.value !== preference) {
        select.value = preference;
    }

    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = '';
        if (preference === 'system') {
            icon.className = 'fa-solid fa-desktop';
        } else if (preference === 'dark') {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
    }

    const switcher = document.getElementById('theme-switcher');
    if (switcher) {
        const prefLabel = preference.charAt(0).toUpperCase() + preference.slice(1);
        const resLabel = resolved.charAt(0).toUpperCase() + resolved.slice(1);
        switcher.setAttribute(
            'title',
            preference === 'system'
                ? `Theme: System (${resLabel})`
                : `Theme: ${prefLabel}`
        );
    }
}

/**
 * Applies the given theme preference to the DOM and optionally saves it to localStorage.
 */
export function applyTheme(preference: ThemePreference = getThemePreference()): ResolvedTheme {
    const resolved = getResolvedTheme(preference);

    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.setAttribute('data-theme-preference', preference);
        updateThemeUI(preference, resolved);
    }

    return resolved;
}

/**
 * Saves the theme preference to localStorage and applies it immediately.
 */
export function setThemePreference(preference: ThemePreference): ResolvedTheme {
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, preference);
        } catch {
            // Ignore storage write error
        }
    }
    return applyTheme(preference);
}

/**
 * Initializes the ThemeManager:
 * - Applies stored or system theme immediately.
 * - Listens for OS system color scheme changes when in 'system' mode.
 * - Binds to the `#theme-select` element if present.
 * - Returns a cleanup function to remove all event listeners.
 */
export function initThemeManager(): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => {
        };
    }

    // Apply current theme
    const currentPreference = getThemePreference();
    applyTheme(currentPreference);

    // Listen for OS theme changes
    let mediaQueryList: MediaQueryList | null = null;
    const onSystemThemeChange = () => {
        if (getThemePreference() === 'system') {
            applyTheme('system');
        }
    };

    if (typeof window.matchMedia === 'function') {
        mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', onSystemThemeChange);
        } else if (typeof (mediaQueryList as any).addListener === 'function') {
            (mediaQueryList as any).addListener(onSystemThemeChange);
        }
    }

    // Listen for select changes
    const select = document.getElementById('theme-select') as HTMLSelectElement | null;
    const onSelectChange = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        const val = target.value as ThemePreference;
        if (val === 'system' || val === 'dark' || val === 'light') {
            setThemePreference(val);
        }
    };

    if (select) {
        select.addEventListener('change', onSelectChange);
    }

    // Cleanup function
    return () => {
        if (select) {
            select.removeEventListener('change', onSelectChange);
        }
        if (mediaQueryList) {
            if (typeof mediaQueryList.removeEventListener === 'function') {
                mediaQueryList.removeEventListener('change', onSystemThemeChange);
            } else if (typeof (mediaQueryList as any).removeListener === 'function') {
                (mediaQueryList as any).removeListener(onSystemThemeChange);
            }
        }
    };
}

// Auto-apply theme immediately on module load if DOM is available
if (typeof document !== 'undefined') {
    try {
        applyTheme();
    } catch {
        // Ignore initialization errors
    }
}
