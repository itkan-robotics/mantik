/**
 * Mantik - Global Functions
 * HTML integration functions and application initialization
 */

// Global application instance
let app;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        app = new Application();
        window.app = app; // Make app globally accessible
        await app.initialize();
        
        // Delegated click handler for internal <a> links in content
        // This handles content links that reference specific tabs
        const tabContainer = document.getElementById('tab-container');
        if (tabContainer) {
            tabContainer.addEventListener('click', function(e) {
                const anchor = e.target.closest('a');
                if (!anchor?.getAttribute('href')) return;
                
                const href = anchor.getAttribute('href');
                
                // Prevent navigation to invalid URLs (like "frc:1" which looks like a protocol)
                if (href && /^[a-z]+:\d+$/.test(href)) {
                    // Looks like an invalid protocol URL (e.g., "frc:1"), prevent default navigation
                    e.preventDefault();
                    console.warn('Prevented navigation to invalid URL:', href);
                    return;
                }
                
                // Match ../motors/basic-motor-control.json or similar
                const match = href.match(/\.\.\/([\w-]+)\/([\w-]+)\.json$/);
                let tabId = null;
                
                if (match) {
                    tabId = match[2];
                } else if (href.startsWith('#')) {
                    tabId = href.substring(1);
                } else if (/^[\w-]+$/.test(href)) {
                    // Support <a href="basic-motor-control">...</a> style
                    tabId = href;
                }
                
                // Check if tabId is a valid internal tab
                if (tabId && (appState.allTabs.some(tab => tab.id === tabId) || appState.getTabData(tabId))) {
                    if (app?.navigationManager) {
                        e.preventDefault();
                        app.navigationManager.navigateToTab(tabId);
                    }
                }
            });
        }
        
        // Check for developer mode
        checkDevMode();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Hide loading overlay even if initialization fails
        hideLoadingOverlay();
    }
});

/**
 * Mantik - Global Utility Functions
 * Provides utility functions for debugging and development
 */

// Global utility functions for debugging and development
window.MantikUtils = {
    /**
     * Clear all saved application state
     */
    clearSavedState() {
        appState.clearSavedState();
    },

    /**
     * View current application state
     */
    viewCurrentState() {
        const state = {
            currentSection: appState.currentSection,
            currentTab: appState.currentTab,
            theme: appState.theme,
            scrollPosition: appState.scrollPosition,
            sidebarOpen: appState.sidebarOpen,
            searchQuery: appState.searchQuery,
            isInitialized: appState.isInitialized,
            allTabsCount: appState.allTabs.length,
            tabDataCount: appState.tabData.size
        };
        return state;
    },

    /**
     * View saved state from localStorage
     */
    viewSavedState() {
        try {
            const savedState = localStorage.getItem('mantik_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                return state;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    },

    /**
     * Test persistence system
     */
    testPersistence() {
        // Save current state
        appState.saveState();
        
        // Change state
        appState.currentTab = 'test-tab';
        appState.saveState();
        
        // Restore state
        appState.loadState();
    },

    /**
     * Navigate to a tab and save state
     */
    navigateAndSave(tabId) {
        if (app && app.navigationManager) {
            app.navigationManager.navigateToTab(tabId);
            appState.saveState();
        }
    },

    /**
     * Set scroll position and save state
     */
    setScrollAndSave(position) {
        appState.scrollPosition = position;
        appState.saveState();
    },

    /**
     * Toggle sidebar and save state
     */
    toggleSidebarAndSave() {
        const sidebarCheckbox = document.getElementById('__navigation');
        if (sidebarCheckbox) {
            appState.sidebarOpen = sidebarCheckbox.checked;
            appState.saveState();
        }
    },

    /**
     * Set search query and save state
     */
    setSearchAndSave(query) {
        appState.searchQuery = query;
        appState.saveState();
    },

    /**
     * Get persistence statistics
     */
    getPersistenceStats() {
        const stats = {
            localStorageSize: 0,
            savedStateSize: 0,
            lastSaved: null,
            stateAge: null
        };

        try {
            // Calculate localStorage size
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            stats.localStorageSize = totalSize;

            // Get saved state info
            const savedState = localStorage.getItem('mantik_state');
            if (savedState) {
                stats.savedStateSize = savedState.length;
                const state = JSON.parse(savedState);
                stats.lastSaved = new Date(state.timestamp);
                stats.stateAge = Date.now() - state.timestamp;
            }
        } catch (error) {
            // Handle errors silently
        }

        return stats;
    }
};

// Global functions for HTML onclick handlers
function openTab(event, tabId) {
    event.preventDefault();
    if (app && app.navigationManager) {
        app.navigationManager.navigateToTab(tabId);
    }
}

function toggleTheme() {
    if (app && app.themeManager) {
        app.themeManager.toggleTheme();
    }
}

// Function to handle sidebar opening and scroll to current tab
function handleSidebarOpen() {
    if (app && app.navigationManager && appState.currentTab) {
        // Use the new method that includes retry logic
        app.navigationManager.ensureCurrentTabHighlighted();
    }
}

// Mobile header scroll behavior
let lastScrollTop = 0;
let mobileHeader = null;

// Initialize header on DOM ready
function initHeaderVisibility() {
    mobileHeader = document.querySelector('.mobile-header');
    if (!mobileHeader) {
        // Retry if header not found yet
        setTimeout(initHeaderVisibility, 100);
        return;
    }
    
    // Show header initially
    mobileHeader.classList.add('visible');
    
    window.addEventListener('scroll', function() {
        if (!mobileHeader) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDelta = scrollTop - lastScrollTop;

        // Show header when scrolling up, hide when scrolling down
        if (scrollDelta < 0 || scrollTop <= 10) {
            // Scrolling up or near top - show header
            mobileHeader.classList.add('visible');
        } else if (scrollDelta > 5) {
            // Scrolling down significantly - hide header
            mobileHeader.classList.remove('visible');
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderVisibility);
} else {
    initHeaderVisibility();
}

// Keyboard shortcuts overlay toggle
function toggleKeyboardShortcuts() {
    const overlay = document.getElementById('keyboard-shortcuts-overlay');
    if (overlay) {
        const isVisible = overlay.classList.contains('visible');
        if (isVisible) {
            overlay.classList.remove('visible');
            // Re-enable body scroll
            document.body.style.overflow = '';
        } else {
            overlay.classList.add('visible');
            // Disable body scroll when overlay is open
            document.body.style.overflow = 'hidden';
            
            // Focus the close button for accessibility
            const closeButton = overlay.querySelector('.keyboard-shortcuts-close');
            if (closeButton) {
                setTimeout(() => closeButton.focus(), 100);
            }
        }
    }
}

// Add click outside functionality for keyboard shortcuts overlay
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('keyboard-shortcuts-overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            // Close overlay if clicking on the background (not the modal)
            if (e.target === overlay) {
                toggleKeyboardShortcuts();
            }
        });
        
        // Add ESC key support to close overlay
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) {
                e.preventDefault();
                toggleKeyboardShortcuts();
            }
        });
        
        // Add focus trap for accessibility
        const closeButton = overlay.querySelector('.keyboard-shortcuts-close');
        if (closeButton) {
            closeButton.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleKeyboardShortcuts();
                }
            });
        }
    }
});

