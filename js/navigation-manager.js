/**
 * Mantik - Navigation Manager
 * Manages sidebar navigation and URL routing
 */

class NavigationManager {
    constructor(searchManager = null, contentManager = null) {
        this.contentManager = contentManager || new ContentManager();
        this.searchManager = searchManager;
        this.sectionUrlMap = {
            'java-training': 'java',
            'ftc-specific': 'ftc',
            'frc-specific': 'frc',
            'competitive-training': 'comp'
        };
        this.urlSectionMap = {
            'java': 'java-training',
            'ftc': 'ftc-specific',
            'frc': 'frc-specific',
            'comp': 'competitive-training'
        };
    }

    /**
     * Updates the URL to reflect the current section
     */
    updateUrl(sectionId, tabId = null) {
        // Fallback to direct URL manipulation
        const sectionPath = this.sectionUrlMap[sectionId];
        
        if (sectionPath) {
            // For main sections, use path routing
            const newPath = `/${sectionPath}`;
            if (tabId) {
                // For specific tabs within sections, use full path routing
                window.history.pushState({section: sectionId, tab: tabId}, '', `${newPath}/${tabId}`);
            } else {
                // For main sections, just use path
                window.history.pushState({section: sectionId}, '', newPath);
            }
        } else if (sectionId === 'homepage') {
            // For homepage, use root path
            window.history.pushState({section: 'homepage'}, '', '/');
        } else {
            // Fallback to hash routing
            const path = tabId ? `#${tabId}` : `#${sectionId}`;
            if (window.location.hash !== path) {
                window.location.hash = path;
            }
        }
    }

    /**
     * Parses the current URL to determine section and tab
     */
    parseCurrentUrl() {
        // Check for stored redirect path from 404.html fallback
        const storedPath = sessionStorage.getItem('redirectPath');
        if (storedPath) {
            sessionStorage.removeItem('redirectPath');
            // Parse the stored path
            try {
                const url = new URL(storedPath, window.location.origin);
                const path = url.pathname;
                const hash = url.hash;
                const pathParts = path.split('/').filter(part => part !== '' && part !== 'index.html');
                
                // Check for section/tab path structure like /java/java-intro
                if (pathParts.length === 2) {
                    const [sectionPath, tabId] = pathParts;
                    if (this.urlSectionMap[sectionPath]) {
                        const sectionId = this.urlSectionMap[sectionPath];
                        // Update URL to match the stored path
                        window.history.replaceState({section: sectionId, tab: tabId}, '', storedPath);
                        return { sectionId, tabId };
                    }
                }
                
                // Check for main section paths like /java
                if (pathParts.length === 1) {
                    const sectionPath = pathParts[0];
                    if (this.urlSectionMap[sectionPath]) {
                        const sectionId = this.urlSectionMap[sectionPath];
                        window.history.replaceState({section: sectionId}, '', storedPath);
                        return { sectionId, tabId: null };
                    }
                }
            } catch (e) {
                console.warn('Failed to parse stored redirect path:', e);
            }
        }
        
        // Fallback to direct URL parsing
        let path = window.location.pathname;
        const hash = window.location.hash;
        const search = window.location.search;
        
        // Handle /index.html paths (strip index.html)
        if (path === '/index.html' || path.endsWith('/index.html')) {
            path = path.replace(/\/index\.html$/, '') || '/';
        }
        
        const pathParts = path.split('/').filter(part => part !== '' && part !== 'index.html');
        
        // Check for section/tab path structure like /java/java-intro
        if (pathParts.length === 2) {
            const [sectionPath, tabId] = pathParts;
            if (this.urlSectionMap[sectionPath]) {
                const sectionId = this.urlSectionMap[sectionPath];
                return { sectionId, tabId };
            }
        }
        
        // Check for main section paths like /java
        if (pathParts.length === 1) {
            const sectionPath = pathParts[0];
            if (this.urlSectionMap[sectionPath]) {
                const sectionId = this.urlSectionMap[sectionPath];
                return { sectionId, tabId: null };
            }
        }
        
        // Check for root path (homepage)
        if (path === '/' || path === '' || pathParts.length === 0) {
            const tabId = hash ? hash.substring(1) : null;
            if (tabId && tabId !== 'homepage') {
                // Find which section this tab belongs to
                const parentSection = this.findParentSectionIdForTab(tabId, appState.config?.sections || {});
                if (parentSection) {
                    return { sectionId: parentSection, tabId };
                }
            }
            return { sectionId: 'homepage', tabId: null };
        }
        
        // Fallback to hash routing
        const tabId = hash ? hash.substring(1) : null;
        if (tabId) {
            const parentSection = this.findParentSectionIdForTab(tabId, appState.config?.sections || {});
            if (parentSection) {
                return { sectionId: parentSection, tabId };
            }
        }
        
        return { sectionId: 'homepage', tabId: null };
    }

