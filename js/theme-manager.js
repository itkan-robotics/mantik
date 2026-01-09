/**
 * Mantik - Theme Manager
 * Manages theme switching and persistence
 */

class ThemeManager {
    constructor() {
        this.initializeTheme();
    }

    initializeTheme() {
        // Theme is already restored by AppState, just update the icon
        this.updateThemeIcon(appState.theme);
    }

    setTheme(theme) {
        appState.setTheme(theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const newTheme = appState.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            // Toggle between moon (dark mode) and sun (light mode) icons
            themeIcon.classList.remove('fa-moon', 'fa-sun');
            themeIcon.classList.add(theme === 'dark' ? 'fa-moon' : 'fa-sun');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} 