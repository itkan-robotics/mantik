/**
 * Mantik - Main Application
 * Coordinates all managers and handles application initialization
 */

class Application {
    constructor() {
        this.configManager = new ConfigManager();
        this.contentManager = new ContentManager(this.configManager);
        this.navigationManager = new NavigationManager(null, this.contentManager);
        this.searchManager = new SearchManager(this.contentManager, this.navigationManager);
        this.navigationManager.searchManager = this.searchManager; // Set the reference back
        this.searchIndex = new SearchIndex();
        this.searchManager.setSearchIndex(this.searchIndex);
        this.themeManager = new ThemeManager();
        this.eventManager = new EventManager(this.navigationManager, this.themeManager, this.searchManager);
        this.sidebarResizeManager = new SidebarResizeManager();
        
        // Initialize SEO manager for dynamic metadata
        this.seoManager = typeof SEOManager !== 'undefined' ? new SEOManager() : null;
        
        // Initialize router after navigation manager is created
        // Remove router initialization and usage
    }

    async initialize() {
        try {
            // Clear any cached configs to ensure fresh loading
            this.configManager.clearCache();
            
            // Load main configuration
            await this.configManager.loadMainConfig();
            
            // Load homepage content
            await this.contentManager.loadSectionContent('homepage');
            
            // Generate initial navigation
            await this.navigationManager.generateNavigation();
            
            // Defer search index build until idle to improve INP (Interaction to Next Paint)
            const scheduleSearchBuild = () => {
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(() => this.buildSearchIndex(), { timeout: 3000 });
                } else {
                    setTimeout(() => this.buildSearchIndex(), 0);
                }
            };
            scheduleSearchBuild();
            
            // Initialize sidebar resize functionality
            this.sidebarResizeManager.initialize();
            
            // Set up navigation persistence after navigation manager is ready
            appState.setupNavigationPersistence();
            
            // Show appropriate tab based on saved state or defaults
            await this.showAppropriateTab();
            
            // Restore UI state after navigation
            this.restoreUIState();
            
            // Mark as initialized
            appState.setInitialized(true);
            
            // Hide loading overlay after everything is ready
            hideLoadingOverlay();

            // Ensure content reloads on browser navigation (back/forward)
            window.addEventListener('popstate', async () => {
                await this.showAppropriateTab();
            });
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to load application. Please refresh the page.');
            hideLoadingOverlay();
        }
    }

    async buildSearchIndex() {
        try {
            debugLog('Building search index...');
            await this.searchIndex.buildIndex(this.contentManager, this.configManager);
            this.searchManager.setSearchIndex(this.searchIndex);
            debugLog('Search index built successfully');
        } catch (error) {
            console.error('Error building search index:', error);
            // Continue without index - fallback to old search
        }
    }

    /**
     * Updates SEO metadata for the current page
     */
    updateSEOMetadata(sectionId, tabId) {
        if (!this.seoManager) return;
        
        try {
            const data = tabId ? appState.getTabData(tabId) : appState.getTabData(sectionId);
            this.seoManager.updateMetadata(data, sectionId, tabId);
        } catch (error) {
            console.warn('Failed to update SEO metadata:', error);
        }
    }

    async showAppropriateTab() {
        // Parse the current URL and navigate to the appropriate tab
        const { sectionId, tabId } = this.navigationManager.parseCurrentUrl();
        
        // Check if we have a valid path in the URL that should be preserved
        const currentPath = window.location.pathname;
        const hasValidPath = currentPath && currentPath !== '/' && currentPath !== '/index.html' && !currentPath.endsWith('/index.html');
        
        // If both sectionId and tabId are missing or invalid, check if we should preserve the URL
        if ((!sectionId || sectionId === '' || sectionId === null) && (!tabId || tabId === '' || tabId === null)) {
            // Only default to homepage if we're actually on the root path
            // If we have a valid path but couldn't parse it, wait a bit and try again
            if (!hasValidPath || currentPath === '/' || currentPath === '') {
                appState.currentSection = 'homepage';
                appState.currentTab = null;
                this.navigationManager.updateUrl('homepage');
                await this.navigationManager.handleSectionNavigation('homepage');
                this.contentManager.renderContent('homepage');
                return;
            } else {
                // We have a path but couldn't parse it - might be a timing issue
                // Try parsing again after a short delay
                console.warn('Could not parse URL, retrying...', currentPath);
                await new Promise(resolve => setTimeout(resolve, 100));
                const retryParse = this.navigationManager.parseCurrentUrl();
                if (retryParse.sectionId && retryParse.sectionId !== 'homepage') {
                    if (retryParse.sectionId && retryParse.tabId) {
                        // Ensure section content is loaded before navigating
                        await this.contentManager.loadSectionContent(retryParse.sectionId);
                        await this.navigationManager.navigateToTab(retryParse.tabId);
                    } else if (retryParse.sectionId) {
                        await this.navigationManager.handleSectionNavigation(retryParse.sectionId);
                    }
                    return;
                }
            }
        }
        
        if (sectionId && tabId) {
            // CRITICAL FIX: Load section content first before navigating to tab
            // This ensures content is available when navigating directly to a page
            if (sectionId !== 'homepage') {
                try {
                    await this.contentManager.loadSectionContent(sectionId);
                } catch (error) {
                    console.error(`Failed to load section ${sectionId}:`, error);
                    // Fallback to homepage on error
                    appState.currentSection = 'homepage';
                    appState.currentTab = null;
                    this.navigationManager.updateUrl('homepage');
                    await this.navigationManager.handleSectionNavigation('homepage');
                    this.contentManager.renderContent('homepage');
                    return;
                }
            }
            await this.navigationManager.navigateToTab(tabId);
        } else if (sectionId) {
            await this.navigationManager.handleSectionNavigation(sectionId);
            if (sectionId === 'homepage') {
                this.contentManager.renderContent('homepage');
            }
        } else {
            // Fallback to homepage only if we're actually on root
            if (!hasValidPath) {
                appState.currentSection = 'homepage';
                appState.currentTab = null;
                this.navigationManager.updateUrl('homepage');
                await this.navigationManager.handleSectionNavigation('homepage');
                this.contentManager.renderContent('homepage');
            }
        }
    }

    showDefaultTab() {
        const urlData = this.navigationManager.parseCurrentUrl();
        
        if (urlData.tabId) {
            // URL contains specific tab
            const defaultTab = appState.allTabs.find(tab => tab.id === urlData.tabId);
            if (defaultTab) {
                localStorage.removeItem('lastOpenedTab');
                this.navigationManager.navigateToTab(urlData.tabId);
                return;
            }
        } else if (urlData.sectionId && urlData.sectionId !== 'homepage') {
            // URL contains section but no specific tab
            this.navigationManager.navigateToTab(urlData.sectionId);
            return;
        }

        // Fallback to stored tab or default
        const lastOpenedTabId = localStorage.getItem('lastOpenedTab');
        let defaultTab = lastOpenedTabId ? 
            appState.allTabs.find(tab => tab.id === lastOpenedTabId) : null;

        if (!defaultTab) {
            defaultTab = appState.allTabs.find(tab => tab.default) || appState.allTabs[0];
        }

        if (defaultTab) {
            this.navigationManager.navigateToTab(defaultTab.id);
        } else {
            // Navigate to homepage if no default tab found
            this.navigationManager.navigateToTab('homepage');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f44336;
            color: white;
            padding: 2rem;
            border-radius: 0.5rem;
            z-index: 1000;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }

    restoreUIState() {
        if (appState.restoreScrollPosition) appState.restoreScrollPosition();
        if (appState.restoreSidebarState) appState.restoreSidebarState();
        if (appState.restoreSearchQuery) appState.restoreSearchQuery();
    }

    showLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(255,255,255,0.95);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                color: #333;
            `;
            overlay.innerHTML = '<span>Loading...</span>';
            document.body.appendChild(overlay);
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Global loading overlay functions for use before Application is initialized
function showLoadingOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:var(--color-background-primary,#fff);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--color-foreground-primary,#333);';
        overlay.innerHTML = '<span>Loading...</span>';
        document.body.appendChild(overlay);
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.15s ease-out';
    overlay.style.opacity = '0';
    overlay.setAttribute('aria-busy', 'false');
    const removeAfterFade = () => overlay.remove();
    setTimeout(() => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(removeAfterFade) : removeAfterFade()), 160);
}

// Loading overlay is now inlined in HTML for faster display

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Application;
}