    async generateNavigation() {
        const navigationContainer = document.querySelector('.sidebar-tree');
        if (!navigationContainer) return;

        navigationContainer.innerHTML = '';

        if (appState.currentSection === 'homepage') {
            this.renderHomepageNavigation(navigationContainer);
            // Update title for homepage
            this.updateSectionTitle('homepage', { title: 'Home' });
        } else {
            await this.renderSectionNavigation(navigationContainer);
        }

        // Adjust layout after navigation is generated
        setTimeout(() => {
            this.adjustLayoutForSidebar();
            // If sidebar navigation is empty, forcibly close sidebar and reset layout
            const navList = document.getElementById('sidebar-navigation');
            const navCheckbox = document.getElementById('__navigation');
            if (navList && navList.children.length === 0 && navCheckbox) {
                // Ensure the CSS variable is set before closing
                const sidebarDrawer = document.querySelector('.sidebar-drawer');
                if (sidebarDrawer) {
                    const currentWidth = sidebarDrawer.style.width || '15em';
                    sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
                }
                navCheckbox.checked = false;
            }
            
            // Highlight current tab and scroll to it if sidebar is open
            if (appState.currentTab) {
                this.ensureCurrentTabHighlighted();
            }
        }, 100);
    }

    renderHomepageNavigation(container) {
        const navigationItem = this.createNavigationItem('Home', 'homepage', 'toctree-l1 current-page');
        container.appendChild(navigationItem);
    }

    async renderSectionNavigation(container) {
        const section = appState.config.sections[appState.currentSection];
        if (!section) {
            console.error(`Section ${appState.currentSection} not found in config`);
            return;
        }

        // Load section content if needed
        if (!section.groups && !section.tiers && !section.intro && !section.children) {
            await this.contentManager.loadSectionContent(appState.currentSection);
        } else if (section.groups || section.tiers || section.children) {
            await this.contentManager.loadSectionContent(appState.currentSection);
        }

        const updatedSection = appState.config.sections[appState.currentSection];

        // Support new nested parent/child structure
        if (updatedSection.groups) {
            // Check if groups have children (nested structure)
            const hasNestedStructure = updatedSection.groups.some(group => group.children);
            if (hasNestedStructure) {
                this.renderParentGroupsNavigation(container, updatedSection.groups);
            } else {
                this.renderGroupsNavigation(container, updatedSection.groups);
            }
        } else if (updatedSection.children) {
            this.renderParentGroupsNavigation(container, updatedSection.children);
        } else if (updatedSection.tiers) {
            this.renderTiersNavigation(container, updatedSection.tiers);
        } else if (updatedSection.intro) {
            this.renderIntroNavigation(container, updatedSection.intro);
        }
    }

    renderParentGroupsNavigation(container, parents) {
        parents.forEach(parent => {
            const parentLi = this.createParentNavigationItem(parent);
            const childrenUl = this.createChildrenContainer(parent.id);

            // Render each group (child) under this parent
            if (parent.children) {
                // Support for deeper nesting - render children as groups
                this.renderGroupsNavigation(childrenUl, parent.children);
            } else if (parent.groups) {
                this.renderGroupsNavigation(childrenUl, parent.groups);
            } else if (parent.items) {
                // Render items directly if present
                this.renderItemsList(childrenUl, parent.items);
            }

            parentLi.appendChild(childrenUl);
            container.appendChild(parentLi);
        });
    }

