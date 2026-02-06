/**
 * Mantik - Global State Management
 * Handles all application state and provides centralized state management
 */

(function() {
    window.debugLog = function() {
        if (localStorage.getItem('mantik_debug') === 'true') {
            console.log.apply(console, arguments);
        }
    };
})();

class AppState {
    constructor() {
        this.config = null;
        this.currentSection = 'homepage';
        this.currentTab = null;
        this.tabData = new Map();
        this.allTabs = [];
        this.theme = 'light';
        this.isInitialized = false;
        this.scrollPosition = 0;
        this.sidebarOpen = false;
        this.searchQuery = '';
        this.lastActivity = Date.now();
        // Initialize persistence (this will restore sidebar state from localStorage if available)
        this.initializePersistence();
        // Set default sidebar state after restoring (if no saved state exists, it stays closed)
        document.addEventListener('DOMContentLoaded', () => {
            const sidebarDrawer = document.querySelector('.sidebar-drawer');
            if (sidebarDrawer) sidebarDrawer.style.setProperty('--sidebar-width', '15em');
            // Apply the restored sidebar state (or default to closed)
            this.restoreSidebarState();
        });
    }

    /**
     * Initialize page persistence system
     */
    initializePersistence() {
        // Restore state on page load
        this.restoreState();
        
        // Set up event listeners for state changes
        this.setupPersistenceListeners();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            }
        });
        
        // Handle beforeunload event
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
        
        // Handle page focus/blur
        window.addEventListener('focus', () => {
            this.restoreState();
        });
        
        window.addEventListener('blur', () => {
            this.saveState();
        });
    }

    /**
     * Set up listeners for automatic state persistence
     */
    setupPersistenceListeners() {
        // Save state on scroll with debouncing
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            this.scrollPosition = window.scrollY;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.saveState();
            }, 1000); // Debounce scroll saves
        });
        
        // Set up sidebar state change listener
        // Try immediately, and also on DOMContentLoaded in case checkbox isn't ready yet
        this.setupSidebarListener();
        document.addEventListener('DOMContentLoaded', () => {
            this.setupSidebarListener();
        });
    }

    /**
     * Set up sidebar state change listener
     */
    setupSidebarListener() {
        const sidebarCheckbox = document.getElementById('__navigation');
        if (sidebarCheckbox && !sidebarCheckbox.dataset.listenerAttached) {
            sidebarCheckbox.dataset.listenerAttached = 'true';
            sidebarCheckbox.addEventListener('change', () => {
                this.sidebarOpen = sidebarCheckbox.checked;
                this.saveState();
            });
        }
    }

    /**
     * Set up navigation persistence after navigation manager is available
     */
    setupNavigationPersistence() {
        if (window.navigationManager?.navigateToTab) {
            const originalNavigateToTab = window.navigationManager.navigateToTab;
            window.navigationManager.navigateToTab = async (tabId) => {
                await originalNavigateToTab.call(window.navigationManager, tabId);
                this.saveState();
            };
        } else {
            // If navigation manager is not available yet, try again later
            setTimeout(() => {
                this.setupNavigationPersistence();
            }, 100);
        }
    }

    /**
     * Save complete application state to localStorage
     */
    saveState() {
        const state = {
            currentSection: this.currentSection,
            currentTab: this.currentTab,
            theme: this.theme,
            scrollPosition: this.scrollPosition,
            sidebarOpen: this.sidebarOpen,
            searchQuery: this.searchQuery,
            timestamp: Date.now()
        };

        try {
            debugLog(`[Debug] Saving state. Sidebar open: ${this.sidebarOpen}`);
            localStorage.setItem('mantik_state', JSON.stringify(state));
        } catch (error) {
            // Handle localStorage errors silently
            console.warn('Failed to save state to localStorage:', error);
        }
    }

    /**
     * Restore application state from localStorage
     */
    restoreState() {
        try {
            const savedState = localStorage.getItem('mantik_state');
            if (!savedState) return null;
            
            const state = JSON.parse(savedState);
            
            // Check if state is not too old (7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (Date.now() - state.timestamp > maxAge) {
                this.clearSavedState();
                return null;
            }
            
            // Restore state properties
            if (state.currentSection) {
                this.currentSection = state.currentSection;
            }
            if (state.currentTab) {
                this.currentTab = state.currentTab;
            }
            if (state.theme) {
                this.theme = state.theme;
                document.documentElement.setAttribute('data-theme', state.theme);
            }
            if (state.scrollPosition !== undefined) {
                this.scrollPosition = state.scrollPosition;
            }
            // Restore sidebar state if it was previously saved
            // If undefined, keep default (false = closed)
            if (state.sidebarOpen !== undefined) {
                this.sidebarOpen = state.sidebarOpen;
            } else {
                // No saved state, default to closed
                this.sidebarOpen = false;
            }
            if (state.searchQuery) {
                this.searchQuery = state.searchQuery;
            }
            
            return state;
        } catch (error) {
            console.warn('Failed to restore state from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear all saved state
     */
    clearSavedState() {
        try {
            localStorage.removeItem('mantik_state');
            localStorage.removeItem('lastOpenedTab');
            localStorage.removeItem('theme');
        } catch (error) {
            console.warn('Failed to clear saved state:', error);
        }
    }

    /**
     * Restore scroll position
     */
    restoreScrollPosition() {
        if (this.scrollPosition > 0) {
            setTimeout(() => {
                window.scrollTo(0, this.scrollPosition);
            }, 100);
        }
    }

    /**
     * Restore sidebar state
     * Applies the saved sidebar state (or default closed state) to the checkbox
     */
    restoreSidebarState() {
        const sidebarCheckbox = document.getElementById('__navigation');
        if (!sidebarCheckbox) {
            // Checkbox not ready yet, try again after a short delay
            setTimeout(() => this.restoreSidebarState(), 50);
            return;
        }
        
        debugLog(`[Debug] restoreSidebarState called. Saved state: ${this.sidebarOpen}`);
        
        // Apply the saved state (or default false if no saved state)
        // Only change if different to avoid unnecessary events
        if (sidebarCheckbox.checked !== this.sidebarOpen) {
            debugLog(`[Debug] Restoring sidebar state to: ${this.sidebarOpen}`);
            sidebarCheckbox.checked = this.sidebarOpen;
            // Trigger change event to ensure UI updates properly
            sidebarCheckbox.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Restore search query
     */
    restoreSearchQuery() {
        if (this.searchQuery && window.searchManager) {
            const headerSearch = document.getElementById('header-search');
            const mobileSearch = document.getElementById('mobile-sidebar-search');
            if (headerSearch) headerSearch.value = this.searchQuery;
            if (mobileSearch) mobileSearch.value = this.searchQuery;
            if (this.searchQuery.trim()) {
                window.searchManager.performSearch(this.searchQuery);
            }
        }
    }

    setConfig(config) {
        this.config = config;
    }

    setCurrentSection(section) {
        this.currentSection = section;
        this.saveState();
    }

    setCurrentTab(tab) {
        this.currentTab = tab;
        this.saveState();
    }

    addTabData(id, data) {
        this.tabData.set(id, data);
    }

    getTabData(id) {
        return this.tabData.get(id);
    }

    setAllTabs(tabs) {
        this.allTabs = tabs;
    }

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.saveState();
    }

    setInitialized(value) {
        this.isInitialized = value;
    }

    setScrollPosition(position) {
        this.scrollPosition = position;
        this.saveState();
    }

    setSidebarOpen(open) {
        this.sidebarOpen = open;
        this.saveState();
    }

    setSearchQuery(query) {
        this.searchQuery = query;
        this.saveState();
    }
}

// Global app state instance
const appState = new AppState();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
} 