// Add keyboard shortcut for Developer Mode (Ctrl + L)
document.addEventListener('keydown', function(e) {
    // Check for Ctrl + L (case insensitive)
    // Note: Ctrl + L is commonly used to focus address bar, so we preventDefault
    if (e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        // If toggleDevMode is available, call it
        if (typeof window.toggleDevMode === 'function') {
            const isEnabled = window.toggleDevMode();
            // Optional: show a small toast notification since this is a keyboard action
            // but for now the visual appearance of the button is feedback enough
        }
    }
});

/**
 * Developer Mode Functions
 */

// Check if developer mode is enabled
function checkDevMode() {
    const isDev = localStorage.getItem('mantik_dev_mode') === 'true';
    const devContainer = document.getElementById('dev-open-links-container');
    
    if (devContainer) {
        devContainer.style.display = isDev ? 'flex' : 'none';
    }
    
    // Expose toggle function globally
    window.toggleDevMode = function() {
        const currentState = localStorage.getItem('mantik_dev_mode') === 'true';
        localStorage.setItem('mantik_dev_mode', !currentState);
        checkDevMode();
        console.log(`Developer mode ${!currentState ? 'enabled' : 'disabled'}`);
        return !currentState;
    };
}

// Open all links on the current page
function openAllPageLinks() {
    const tabContainer = document.getElementById('tab-container');
    if (!tabContainer) return;
    
    // Select standard links
    const links = Array.from(tabContainer.querySelectorAll('a[href]'));
    
    // Select link-grid buttons that have data-url or data-tab-id attributes
    const gridButtons = Array.from(tabContainer.querySelectorAll('.link-grid-button[data-url], .link-grid-button[data-tab-id]'));
    
    // Combine all clickable items
    const allItems = [...links, ...gridButtons];
    
    if (allItems.length === 0) {
        alert('No links found on this page.');
        return;
    }
    
    const confirmMessage = `Found ${allItems.length} links (including ${gridButtons.length} grid buttons). Are you sure you want to open all of them? This might trigger a popup blocker.`;
    if (!confirm(confirmMessage)) return;
    
    let openedCount = 0;
    
    allItems.forEach(item => {
        let url = null;
        
        // Determine URL based on element type
        if (item.tagName === 'A') {
            const href = item.getAttribute('href');
            // Skip internal anchors if they just scroll the page
            if (href.startsWith('#') && !href.includes('/')) return;
            // Skip javascript: links
            if (href.startsWith('javascript:')) return;
            
            url = href;
        } else if (item.hasAttribute('data-url')) {
            url = item.getAttribute('data-url');
        } else if (item.hasAttribute('data-tab-id')) {
            // For internal tab IDs, construct a hash URL that the app likely supports
            url = '#' + item.getAttribute('data-tab-id');
        }
        
        if (url) {
            window.open(url, '_blank');
            openedCount++;
        }
    });
    
    console.log(`Opened ${openedCount} links.`);
}