    renderGroupsNavigation(container, groups) {
        if (!Array.isArray(groups)) return;
        
        groups.forEach(group => {
            const groupLi = this.createParentNavigationItem(group);
            const itemsUl = this.createChildrenContainer(group.id);

            // Handle direct items in group
            if (Array.isArray(group.items)) {
                this.renderItemsList(itemsUl, group.items);
            }

            // Handle nested children structure (like FTC config)
            if (Array.isArray(group.children)) {
                group.children.forEach(child => {
                    // Create child group header
                    const childGroupLi = this.createParentNavigationItem(child, 'toctree-l2 parent-tab');
                    
                    const childItemsUl = this.createChildrenContainer(child.id);

                    if (Array.isArray(child.items)) {
                        this.renderItemsList(childItemsUl, child.items, 'toctree-l3 child-tab');
                    }

                    childGroupLi.appendChild(childItemsUl);
                    itemsUl.appendChild(childGroupLi);
                });
            }

            groupLi.appendChild(itemsUl);
            container.appendChild(groupLi);
        });
    }

    renderIntroNavigation(container, intro) {
        const navigationItem = this.createNavigationItem(intro.label, intro.id, 'toctree-l1 current-page');
        container.appendChild(navigationItem);
    }

    renderTiersNavigation(container, tiers) {
        // Handle tiers navigation if needed
        // This is a placeholder for future tier-based navigation
    }

    // Helper methods to reduce code duplication
    createNavigationItem(label, tabId, className = 'toctree-l1') {
        const li = document.createElement('li');
        li.className = className;
        const a = document.createElement('a');
        a.className = 'reference';
        a.href = `#${tabId}`;
        a.textContent = label;
        a.onclick = (e) => {
            e.preventDefault();
            this.navigateToTab(tabId);
        };
        li.appendChild(a);
        return li;
    }

    createParentNavigationItem(parent, className = 'toctree-l1 parent-tab') {
        const li = document.createElement('li');
        li.className = className;
        
        const a = document.createElement('a');
        a.className = 'reference parent-folder-reference';
        a.href = '#';
        a.innerHTML = `
            <span class="expand-icon expand-icon-${parent.id}">▼</span>
            ${parent.label}
        `;
        a.onclick = (e) => {
            e.preventDefault();
            this.toggleGroup(parent.id);
        };
        li.appendChild(a);
        return li;
    }

    createChildrenContainer(groupId) {
        const ul = document.createElement('ul');
        ul.className = 'children-nav expanded';
        ul.id = `children-${groupId}`;
        return ul;
    }

