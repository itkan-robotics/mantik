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
            let newPath = `/${sectionPath}`;
            
            // Check if tabId is the intro for this section
            let isIntro = false;
            if (tabId && appState.config && appState.config.sections && appState.config.sections[sectionId]) {
                const section = appState.config.sections[sectionId];
                if (section.intro && section.intro.id === tabId) {
                    isIntro = true;
                }
            }

            if (tabId && !isIntro) {
                // For specific tabs within sections (that aren't the intro), use full path routing
                window.history.pushState({section: sectionId, tab: tabId}, '', `${newPath}/${tabId}`);
            } else {
                // For main sections or intro tabs, just use path
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

        const navCheckbox = document.getElementById('__navigation');
        const sidebarDrawer = document.querySelector('.sidebar-drawer');
        const navToggleLabels = document.querySelectorAll('label[for="__navigation"]');
        
        // Get current section config
        const section = appState.config.sections[appState.currentSection];
        if (!section) {
            console.error(`Section ${appState.currentSection} not found in config`);
            return;
        }
        
        // Check if sidebar is enabled for this section (defaults to true if not specified)
        const sidebarEnabled = section.sidebarEnabled !== false;
        
        if (!sidebarEnabled) {
            // Disable sidebar for sections where it's disabled (like homepage)
            navigationContainer.innerHTML = '';
            if (navCheckbox) {
                navCheckbox.checked = false;
                navCheckbox.disabled = true;
            }
            if (sidebarDrawer) {
                sidebarDrawer.style.display = 'none';
                sidebarDrawer.style.visibility = 'hidden';
                sidebarDrawer.style.opacity = '0';
            }
            navToggleLabels.forEach(label => {
                label.style.display = 'none';
            });
            // Also hide the mobile header toggle button
            const mobileHeaderToggle = document.querySelector('.nav-overlay-icon');
            if (mobileHeaderToggle) {
                mobileHeaderToggle.style.display = 'none';
            }
            // Reset layout for hidden sidebar
            this.resetLayoutForHiddenSidebar();
            // Update title for section
            this.updateSectionTitle(appState.currentSection, section);
        } else {
            // Check if navigation is already rendered for this section
            const containerHasContent = navigationContainer.children.length > 0;
            const lastRenderedSection = navigationContainer.dataset.renderedSection;
            
            // Only clear and re-render if we're switching sections or if container is empty
            // Force re-render if section changed to ensure sidebar always updates
            if (!containerHasContent || lastRenderedSection !== appState.currentSection) {
                console.log(`[Debug] Rendering navigation for section ${appState.currentSection} (was: ${lastRenderedSection || 'none'})`);
                navigationContainer.innerHTML = '';
                // Clear the dataset to ensure fresh render
                delete navigationContainer.dataset.renderedSection;
                await this.renderSectionNavigation(navigationContainer);
                navigationContainer.dataset.renderedSection = appState.currentSection;
            } else {
                console.log(`[Debug] Skipping navigation render - already rendered for section ${appState.currentSection} with ${navigationContainer.children.length} items`);
            }
            
            // Enable sidebar for sections where it's enabled
            if (navCheckbox) {
                navCheckbox.disabled = false;
                // Ensure sidebar starts hidden (not checked) and stays hidden until user opens it
                if (!navCheckbox.checked) {
                    if (sidebarDrawer) {
                        sidebarDrawer.style.display = 'none';
                        sidebarDrawer.style.visibility = 'hidden';
                        sidebarDrawer.style.opacity = '0';
                    }
                } else {
                    // If checked, show it
                    if (sidebarDrawer) {
                        sidebarDrawer.style.display = '';
                        sidebarDrawer.style.visibility = '';
                        sidebarDrawer.style.opacity = '';
                    }
                }
            }
            navToggleLabels.forEach(label => {
                label.style.display = '';
            });
        }

        // Ensure sidebar CSS variable is initialized
        if (sidebarDrawer) {
            const currentWidth = sidebarDrawer.style.width || localStorage.getItem('sidebarWidth') || '15em';
            sidebarDrawer.style.setProperty('--sidebar-width', currentWidth);
        }

        // Adjust layout after navigation is generated (only if sidebar is enabled and checked)
        if (sidebarEnabled) {
            setTimeout(() => {
                // Only adjust layout if sidebar is actually checked/open
                if (navCheckbox && navCheckbox.checked) {
                    this.adjustLayoutForSidebar();
                    // Highlight current tab and scroll to it if sidebar is open
                    if (appState.currentTab) {
                        this.ensureCurrentTabHighlighted();
                    }
                } else {
                    // Sidebar is closed, make sure it's completely hidden
                    this.resetLayoutForHiddenSidebar();
                }
            }, 100);
        }
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

        // Check if section already has groups loaded (avoid re-loading if already loaded)
        const hasGroupsAlready = section.groups && Array.isArray(section.groups) && section.groups.length > 0;
        
        // Only load section content if groups are not already present
        if (!hasGroupsAlready) {
            await this.contentManager.loadSectionContent(appState.currentSection);
        }

        const updatedSection = appState.config.sections[appState.currentSection];
        console.log(`[Debug] renderSectionNavigation for ${appState.currentSection}:`, {
            hasGroups: !!updatedSection.groups,
            hasChildren: !!updatedSection.children,
            hasTiers: !!updatedSection.tiers,
            hasIntro: !!updatedSection.intro,
            hasSections: !!(updatedSection.sections && Array.isArray(updatedSection.sections)),
            groupsCount: updatedSection.groups ? updatedSection.groups.length : 0,
            groupsType: updatedSection.groups ? typeof updatedSection.groups : 'none',
            groupsIsArray: updatedSection.groups ? Array.isArray(updatedSection.groups) : false,
            container: container ? container.tagName : 'null'
        });

        // Support new nested parent/child structure
        if (updatedSection.groups) {
            // Check if groups have children (nested structure)
            const hasNestedStructure = updatedSection.groups.some(group => group.children);
            console.log(`[Debug] Rendering groups. Has nested structure: ${hasNestedStructure}, Groups count: ${updatedSection.groups.length}`);
            if (hasNestedStructure) {
                this.renderParentGroupsNavigation(container, updatedSection.groups);
            } else {
                this.renderGroupsNavigation(container, updatedSection.groups);
            }
            console.log(`[Debug] After rendering groups. Container children count: ${container.children.length}`);
        } else if (updatedSection.children) {
            this.renderParentGroupsNavigation(container, updatedSection.children);
        } else if (updatedSection.tiers) {
            this.renderTiersNavigation(container, updatedSection.tiers);
        } else if (updatedSection.intro) {
            this.renderIntroNavigation(container, updatedSection.intro);
        } else {
            console.warn(`[Debug] No navigation structure found for section ${appState.currentSection}`);
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
        
        // Scroll to the clicked group so its title appears at the top
        // Wait a bit for DOM to update after expand/collapse animation
        const parentTab = expandIcon?.closest('.parent-tab');
        if (parentTab) {
            setTimeout(() => {
                this.scrollToElement(parentTab);
            }, 100);
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
        console.log(`[Debug] adjustLayoutForSidebar called. Visible: ${isSidebarVisible}`);

        // If sidebar is hidden, completely hide it and return early
        if (!isSidebarVisible) {
            console.log(`[Debug] Sidebar hidden. Hiding completely.`);
            sidebarDrawer.style.display = 'none';
            sidebarDrawer.style.visibility = 'hidden';
            sidebarDrawer.style.opacity = '0';
            // Ensure main content is reset
            mainContent.style.removeProperty('margin-left');
            mainContent.style.removeProperty('max-width');
            return;
        }
        
        // Sidebar should be visible - ensure it's shown
        console.log(`[Debug] Sidebar should be visible. Showing sidebar.`);
        // Store original values before making changes
        const originalLeft = sidebarDrawer.style.left;
        const originalPosition = sidebarDrawer.style.position;
        
        // Make sidebar visible first - remove all hiding styles (no animation)
        sidebarDrawer.style.display = '';
        sidebarDrawer.style.visibility = 'visible';
        sidebarDrawer.style.opacity = '1';
        sidebarDrawer.style.transition = 'none'; // Ensure no animation
        
        // Also ensure child elements are visible
        const sidebarContainer = sidebarDrawer.querySelector('.sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.style.visibility = '';
            sidebarContainer.style.opacity = '';
        }
        const sidebarScroll = sidebarDrawer.querySelector('.sidebar-scroll');
        if (sidebarScroll) {
            sidebarScroll.style.visibility = '';
            sidebarScroll.style.opacity = '';
        }
        const sidebarTree = sidebarDrawer.querySelector('.sidebar-tree');
        if (sidebarTree) {
            console.log(`[Debug] Sidebar tree found. Children count: ${sidebarTree.children.length}`);
            sidebarTree.style.visibility = '';
            sidebarTree.style.opacity = '';
        } else {
            console.warn(`[Debug] Sidebar tree NOT found!`);
        }
        
        let optimalWidth = 240; // Default min width

        try {
            console.log('[Debug] Measuring sidebar content width...');
            sidebarDrawer.style.left = '0';
            sidebarDrawer.style.position = 'absolute'; // Temporarily change to absolute to measure

            // Count visible navigation items and measure their content
            const visibleItems = this.countVisibleNavigationItems();
            const contentWidth = this.measureNavigationContentWidth();
            
            // Calculate optimal width based on number of items and content width
            const minSidebarWidth = 240; // 15em minimum
            const maxSidebarWidth = 600; // Increased maximum for better accommodation of multiple sections
            const padding = 50; // Increased padding for better spacing
            
            // Base width calculation
            optimalWidth = Math.max(minSidebarWidth, contentWidth + padding);
            
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
        } finally {
            // Restore original positioning (but keep visibility as visible since sidebar is checked)
            sidebarDrawer.style.left = originalLeft || '';
            sidebarDrawer.style.visibility = 'visible'; // Keep visible when sidebar is checked
            sidebarDrawer.style.position = originalPosition || 'fixed';
        }

        // Determine the width to use: stored width if exists, otherwise maximum width
        const maxSidebarWidth = 600; // Maximum width as defined above
        let finalWidth = optimalWidth;
        
        if (isSidebarVisible) {
            // Check for stored width in localStorage or dataset
            const localStorageWidth = localStorage.getItem('sidebarWidth');
            const datasetWidth = sidebarDrawer.dataset.storedWidth;
            
            if (datasetWidth) {
                // Use stored width from dataset
                finalWidth = parseInt(datasetWidth);
            } else if (localStorageWidth) {
                // Use stored width from localStorage
                finalWidth = parseInt(localStorageWidth);
                sidebarDrawer.dataset.storedWidth = finalWidth;
            } else {
                // No stored width exists - use maximum width initially
                finalWidth = maxSidebarWidth;
                sidebarDrawer.dataset.storedWidth = maxSidebarWidth;
                localStorage.setItem('sidebarWidth', maxSidebarWidth.toString());
            }
        } else {
            // Sidebar not visible, use optimal width for calculations
            finalWidth = optimalWidth;
        }

        // Apply the final width
        sidebarDrawer.style.width = `${finalWidth}px`;
        sidebarDrawer.querySelector('.sidebar-container').style.width = `${finalWidth}px`;
        // Set the CSS variable for sidebar width
        sidebarDrawer.style.setProperty('--sidebar-width', finalWidth ? `${finalWidth}px` : '15em');

        // Adjust main content area with sidebar spacing
        console.log(`[Debug] Adjusting main content. Sidebar width: ${finalWidth}px`);
        const sidebarOffset = finalWidth + 0; // Reduced buffer for better spacing
        mainContent.style.marginLeft = `${sidebarOffset}px`;
        mainContent.style.maxWidth = `calc(100% - ${sidebarOffset}px)`;
        
        // Ensure sidebar stays visible with all child elements (elements already declared above)
        sidebarDrawer.style.display = '';
        sidebarDrawer.style.visibility = 'visible';
        sidebarDrawer.style.opacity = '1';
        
        // Ensure all child containers are also visible (using elements already declared above)
        if (sidebarContainer) {
            sidebarContainer.style.visibility = 'visible';
            sidebarContainer.style.opacity = '1';
        }
        if (sidebarScroll) {
            sidebarScroll.style.visibility = 'visible';
            sidebarScroll.style.opacity = '1';
        }
        if (sidebarTree) {
            sidebarTree.style.visibility = 'visible';
            sidebarTree.style.opacity = '1';
            console.log(`[Debug] Sidebar tree visible. Content length: ${sidebarTree.innerHTML.length}`);
        }

        // Store the current sidebar width for responsive adjustments
        sidebarDrawer.dataset.currentWidth = optimalWidth;
        
        // Ensure sidebar scroll area is properly sized (sidebarScroll already declared above)
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
        const navCheckbox = document.getElementById('__navigation');
        if (!sidebarDrawer || !mainContent) {
            return;
        }
        
        // Completely hide the sidebar when unchecked (no animation, instant)
        if (!navCheckbox || !navCheckbox.checked) {
            console.log('[Debug] Hiding sidebar completely');
            sidebarDrawer.style.display = 'none';
            sidebarDrawer.style.visibility = 'hidden';
            sidebarDrawer.style.opacity = '0';
            sidebarDrawer.style.transition = 'none'; // Ensure no animation
            
            // Also hide child elements to ensure nothing is visible
            const sidebarContainer = sidebarDrawer.querySelector('.sidebar-container');
            const sidebarScroll = sidebarDrawer.querySelector('.sidebar-scroll');
            if (sidebarContainer) {
                sidebarContainer.style.visibility = 'hidden';
                sidebarContainer.style.opacity = '0';
            }
            if (sidebarScroll) {
                sidebarScroll.style.visibility = 'hidden';
                sidebarScroll.style.opacity = '0';
            }
        }
        
        // Reset sidebar width to default
        sidebarDrawer.style.width = '15em';
        const sidebarContainer = sidebarDrawer.querySelector('.sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.style.width = '15em';
        }
        
        // Remove inline styles from main content (no animation)
        mainContent.style.removeProperty('margin-left');
        mainContent.style.removeProperty('max-width');
        mainContent.style.transition = 'none'; // Ensure no animation
        
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
            console.log(`[Debug] navigateToTab called for: ${tabId}`);
            // Store the last opened tab ID
            localStorage.setItem('lastOpenedTab', tabId);
            
            // Clear header navigation active state FIRST, before any early returns
            // This prevents the underline from getting stuck when clicking header links
            document.querySelectorAll('.header-nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
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
                window.scrollTo({ top: 0 });
            } else {
                // Handle section navigation
                await this.handleSectionNavigation(tabId);
            }

            // Close mobile navigation and reset layout
            const navCheckbox = document.getElementById('__navigation');
            if (navCheckbox) {
                navCheckbox.checked = false;
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
            // Force close immediately without animation
            navCheckbox.checked = false;
            this.resetLayoutForHiddenSidebar();
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
                if (navCheckbox) {
                    navCheckbox.checked = false;
                    this.resetLayoutForHiddenSidebar();
                }
            }

        try {
            await this.contentManager.loadSectionContent(sectionId);
            const updatedSection = appState.config.sections[sectionId];
            
            // Update current section state early to ensure sidebar updates correctly
            // This must be done before generateNavigation() is called
            appState.setCurrentSection(sectionId);
            
            // Update page title for section navigation
            this.updateSectionTitle(sectionId, updatedSection);
            
            // Scroll to top of the page
            window.scrollTo({ top: 0 });
            
            // After loading content and updating navigation, ensure sidebar is properly closed
            const navCheckbox2 = document.getElementById('__navigation');
            if (navCheckbox2) {
                navCheckbox2.checked = false;
                this.resetLayoutForHiddenSidebar();
            }

            // If section has a sections array (homepage-style), render it directly
            // But still generate navigation for the sidebar (for sections with groups)
            if (updatedSection.sections && Array.isArray(updatedSection.sections)) {
                // Generate navigation for sidebar (will render groups if they exist)
                await this.generateNavigation();
                // Update header navigation to show correct active state
                this.updateHeaderNavigation(sectionId);
                this.contentManager.renderContent(sectionId);
                appState.setCurrentTab(sectionId);
                return;
            }

            // Navigate to intro if it exists
            if (updatedSection.intro && updatedSection.intro.id) {
                // Ensure intro content is loaded before navigating
                let introTabData = appState.getTabData(updatedSection.intro.id);
                
                // If data not in state, it might have failed to load in loadIntroContent (which doesn't throw)
                // Try loading it explicitly again
                if (!introTabData || !introTabData.loaded) {
                    try {
                        const data = await this.contentManager.configManager.loadContentFile(updatedSection.intro.file);
                        introTabData = {
                            ...updatedSection.intro,
                            ...data,
                            sectionId,
                            sectionLabel: updatedSection.title || updatedSection.label,
                            loaded: true
                        };
                        appState.addTabData(updatedSection.intro.id, introTabData);
                        appState.allTabs.push(introTabData);
                    } catch (e) {
                        console.error(`Retry loading intro failed: ${e}`);
                    }
                }

                if (introTabData) {
                    await this.navigateToTab(updatedSection.intro.id);
                    return;
                } else {
                    console.warn(`Intro tab ${updatedSection.intro.id} not found in tab data, attempting to navigate anyway`);
                    await this.navigateToTab(updatedSection.intro.id);
                    return;
                }
            }
            
            // Fallback to first item in first group if no intro
            // Helper function to find first valid item recursively
            const findFirstItem = (items) => {
                if (!Array.isArray(items)) return null;
                for (const item of items) {
                    if (item.file) return item; // Found a leaf item
                    if (item.items) {
                        const found = findFirstItem(item.items);
                        if (found) return found;
                    }
                    if (item.children) {
                        const found = findFirstItem(item.children);
                        if (found) return found;
                    }
                    if (item.groups) {
                        const found = findFirstItem(item.groups);
                        if (found) return found;
                    }
                }
                return null;
            };

            let firstItem = null;
            if (updatedSection.groups) firstItem = findFirstItem(updatedSection.groups);
            if (!firstItem && updatedSection.children) firstItem = findFirstItem(updatedSection.children);
            if (!firstItem && updatedSection.items) firstItem = findFirstItem(updatedSection.items);
            if (!firstItem && updatedSection.tiers) {
                // Handle tiers (special case for FTC if structure used)
                for (const tier of updatedSection.tiers) {
                    if (tier.lessons && tier.lessons.length > 0) {
                        // Extract ID from first lesson
                        const lessonId = tier.lessons[0].replace(/^.*\/([^/]+)\.json$/, '$1');
                        await this.navigateToTab(lessonId);
                        return;
                    }
                }
            }

            if (firstItem) {
                await this.navigateToTab(firstItem.id);
                return;
            }

            // Fix: If section has no intro/groups/children, it's likely a standalone page (like homepage)
            if (!updatedSection.intro && !firstItem) {
                // Generate navigation (will disable sidebar for homepage)
                // Section state already updated above, so navigation will render correctly
                await this.generateNavigation();
                // Update header navigation to show correct active state
                this.updateHeaderNavigation(sectionId);
                this.contentManager.renderContent(sectionId);
                appState.setCurrentTab(sectionId);
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
     * Scrolls the sidebar so a specific element appears at the top
     */
    scrollToElement(targetElement) {
        if (!targetElement) return;
        
        const sidebarScroll = document.querySelector('.sidebar-scroll');
        if (!sidebarScroll) return;

        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
            // Get the current scroll position
            const currentScrollTop = sidebarScroll.scrollTop;
            
            // Get bounding rectangles - these are relative to the viewport
            const scrollRect = sidebarScroll.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            
            // Calculate how far the target is from the top of the visible scroll area
            // targetRect.top is the element's top edge relative to viewport
            // scrollRect.top is the scroll container's top edge relative to viewport
            // The difference is how far the element is from the top of the visible scroll area
            const distanceFromTop = targetRect.top - scrollRect.top;
            
            // The target element's absolute position in the scrollable content is:
            // current scroll position + distance from top of visible area
            const targetScrollTop = currentScrollTop + distanceFromTop;
            
            // Ensure we don't scroll past the limits
            const maxScroll = sidebarScroll.scrollHeight - sidebarScroll.clientHeight;
            // Round to avoid sub-pixel issues
            const finalScrollTop = Math.max(0, Math.min(Math.round(targetScrollTop), maxScroll));
            
            sidebarScroll.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
            });
        });
    }

    /**
     * Scrolls the sidebar so the current group's title appears at the top
     */
    scrollToCurrentTab() {
        const currentTabElement = document.querySelector('.current-page');
        if (!currentTabElement) return;

        // Find the parent group (parent-tab) that contains the current item
        let parentGroup = null;
        
        // If current item is a child-tab, find its parent group
        if (currentTabElement.classList.contains('child-tab')) {
            // The structure is: parent-tab > children-nav > child-tab
            // So we need to go up to children-nav, then find the previous sibling parent-tab
            let parent = currentTabElement.parentElement;
            while (parent && !parent.classList.contains('sidebar-tree')) {
                if (parent.classList.contains('children-nav')) {
                    // Found the children-nav, now look for the previous sibling parent-tab
                    const parentLi = parent.previousElementSibling;
                    if (parentLi && parentLi.classList.contains('parent-tab')) {
                        parentGroup = parentLi;
                        break;
                    }
                }
                parent = parent.parentElement;
            }
        } else if (currentTabElement.classList.contains('parent-tab')) {
            // Current item is already a parent group
            parentGroup = currentTabElement;
        }

        // If we found a parent group, scroll to it; otherwise scroll to the current item
        const targetElement = parentGroup || currentTabElement;
        this.scrollToElement(targetElement);
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