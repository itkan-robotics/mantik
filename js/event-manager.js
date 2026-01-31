/**
 * Mantik - Event Manager
 * Centralizes all event handling
 */

class EventManager {
    constructor(navigationManager = null, themeManager = null, searchManager = null) {
        this.navigationManager = navigationManager;
        this.themeManager = themeManager;
        this.searchManager = searchManager;
        this.resizeTimeout = null;
        this.setupEvents();
    }

    setupEvents() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.themeManager.toggleTheme();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchManager.performSearch(e.target.value);
            });
        }

        // Header search functionality
        const headerSearchInput = document.getElementById('search-input-header');
        if (headerSearchInput) {
            headerSearchInput.addEventListener('input', (e) => {
                this.searchManager.performSearch(e.target.value);
            });
        }

        // Mobile sidebar toggle
        const navToggle = document.getElementById('__navigation');
        if (navToggle) {
            navToggle.addEventListener('change', async (e) => {
                console.log(`[Debug] Sidebar toggle changed. Checked: ${e.target.checked}`);
                if (e.target.checked) {
                    // Sidebar is now visible - ensure it's shown
                    console.log('[Debug] Showing sidebar...');
                    const sidebarDrawer = document.querySelector('.sidebar-drawer');
                    const sidebarTree = sidebarDrawer?.querySelector('.sidebar-tree');
                    
                    // Ensure navigation is generated if content is missing (only if sidebar is enabled)
                    if (sidebarTree) {
                        const section = appState.config.sections[appState.currentSection];
                        const sidebarEnabled = section && section.sidebarEnabled !== false;
                        if (sidebarEnabled) {
                            const hasContent = sidebarTree.children.length > 0;
                            const lastRenderedSection = sidebarTree.dataset.renderedSection;
                            const needsRegeneration = !hasContent || lastRenderedSection !== appState.currentSection;
                            
                            if (needsRegeneration) {
                                console.log(`[Debug] Sidebar content missing or outdated. Regenerating navigation for section ${appState.currentSection}`);
                                await this.navigationManager.generateNavigation();
                            }
                        }
                    }
                    
                    if (sidebarDrawer) {
                        sidebarDrawer.style.display = '';
                        sidebarDrawer.style.visibility = 'visible';
                        sidebarDrawer.style.opacity = '1';
                        
                        // Ensure child elements are also visible
                        const sidebarContainer = sidebarDrawer.querySelector('.sidebar-container');
                        const sidebarScroll = sidebarDrawer.querySelector('.sidebar-scroll');
                        const sidebarTreeElement = sidebarDrawer.querySelector('.sidebar-tree');
                        
                        if (sidebarContainer) {
                            sidebarContainer.style.visibility = 'visible';
                            sidebarContainer.style.opacity = '1';
                        }
                        if (sidebarScroll) {
                            sidebarScroll.style.visibility = 'visible';
                            sidebarScroll.style.opacity = '1';
                        }
                        if (sidebarTreeElement) {
                            sidebarTreeElement.style.visibility = 'visible';
                            sidebarTreeElement.style.opacity = '1';
                            console.log(`[Debug] Sidebar tree visible. Has content: ${sidebarTreeElement.innerHTML.length > 0}, children: ${sidebarTreeElement.children.length}`);
                        }
                    }
                    // Adjust layout immediately (no animation)
                    this.navigationManager.adjustLayoutForSidebar();
                    
                    // Ensure current tab is highlighted and scrolled to
                    setTimeout(() => {
                        this.navigationManager.ensureCurrentTabHighlighted();
                        // Also call the global function for manual sidebar opening
                        if (typeof handleSidebarOpen === 'function') {
                            handleSidebarOpen();
                        }
                    }, 100);
                } else {
                    // Sidebar is now hidden - reset layout without animation
                    console.log('[Debug] Hiding sidebar...');
                    this.navigationManager.resetLayoutForHiddenSidebar();
                }
            });
        }

        // Hide sidebar when clicking on main content
        const mainContent = document.querySelector('.main');
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        if (mainContent && sidebarDrawer && navToggle) {
            mainContent.addEventListener('mousedown', (e) => {
                // Only close if sidebar is open and click is outside sidebar
                if (navToggle.checked) {
                    // Check if click is inside sidebar
                    if (!sidebarDrawer.contains(e.target)) {
                        navToggle.checked = false;
                        // Reset layout immediately (no animation)
                        this.navigationManager.resetLayoutForHiddenSidebar();
                    }
                }
            });
            // Also support touch events
            mainContent.addEventListener('touchstart', (e) => {
                if (navToggle.checked) {
                    if (!sidebarDrawer.contains(e.target)) {
                        navToggle.checked = false;
                        // Reset layout immediately (no animation)
                        this.navigationManager.resetLayoutForHiddenSidebar();
                    }
                }
            });
        }

        // Window resize handler for responsive layout
        window.addEventListener('resize', () => {
            // Debounce the resize event
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (window.innerWidth <= 1008) { // 63em = 1008px
                    // Reset to default layout on mobile
                    this.navigationManager.resetLayoutForHiddenSidebar();
                } else {
                    // Adjust layout on desktop
                    this.navigationManager.adjustLayoutForSidebar();
                }
            }, 250);
        });

        // Consolidated keyboard event handler for better INP
        // Single listener handles all keyboard shortcuts to reduce event processing overhead
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isInputField = target.tagName === 'INPUT' || 
                                target.tagName === 'TEXTAREA' || 
                                target.isContentEditable ||
                                target.closest('input, textarea, [contenteditable="true"]');
            
            const hasCtrl = e.ctrlKey || e.metaKey;
            
            // Ctrl+K: Focus search (works even in input fields)
            if (hasCtrl && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
                return;
            }
            
            // Skip other shortcuts when in input fields
            if (isInputField) return;
            
            // Ctrl+Arrow or Ctrl+</>: Section navigation
            if (hasCtrl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === '>' || e.key === '<')) {
                e.preventDefault();
                this.navigateSectionTabs(e.key === 'ArrowRight' || e.key === '>' ? 'next' : 'prev');
                return;
            }
            
            // Ctrl+Shift+C: Toggle all code blocks
            if (hasCtrl && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.toggleAllCodeBlocks();
                return;
            }
            
            // Ctrl+/ or ?: Show keyboard shortcuts
            if ((hasCtrl && e.key === '/') || (e.key === '?' && !hasCtrl && !e.shiftKey && !e.altKey)) {
                e.preventDefault();
                this.showKeyboardShortcuts();
                return;
            }
        }, { passive: false });

        // Consolidated click handler for better INP
        // Single delegated listener handles multiple click actions
        document.addEventListener('click', (e) => {
            // Copy button clicked
            if (e.target.classList.contains('copy-btn')) {
                const codeBlock = e.target.closest('.code-block');
                if (codeBlock) {
                    const code = codeBlock.querySelector('code');
                    if (code) {
                        this.copyToClipboard(code.textContent);
                    }
                }
                return;
            }
            
            // Answer toggle button clicked
            if (e.target.classList.contains('answer-toggle-btn')) {
                const answerSection = e.target.nextElementSibling;
                if (answerSection && answerSection.classList.contains('answer-section')) {
                    answerSection.classList.toggle('hidden');
                    answerSection.classList.toggle('visible');
                    e.target.classList.toggle('active');
                }
                return;
            }
        });
    }

    navigateWithArrows(key) {
        const currentIndex = appState.allTabs.findIndex(tab => tab.id === appState.currentTab);
        let newIndex;
        
        if (key === 'left') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : appState.allTabs.length - 1;
        } else if (key === 'right') {
            newIndex = currentIndex < appState.allTabs.length - 1 ? currentIndex + 1 : 0;
        }
        
        if (newIndex !== undefined && appState.allTabs[newIndex]) {
            this.navigationManager.navigateToTab(appState.allTabs[newIndex].id);
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--color-sidebar-background);
            color: var(--color-sidebar-link-text);
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    focusSearch() {
        // Check if we're on mobile (sidebar is visible/checked)
        const navToggle = document.getElementById('__navigation');
        const mobileSearchInput = document.getElementById('mobile-sidebar-search');
        const headerSearchInput = document.getElementById('header-search');
        
        if (navToggle && navToggle.checked && mobileSearchInput) {
            // On mobile with sidebar open, focus mobile search
            mobileSearchInput.focus();
            mobileSearchInput.select();
        } else if (headerSearchInput) {
            // Otherwise focus header search
            headerSearchInput.focus();
            headerSearchInput.select();
        }
    }

    toggleAllCodeBlocks() {
        // Access the content manager through the global app instance
        if (window.app && window.app.contentManager) {
            window.app.contentManager.toggleAllCodeBlocks();
        } else {
            console.warn('Content manager not available for code block toggle');
        }
    }

    showKeyboardShortcuts() {
        // Access the global toggle function
        if (typeof toggleKeyboardShortcuts === 'function') {
            toggleKeyboardShortcuts();
        } else {
            console.warn('Keyboard shortcuts toggle function not available');
        }
    }

    /**
     * Navigate to next/previous tab within the current section config.
     * Uses the same logic as the navigation buttons.
     * @param {'next'|'prev'} direction
     */
    navigateSectionTabs(direction) {
        // Use the content manager's method to get previous/next tabs (same as navigation buttons)
        if (!window.app || !window.app.contentManager || !this.navigationManager) {
            return;
        }

        const currentTabId = appState.currentTab;
        if (!currentTabId) return;

        // Get previous and next tabs using the same method as navigation buttons
        const { previous, next } = window.app.contentManager.getPreviousNextTabs(currentTabId);

        // Navigate to the appropriate tab
        let targetTab = null;
        if (direction === 'next' && next) {
            targetTab = next.id;
        } else if (direction === 'prev' && previous) {
            targetTab = previous.id;
        }

        if (targetTab) {
            this.navigationManager.navigateToTab(targetTab);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventManager;
} 