    renderItemsList(container, items, itemClassName = 'toctree-l2 child-tab') {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = itemClassName;
            const a = document.createElement('a');
            a.className = 'reference child-reference';
            a.href = `#${item.id}`;
            a.textContent = item.label;
            a.onclick = (e) => {
                e.preventDefault();
                this.navigateToTab(item.id);
            };
            li.appendChild(a);
            container.appendChild(li);
        });
    }

    toggleGroup(groupId) {
        const childrenNav = document.getElementById(`children-${groupId}`);
        const expandIcon = document.querySelector(`.expand-icon-${groupId}`);

        if (childrenNav.classList.contains('expanded')) {
            childrenNav.classList.remove('expanded');
            childrenNav.classList.add('collapsed');
            expandIcon.innerHTML = '▶';
        } else {
            childrenNav.classList.add('expanded');
            childrenNav.classList.remove('collapsed');
            expandIcon.innerHTML = '▼';
        }
        
        // Adjust layout after toggling with a small delay to ensure DOM updates are complete
        setTimeout(() => {
            this.adjustLayoutForSidebar();
        }, 50);
    }

    adjustLayoutForSidebar() {
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        const mainContent = document.querySelector('.main');
        const navCheckbox = document.getElementById('__navigation');
        const sidebarContent = sidebarDrawer?.querySelector('.sidebar-scroll');
        
        if (!sidebarDrawer || !mainContent || !sidebarContent) {
            return;
        }
        // Check if sidebar is currently visible (checkbox is checked)
        const isSidebarVisible = navCheckbox && navCheckbox.checked;
        // Temporarily make sidebar visible to measure content
        const originalLeft = sidebarDrawer.style.left;
        const originalVisibility = sidebarDrawer.style.visibility;
        sidebarDrawer.style.left = '0';
        sidebarDrawer.style.visibility = 'visible';
        sidebarDrawer.style.position = 'absolute'; // Temporarily change to absolute to measure

        // Count visible navigation items and measure their content
        const visibleItems = this.countVisibleNavigationItems();
        const contentWidth = this.measureNavigationContentWidth();
        
        // Calculate optimal width based on number of items and content width
        const minSidebarWidth = 240; // 15em minimum
        const maxSidebarWidth = 600; // Increased maximum for better accommodation of multiple sections
        const padding = 50; // Increased padding for better spacing
        
        // Base width calculation
        let optimalWidth = Math.max(minSidebarWidth, contentWidth + padding);
        
        // Adjust width based on number of visible items with better scaling
        if (visibleItems.count > 0) {
            // More aggressive scaling for sections with many items
            const itemMultiplier = Math.min(visibleItems.count / 8, 1.5); // Increased scale factor
            const extraWidth = Math.floor(itemMultiplier * 120); // Up to 180px extra for many items
            optimalWidth += extraWidth;
            
            // Additional width for multiple expanded parent sections
            if (visibleItems.details.parentFolders > 1) {
                const parentMultiplier = visibleItems.details.parentFolders * 20; // 20px per parent section
                optimalWidth += parentMultiplier;
            }
            
            // Extra width for sections with many child items
            if (visibleItems.details.childItems > 10) {
                const childMultiplier = Math.min(visibleItems.details.childItems / 15, 1) * 80; // Up to 80px extra
                optimalWidth += childMultiplier;
            }
        }
        
        // Ensure width doesn't exceed maximum
        optimalWidth = Math.min(maxSidebarWidth, optimalWidth);

        // Restore original positioning
        sidebarDrawer.style.left = originalLeft;
        sidebarDrawer.style.visibility = originalVisibility;
        sidebarDrawer.style.position = 'fixed';

        // Apply the optimal width
        sidebarDrawer.style.width = `${optimalWidth}px`;
        sidebarDrawer.querySelector('.sidebar-container').style.width = `${optimalWidth}px`;
        // Set the CSS variable for sidebar width
        sidebarDrawer.style.setProperty('--sidebar-width', optimalWidth ? `${optimalWidth}px` : '15em');
        
        // If sidebar is visible and we have a stored width, use it for immediate opening
        if (isSidebarVisible && sidebarDrawer.dataset.storedWidth) {
            const storedWidth = parseInt(sidebarDrawer.dataset.storedWidth);
            sidebarDrawer.style.width = `${storedWidth}px`;
            sidebarDrawer.querySelector('.sidebar-container').style.width = `${storedWidth}px`;
            // Set the CSS variable for sidebar width
            sidebarDrawer.style.setProperty('--sidebar-width', storedWidth ? `${storedWidth}px` : '15em');
        } else if (isSidebarVisible && !sidebarDrawer.dataset.storedWidth) {
            const localStorageWidth = localStorage.getItem('sidebarWidth');
            let width = optimalWidth;
            if (localStorageWidth) {
                width = parseInt(localStorageWidth);
            }
            sidebarDrawer.style.width = `${width}px`;
            sidebarDrawer.querySelector('.sidebar-container').style.width = `${width}px`;
            // Set the CSS variable for sidebar width
            sidebarDrawer.style.setProperty('--sidebar-width', width ? `${width}px` : '15em');
            sidebarDrawer.dataset.storedWidth = width;
        } else {
            // Set the CSS variable for sidebar width
            sidebarDrawer.style.setProperty('--sidebar-width', optimalWidth ? `${optimalWidth}px` : '15em');
        }

        // Only adjust main content if sidebar is actually visible
        if (isSidebarVisible) {
            // Adjust main content area with more generous spacing
            const sidebarOffset = optimalWidth + 0; // Reduced buffer for better spacing
            mainContent.style.marginLeft = `${sidebarOffset}px`;
            mainContent.style.maxWidth = `calc(100% - ${sidebarOffset}px)`;
        } else {
            // If sidebar is not visible, remove inline styles to let CSS handle transitions
            mainContent.style.removeProperty('margin-left');
            mainContent.style.removeProperty('max-width');
            // Store the width for the next time it opens
            sidebarDrawer.dataset.storedWidth = optimalWidth;
        }

        // Store the current sidebar width for responsive adjustments
        sidebarDrawer.dataset.currentWidth = optimalWidth;
        
        // Ensure sidebar scroll area is properly sized
        const sidebarScroll = sidebarDrawer.querySelector('.sidebar-scroll');
        if (sidebarScroll) {
            sidebarScroll.style.height = `calc(100vh - var(--header-height) - 4rem)`;
            sidebarScroll.style.overflowY = 'auto';
            sidebarScroll.style.overflowX = 'hidden';
        }
    }

    countVisibleNavigationItems() {
        const sidebarTree = document.querySelector('.sidebar-tree');
        if (!sidebarTree) return { count: 0, details: {} };

        let totalCount = 0;
        const details = {
            parentFolders: 0,
            groups: 0,
            childItems: 0,
            expandedParents: 0,
            expandedGroups: 0
        };

        // Count parent folders (OnBot Java, Android Studio)
        const parentFolders = sidebarTree.querySelectorAll('.parent-folder');
        details.parentFolders = parentFolders.length;
        totalCount += parentFolders.length;

        // Count groups under each parent and check if they're expanded
        const groups = sidebarTree.querySelectorAll('.parent-tab');
        details.groups = groups.length;
        totalCount += groups.length;

        // Count expanded groups specifically
        const expandedGroups = sidebarTree.querySelectorAll('.parent-tab .children-nav.expanded');
        details.expandedGroups = expandedGroups.length;

        // Count child items (actual lessons) in expanded sections
        const childItems = sidebarTree.querySelectorAll('.child-tab');
        details.childItems = childItems.length;
        totalCount += childItems.length;

        // Count expanded parent sections
        const expandedParents = sidebarTree.querySelectorAll('.parent-folder .children-nav.expanded');
        details.expandedParents = expandedParents.length;

        // Add extra weight for expanded sections
        if (details.expandedParents > 0) {
            totalCount += details.expandedParents * 2; // Extra weight for expanded parents
        }
        if (details.expandedGroups > 0) {
            totalCount += details.expandedGroups * 3; // Extra weight for expanded groups
        }

        return { count: totalCount, details };
    }

    measureNavigationContentWidth() {
        const sidebarTree = document.querySelector('.sidebar-tree');
        if (!sidebarTree) return 240;

        // Get all text elements in the navigation
        const textElements = sidebarTree.querySelectorAll('.reference');
        let maxWidth = 240; // Minimum width

        textElements.forEach(element => {
            // Temporarily make element visible to measure
            const originalDisplay = element.style.display;
            element.style.display = 'block';
            element.style.visibility = 'visible';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            
            // Measure the text width
            const textWidth = element.scrollWidth;
            maxWidth = Math.max(maxWidth, textWidth);
            
            // Restore original state
            element.style.display = originalDisplay;
            element.style.visibility = '';
            element.style.position = '';
            element.style.left = '';
        });

        return maxWidth;
    }

    // Method to reset layout when sidebar is hidden
    resetLayoutForHiddenSidebar() {
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        const mainContent = document.querySelector('.main');
        if (!sidebarDrawer || !mainContent) {
            return;
        }
        
        // Get current width before resetting
        const currentWidth = sidebarDrawer.style.width || '15em';
        
        // Reset sidebar width to default
        sidebarDrawer.style.width = '15em';
        sidebarDrawer.querySelector('.sidebar-container').style.width = '15em';
        
        // Set the CSS variable to current width for smooth closing
        sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
        
        // Remove inline styles from main content to let CSS handle the transition
        mainContent.style.removeProperty('margin-left');
        mainContent.style.removeProperty('max-width');
        
        // Clear stored width
        delete sidebarDrawer.dataset.currentWidth;
    }

    // Method to ensure smooth sidebar opening
    ensureSmoothSidebarTransition() {
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        if (!sidebarDrawer) return;
        
        // Ensure the CSS variable is set to the current width
        const currentWidth = sidebarDrawer.style.width || '15em';
        sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
    }

    async navigateToTab(tabId) {
        if (!appState.config || !appState.config.sections) {
            this.showError('Configuration not loaded yet. Please wait and try again.');
            return;
        }
        try {
            // Store the last opened tab ID
            localStorage.setItem('lastOpenedTab', tabId);
            
            // Check if this is a main section navigation
            const isMainSection = ['java-training', 'ftc-specific', 'frc-specific', 'competitive-training', 'homepage'].includes(tabId);
            
            if (isMainSection) {
                // For main sections, use handleSectionNavigation which automatically navigates to intro page
                await this.handleSectionNavigation(tabId);
                return;
            }
            // Clear current page classes
            document.querySelectorAll('.toctree-l1, .toctree-l2').forEach(li => {
                li.classList.remove('current-page');
            });
            
            // Clear header navigation active state
            document.querySelectorAll('.header-nav-link').forEach(link => {
                link.classList.remove('active');
            });

            // Find the target tab
            let targetTab = appState.allTabs.find(tab => tab.id === tabId);

            // If not found, try to find the parent section for this tab recursively in config
            if (!targetTab) {
                let parentSectionId = this.findParentSectionIdForTab(tabId, appState.config.sections);
                if (parentSectionId) {
                    appState.setCurrentSection(parentSectionId);
                    await this.generateNavigation();
                    // Try again after navigation is generated
                    targetTab = appState.allTabs.find(tab => tab.id === tabId);
                }
            }

            // Handle dynamic lesson loading
            if (!targetTab) {
                targetTab = appState.getTabData(tabId);
                if (targetTab && targetTab.file && !targetTab.loaded) {
                    try {
                        const updatedTabData = await this.contentManager.loadSingleContent(tabId);
                        targetTab = updatedTabData;
                        // Update navigation label
                        const navLink = document.querySelector(`a[href="#${tabId}"]`);
                        if (navLink && updatedTabData.title) {
                            navLink.textContent = updatedTabData.title;
                        }
                    } catch (error) {
                        console.error(`Error loading lesson ${tabId}:`, error);
                        this.showError('Failed to load lesson. Please refresh the page.');
                        return;
                    }
                }
            }

            // If still not found, try to load the section that might contain this tab
            if (!targetTab) {
                // Try to find which section this tab belongs to
                for (const sectionId in appState.config.sections) {
                    const section = appState.config.sections[sectionId];
                    if (section.groups) {
                        for (const group of section.groups) {
                            if (group.items && group.items.some(item => item.id === tabId)) {
                                // Load this section and try again
                                await this.contentManager.loadSectionContent(sectionId);
                                targetTab = appState.allTabs.find(tab => tab.id === tabId);
                                if (targetTab) break;
                            }
                        }
                    }
                    if (targetTab) break;
                }
            }

            if (targetTab) {
                // Determine section
                let newSection = appState.currentSection;
                if (targetTab.sectionId) {
                    newSection = targetTab.sectionId;
                }
                // Update current section if needed
                if (appState.currentSection !== newSection) {
                    appState.setCurrentSection(newSection);
                    await this.generateNavigation();
                }
                
                // CRITICAL FIX: Ensure tab content is loaded before rendering
                // This handles cases where tab data exists but content file hasn't been loaded yet
                if (targetTab.file && !targetTab.loaded) {
                    try {
                        const loadedTabData = await this.contentManager.loadSingleContent(tabId);
                        if (loadedTabData) {
                            targetTab = loadedTabData;
                        }
                    } catch (error) {
                        console.error(`Error loading content for tab ${tabId}:`, error);
                        this.showError('Failed to load content. Please refresh the page.');
                        return;
                    }
                }
                
                // Update URL for individual tabs within sections
                if (!isMainSection) {
                    this.updateUrl(newSection, tabId);
                }
                
                // Highlight navigation
                this.highlightNavigation(tabId);
                // Update header navigation
                this.updateHeaderNavigation(newSection);
                // Render content (only if we have valid data)
                const tabData = appState.getTabData(tabId);
                if (tabData) {
                    this.contentManager.renderContent(tabId);
                    appState.setCurrentTab(tabId);
                } else {
                    console.error(`No data available for tab ${tabId} after loading`);
                    this.showError('Content not available. Please try navigating again.');
                }
                
                // Scroll to current tab if sidebar is open
                const navCheckbox = document.getElementById('__navigation');
                if (navCheckbox && navCheckbox.checked) {
                    setTimeout(() => {
                        this.ensureCurrentTabHighlighted();
                    }, 50);
                }
                
                // Scroll to top of the page
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Handle section navigation
                await this.handleSectionNavigation(tabId);
            }

            // Close mobile navigation and reset layout
            const navCheckbox = document.getElementById('__navigation');
            if (navCheckbox && navCheckbox.checked) {
                // Set the CSS variable before closing to ensure smooth transition
                const sidebarDrawer = document.querySelector('.sidebar-drawer');
                if (sidebarDrawer) {
                    const currentWidth = sidebarDrawer.style.width || '15em';
                    sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
                }
                navCheckbox.checked = false;
                // Reset layout immediately to ensure smooth transition
                this.resetLayoutForHiddenSidebar();
            }
            // Restore search results if there was an active search
            if (this.searchManager) {
                this.searchManager.restoreSearchResults();
            }
        } catch (error) {
            console.error(`Error navigating to tab ${tabId}:`, error);
            this.showError('Navigation failed. Please try again.');
        }
    }

    async handleSectionNavigation(sectionId) {
        // Always close sidebar when switching sections
        const navCheckbox = document.getElementById('__navigation');
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        
        if (navCheckbox && sidebarDrawer) {
            // Set the CSS variable before closing to ensure smooth transition
            const currentWidth = sidebarDrawer.style.width || '15em';
            sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
            
            // Temporarily disable transition
            const originalTransition = sidebarDrawer.style.transition;
            sidebarDrawer.style.transition = 'none';
            
            // Force close
            navCheckbox.checked = false;
            this.resetLayoutForHiddenSidebar();
            
            // Re-enable transition after a brief delay
            setTimeout(() => {
                sidebarDrawer.style.transition = originalTransition;
            }, 50);
        }

        const section = appState.config.sections[sectionId];
        if (!section || !section.file) return;
        
        // Update URL for section navigation
        this.updateUrl(sectionId);

        // Check if we're navigating to a different section
        const currentSection = appState.currentSection;
        const isDifferentSection = currentSection !== sectionId;
        
        // Close sidebar if navigating to a different section (but not on mobile)
        if (isDifferentSection && window.innerWidth > 1008) {
            const navCheckbox = document.getElementById('__navigation');
            if (navCheckbox && navCheckbox.checked) {
                // Set the CSS variable before closing to ensure smooth transition
                const currentWidth = sidebarDrawer.style.width || '15em';
                sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
                
                navCheckbox.checked = false;
                // Reset layout immediately to ensure smooth transition
                this.resetLayoutForHiddenSidebar();
            }
        }

        try {
            await this.contentManager.loadSectionContent(sectionId);
            const updatedSection = appState.config.sections[sectionId];
            
            // Update page title for section navigation
            this.updateSectionTitle(sectionId, updatedSection);
            
            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // After loading content and updating navigation, ensure sidebar is properly closed
            const navCheckbox2 = document.getElementById('__navigation');
            if (navCheckbox2 && navCheckbox2.checked) {
                // Ensure the CSS variable is set before closing
                const currentWidth = sidebarDrawer.style.width || '15em';
                sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
                navCheckbox2.checked = false;
                // Reset layout immediately to ensure smooth transition
                this.resetLayoutForHiddenSidebar();
            }

            if (updatedSection.intro) {
                await this.navigateToTab(updatedSection.intro.id);
                return;
            }
            
            if (updatedSection.groups && updatedSection.groups.length > 0 && updatedSection.groups[0].items.length > 0) {
                const firstItem = updatedSection.groups[0].items[0];
                await this.navigateToTab(firstItem.id);
                return;
            }
        } catch (error) {
            console.error(`Failed to load section ${sectionId}:`, error);
            this.showError('Failed to load section.');
        }
    }

    highlightNavigation(tabId) {
        // Clear all current-page classes first
        document.querySelectorAll('.current-page').forEach(element => {
            element.classList.remove('current-page');
        });

        // Find and highlight the current tab
        const navLinks = document.querySelectorAll('.child-reference, .reference');
        let foundCurrentTab = false;
        
        navLinks.forEach(link => {
            // Check if this link corresponds to the current tab
            if (link.href && link.href.includes(`#${tabId}`)) {
                const parentLi = link.closest('.toctree-l1, .toctree-l2, .toctree-l3');
                if (parentLi) {
                    parentLi.classList.add('current-page');
                    foundCurrentTab = true;
                }
            }
        });

        // If we found the current tab, also expand its parent groups
        if (foundCurrentTab) {
            this.expandParentGroupsForTab(tabId);
        }
    }

    /**
     * Expands parent groups that contain the current tab
     */
    expandParentGroupsForTab(tabId) {
        const currentTabElement = document.querySelector(`.current-page`);
        if (!currentTabElement) return;

        // Find all parent groups that need to be expanded
        let parent = currentTabElement.parentElement;
        while (parent && !parent.classList.contains('sidebar-tree')) {
            if (parent.classList.contains('children-nav')) {
                parent.classList.add('expanded');
                parent.classList.remove('collapsed');
                
                // Update the expand icon
                const parentLi = parent.previousElementSibling;
                if (parentLi && parentLi.classList.contains('parent-tab')) {
                    const expandIcon = parentLi.querySelector('.expand-icon');
                    if (expandIcon) {
                        expandIcon.innerHTML = '▼';
                    }
                }
            }
            parent = parent.parentElement;
        }
    }

    /**
     * Scrolls the sidebar to the current tab when the sidebar is opened
     */
    scrollToCurrentTab() {
        const currentTabElement = document.querySelector('.current-page');
        if (!currentTabElement) return;

        const sidebarScroll = document.querySelector('.sidebar-scroll');
        if (!sidebarScroll) return;

        // Calculate the position to scroll to
        const sidebarRect = sidebarScroll.getBoundingClientRect();
        const tabRect = currentTabElement.getBoundingClientRect();
        
        // Calculate the scroll position to center the current tab
        const scrollTop = sidebarScroll.scrollTop;
        const tabTop = tabRect.top - sidebarRect.top;
        const sidebarHeight = sidebarRect.height;
        const tabHeight = tabRect.height;
        
        // Center the tab in the sidebar
        const targetScrollTop = scrollTop + tabTop - (sidebarHeight / 2) + (tabHeight / 2);
        
        // Smooth scroll to the target position
        sidebarScroll.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    /**
     * Ensures the current tab is highlighted and scrolled to when sidebar is opened
     * This method includes retry logic for cases where navigation might not be fully rendered
     */
    ensureCurrentTabHighlighted() {
        if (!appState.currentTab) return;

        // First, try to highlight the current tab
        this.highlightNavigation(appState.currentTab);
        
        // Check if highlighting was successful
        const currentTabElement = document.querySelector('.current-page');
        if (!currentTabElement) {
            // If highlighting failed, try again after a short delay
            setTimeout(() => {
                this.highlightNavigation(appState.currentTab);
                this.scrollToCurrentTab();
            }, 200);
        } else {
            // If highlighting was successful, scroll to the tab
            this.scrollToCurrentTab();
        }
    }

    updateHeaderNavigation(sectionId) {
        // Clear all active states first
        document.querySelectorAll('.header-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Use hash-based hrefs for compatibility with GitHub Pages
        const targetHref = `#${sectionId}`;
        
        // Find and activate the correct header link
        const headerLink = document.querySelector(`.header-nav-link[href="${targetHref}"]`);
        if (headerLink) {
            headerLink.classList.add('active');
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
            document.body.removeChild(errorDiv);
        }, 5000);
    }

    // Recursively search config for the parent section of a tabId
    findParentSectionIdForTab(tabId, sections) {
        for (const sectionKey in sections) {
            const section = sections[sectionKey];
            if (section.groups && Array.isArray(section.groups)) {
                for (const group of section.groups) {
                    if (group.items && group.items.some(item => item.id === tabId)) {
                        return sectionKey;
                    }
                }
            }
            if (section.children && Array.isArray(section.children)) {
                for (const child of section.children) {
                    // Check items directly under this child
                    if (child.items && child.items.some(item => item.id === tabId)) {
                        return sectionKey;
                    }
                    // Recurse into deeper children
                    const found = this.findParentSectionIdForTab(tabId, { [child.id]: child });
                    if (found) return sectionKey;
                }
            }
        }
        return null;
    }

    /**
     * Updates the page title for section navigation
     */
    updateSectionTitle(sectionId, section) {
        let title = 'Mantik - Programming Fundamentals';
        
        if (section && section.title) {
            title = `${section.title} - Mantik`;
        } else {
            // Use section ID to generate a title
            const sectionName = this.getSectionDisplayName(sectionId);
            title = `${sectionName} - Mantik`;
        }
        
        // Update the document title
        document.title = title;
    }

    /**
     * Gets a display name for a section ID
     */
    getSectionDisplayName(sectionId) {
        const sectionNames = {
            'homepage': 'Home',
            'java-training': 'Java Training',
            'ftc-specific': 'FTC Training',
            'frc-specific': 'FRC Training',
            'competitive-training': 'Competitive Training'
        };
        
        return sectionNames[sectionId] || sectionId;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
} 