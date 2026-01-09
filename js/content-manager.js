/**
 * Mantik - Content Manager
 * Handles content loading and rendering
 */

class ContentManager {
    constructor(configManager = null) {
        this.configManager = configManager || new ConfigManager();
    }

    /**
     * Extract plain text from a code element, stripping HTML tags
     * @param {HTMLElement} codeElement - The code element to extract text from
     * @returns {string} - Plain text code with preserved whitespace
     */
    extractCodeText(codeElement) {
        if (!codeElement) return '';
        
        // Clone the element to avoid modifying the original
        const clone = codeElement.cloneNode(true);
        
        // Get text content which automatically strips HTML tags and preserves whitespace
        return clone.textContent || clone.innerText || '';
    }

    /**
     * Copy text to clipboard with fallback for older browsers
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} - Success status
     */
    async copyToClipboard(text) {
        try {
            // Modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        } catch (err) {
            console.error('Failed to copy text:', err);
            return false;
        }
    }

    /**
     * Show visual feedback for copy action
     * @param {HTMLElement} button - The copy button element
     */
    showCopyFeedback(button) {
        const originalHTML = button.innerHTML;
        const originalText = button.querySelector('.copy-text');
        const originalIcon = button.querySelector('.copy-icon');
        
        // Update button to show "Copied!" state
        if (originalIcon) {
            originalIcon.textContent = '✓';
        }
        if (originalText) {
            originalText.textContent = 'Copied!';
        }
        button.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
            if (originalIcon) {
                originalIcon.textContent = '📋';
            }
            if (originalText) {
                originalText.textContent = 'Copy';
            }
            button.classList.remove('copied');
        }, 2000);
    }

    /**
     * Create a copy button element
     * @returns {HTMLElement} - Copy button element
     */
    createCopyButton() {
        const copyButton = this.createStyledElement('button', 'code-copy-button', {
            background: 'transparent',
            border: 'none',
            color: 'var(--color-foreground-secondary)',
            cursor: 'pointer',
            fontSize: '0.85em',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-stack)'
        });
        
        copyButton.setAttribute('aria-label', 'Copy code');
        
        const icon = document.createElement('span');
        icon.className = 'copy-icon';
        icon.textContent = '📋';
        icon.style.fontSize = '0.9em';
        
        const text = document.createElement('span');
        text.className = 'copy-text';
        text.textContent = 'Copy';
        
        copyButton.appendChild(icon);
        copyButton.appendChild(text);
        
        // Hover effect
        copyButton.addEventListener('mouseenter', () => {
            copyButton.style.backgroundColor = 'var(--color-background-hover)';
            copyButton.style.color = 'var(--color-brand-primary)';
        });
        
        copyButton.addEventListener('mouseleave', () => {
            if (!copyButton.classList.contains('copied')) {
                copyButton.style.backgroundColor = 'transparent';
                copyButton.style.color = 'var(--color-foreground-secondary)';
            }
        });
        
        return copyButton;
    }

    async loadSectionContent(sectionId) {
        const sectionConfig = await this.configManager.loadSectionConfig(sectionId);
        const contentPromises = [];

        // Handle standalone content files (like homepage)
        if (sectionConfig.file && !sectionConfig.groups && !sectionConfig.intro && !sectionConfig.children) {
            try {
                const data = await this.configManager.loadContentFile(sectionConfig.file);
                const tabInfo = {
                    ...sectionConfig,
                    ...data,
                    sectionId,
                    sectionLabel: sectionConfig.label,
                    loaded: true
                };
                
                appState.addTabData(sectionId, tabInfo);
                appState.allTabs.push(tabInfo);
                return;
            } catch (error) {
                console.error(`Error loading standalone content for ${sectionId}:`, error);
                throw error;
            }
        }

        // Handle sections with sections array (new homepage-style sections)
        // These can also have groups, so we need to store the section config as tab data
        if (sectionConfig.sections && Array.isArray(sectionConfig.sections)) {
            const tabInfo = {
                ...sectionConfig,
                sectionId,
                sectionLabel: sectionConfig.label || sectionConfig.title,
                loaded: true
            };
            
            appState.addTabData(sectionId, tabInfo);
            appState.allTabs.push(tabInfo);
        }

        // Load intro content if exists
        if (sectionConfig.intro) {
            contentPromises.push(this.loadIntroContent(sectionConfig.intro, sectionId, sectionConfig));
        }

        // Load groups content if exists and is an array
        if (Array.isArray(sectionConfig.groups)) {
            contentPromises.push(...this.loadGroupsContent(sectionConfig.groups, sectionId, sectionConfig));
        }

        await Promise.all(contentPromises);
    }

    async loadIntroContent(intro, sectionId, sectionConfig) {
        try {
            if (!intro.file) {
                console.error(`Intro for section ${sectionId} is missing file property:`, intro);
                return;
            }
            
            const data = await this.configManager.loadContentFile(intro.file);
            const tabInfo = {
                ...intro,
                ...data,
                sectionId,
                sectionLabel: sectionConfig.title || sectionConfig.label,
                loaded: true
            };
            
            appState.addTabData(intro.id, tabInfo);
            appState.allTabs.push(tabInfo);
        } catch (error) {
            console.error(`Error loading intro content for ${sectionId} from file ${intro.file}:`, error);
            // Don't throw - allow section to continue loading even if intro fails
        }
    }

    loadGroupsContent(groups, sectionId, sectionConfig) {
        const promises = [];
        groups.forEach(group => {
            // Handle direct items in group
            if (Array.isArray(group.items)) {
                group.items.forEach(item => {
                    promises.push(this.loadItemContent(item, sectionId, sectionConfig, group));
                });
            }
            
            // Handle nested children structure (like FTC config)
            if (Array.isArray(group.children)) {
                group.children.forEach(child => {
                    if (Array.isArray(child.items)) {
                        child.items.forEach(item => {
                            promises.push(this.loadItemContent(item, sectionId, sectionConfig, child));
                        });
                    }
                });
            }
        });
        return promises;
    }

    async loadItemContent(item, sectionId, sectionConfig, group) {
        try {
            const data = await this.configManager.loadContentFile(item.file);
            const tabInfo = {
                ...item,
                ...data,
                sectionId,
                sectionLabel: sectionConfig.title || sectionConfig.label,
                groupId: group.id,
                groupLabel: group.label,
                loaded: true
            };
            
            appState.addTabData(item.id, tabInfo);
            appState.allTabs.push(tabInfo);
        } catch (error) {
            console.error(`Error loading item content ${item.id}:`, error);
        }
    }

    async loadSingleContent(tabId) {
        const tabData = appState.getTabData(tabId);
        if (!tabData || !tabData.file || tabData.loaded) {
            return tabData;
        }

        try {
            const data = await this.configManager.loadContentFile(tabData.file);
            const updatedTabData = { ...tabData, ...data, loaded: true, label: data.title };
            appState.addTabData(tabId, updatedTabData);
            return updatedTabData;
        } catch (error) {
            console.error(`Error loading single content ${tabId}:`, error);
            throw error;
        }
    }

    renderContent(tabId) {
        const data = appState.getTabData(tabId);
        if (!data) {
            console.error(`No data found for tab: ${tabId}`);
            return;
        }
        
        // Update page title based on current content
        this.updatePageTitle(data);
        
        const container = document.getElementById('tab-container');
        container.innerHTML = '';
        
        const tabContent = document.createElement('div');
        tabContent.id = tabId;
        tabContent.className = 'tab-content active';
        
        const section = document.createElement('section');
        section.id = `content-${tabId}`;
        
        const title = document.createElement('h1');
        title.innerHTML = `${data.title}<a class="headerlink" href="#content-${tabId}" title="Link to this heading">¶</a>`;
        section.appendChild(title);
        
        const contentSection = document.createElement('div');
        contentSection.className = 'content-section';
        
        // Render each section (support both 'sections' and 'content')
        const sectionsArray = data.sections || data.content;
        if (sectionsArray && Array.isArray(sectionsArray)) {
            sectionsArray.forEach(sectionData => {
                this.renderSection(contentSection, sectionData);
            });
        }
        
        section.appendChild(contentSection);
        
        // Add navigation buttons at the bottom
        // For section homepages (tabId === sectionId), show a "Start Learning" button if available
        const navButtons = this.createNavigationButtons(tabId);
        console.log(`[Debug] renderContent: tabId=${tabId}, currentSection=${appState.currentSection}, navButtons=${!!navButtons}`);
        if (navButtons) {
            section.appendChild(navButtons);
        } else if (tabId === appState.currentSection && tabId !== 'homepage') {
            // For section homepages, add a button to start the first lesson
            // Ensure section config is loaded first - try both appState and configManager
            let sectionConfig = appState.config?.sections?.[tabId];
            if (!sectionConfig || !(sectionConfig.groups || sectionConfig.children || sectionConfig.items)) {
                // Try to get from config manager cache
                if (this.configManager) {
                    const cachedConfig = this.configManager.configCache?.get(tabId);
                    if (cachedConfig) {
                        sectionConfig = cachedConfig;
                    }
                }
            }
            console.log(`[Debug] renderContent: Checking for Start Learning button. sectionConfig exists: ${!!sectionConfig}, hasGroups: ${!!(sectionConfig?.groups)}, hasChildren: ${!!(sectionConfig?.children)}, hasItems: ${!!(sectionConfig?.items)}`);
            if (sectionConfig && (sectionConfig.groups || sectionConfig.children || sectionConfig.items)) {
                const startButton = this.createStartLearningButton(tabId);
                console.log(`[Debug] renderContent: Start Learning button created: ${!!startButton}`);
                if (startButton) {
                    section.appendChild(startButton);
                    console.log(`[Debug] renderContent: Start Learning button appended to section`);
                }
            } else {
                console.warn(`[Debug] renderContent: Not adding Start Learning button - sectionConfig missing or no groups/children/items`);
            }
        }
        
        tabContent.appendChild(section);
        container.appendChild(tabContent);
    }

    /**
     * Gets the ordered list of tabs for the current section based strictly on configuration
     */
    getSectionTabOrder(sectionId) {
        console.log(`[Debug] getSectionTabOrder called for ${sectionId}`);
        // Try to get config from ConfigManager or appState
        let config = this.configManager ? this.configManager.getSectionConfig(sectionId) : null;
        
        if (!config) {
            config = appState.config && appState.config.sections && appState.config.sections[sectionId];
        }
        
        // If no config found for this section, we can't determine order based on config file
        if (!config) {
            console.warn(`[Debug] No configuration found for section: ${sectionId}`);
            return [];
        }
        
        // Check if config has been fully loaded (has groups/children/items/tiers)
        // If it only has {id, label, file}, it hasn't been loaded yet
        const isFullyLoaded = this.configManager ? this.configManager.isSectionConfigLoaded(sectionId) : 
            !!(config.groups || config.children || config.items || config.tiers || config.intro);
        
        if (!isFullyLoaded && config.file) {
            console.warn(`[Debug] Section config for ${sectionId} appears to not be fully loaded. Has file: ${config.file}, but no groups/children/items.`);
            console.warn(`[Debug] Config keys: ${Object.keys(config).join(', ')}`);
            return [];
        }
        
        const tabOrder = [];
        
        // Helper to add a tab to the order
        const addTab = (item) => {
            // Only add items that are actual pages (have a file property)
            // Groups/folders without content files should not be navigation targets
            if (item && item.id && item.file) {
                tabOrder.push({ 
                    id: item.id, 
                    label: item.label || item.title || item.id,
                    file: item.file
                });
            }
        };
        
        // Add intro if present
        if (config.intro) {
            addTab(config.intro);
        }
        
        // Recursive function to process groups/children/items
        const processItems = (items) => {
            if (!Array.isArray(items)) return;
            
            items.forEach(item => {
                // First, check if this item itself is a page
                addTab(item);

                // Then recurse into children (it can be both a page and a container)
                if (item.items && Array.isArray(item.items)) {
                    processItems(item.items);
                }
                if (item.children && Array.isArray(item.children)) {
                    processItems(item.children);
                }
                if (item.groups && Array.isArray(item.groups)) {
                    processItems(item.groups);
                }
            });
        };
        
        // Process groups (which may contain items or children)
        if (Array.isArray(config.groups)) {
            processItems(config.groups);
        }
        
        // Process children (if used at top level)
        if (Array.isArray(config.children)) {
            processItems(config.children);
        }
        
        // Process top-level items
        if (Array.isArray(config.items)) {
            processItems(config.items);
        }
        
        // Handle tiers structure (for FTC)
        if (Array.isArray(config.tiers)) {
            config.tiers.forEach(tier => {
                if (Array.isArray(tier.lessons)) {
                    tier.lessons.forEach(lesson => {
                        // Extract ID from lesson file path
                        const lessonId = lesson.replace(/^.*\/([^/]+)\.json$/, '$1');
                        // For tiers, we might not have label available directly without loading
                        // We use ID as label fallback
                        tabOrder.push({ 
                            id: lessonId, 
                            label: lessonId, 
                            file: lesson
                        });
                    });
                }
            });
        }
        
        console.log(`[Debug] tabOrder length for ${sectionId}: ${tabOrder.length}`);
        if (tabOrder.length > 0) {
            console.log(`[Debug] First few tabs: ${tabOrder.slice(0, 3).map(t => t.id).join(', ')}`);
        }
        return tabOrder;
    }
    
    /**
     * Gets previous and next tab information for the current tab
     */
    getPreviousNextTabs(currentTabId) {
        const sectionId = appState.currentSection;
        
        console.log(`[Debug] getPreviousNextTabs called for ${currentTabId} in section ${sectionId}`);

        // Don't show navigation for homepage or if section is not found
        if (!sectionId || sectionId === 'homepage') {
            return { previous: null, next: null };
        }
        
        const tabOrder = this.getSectionTabOrder(sectionId);
        
        if (tabOrder.length === 0) {
            console.warn(`[Debug] tabOrder is empty for section ${sectionId}`);
            return { previous: null, next: null };
        }
        
        const currentIndex = tabOrder.findIndex(tab => tab.id === currentTabId);
        console.log(`[Debug] Current tab index: ${currentIndex}`);

        if (currentIndex === -1) {
            console.warn(`[Debug] Current tab ${currentTabId} not found in tab order`);
            return { previous: null, next: null };
        }
        
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : null;
        const nextIndex = currentIndex < tabOrder.length - 1 ? currentIndex + 1 : null;
        
        console.log(`[Debug] Previous index: ${previousIndex}, Next index: ${nextIndex}`);

        // Helper to get full tab info (including title from loaded content if available)
        const getFullTabInfo = (tab) => {
            const loadedData = appState.getTabData(tab.id);
            return {
                id: tab.id,
                label: loadedData?.title || tab.label, // Prefer loaded title, fallback to config label
                file: tab.file
            };
        };
        
        return {
            previous: previousIndex !== null ? getFullTabInfo(tabOrder[previousIndex]) : null,
            next: nextIndex !== null ? getFullTabInfo(tabOrder[nextIndex]) : null
        };
    }
    
    /**
     * Creates navigation buttons for previous/next tabs
     */
    createNavigationButtons(currentTabId) {
        console.log(`[Debug] createNavigationButtons called for ${currentTabId}`);
        // Don't show navigation buttons if sidebar is disabled for this section
        const section = appState.config.sections[appState.currentSection];
        if (section && section.sidebarEnabled === false) {
            return null;
        }
        
        // Don't show navigation buttons if currentTabId is the section ID itself
        // (this means we're viewing the section's homepage, not a tab within it)
        const sectionId = appState.currentSection;
        if (currentTabId === sectionId) {
            return null;
        }
        
        // Debug logging for navigation
        const tabOrder = this.getSectionTabOrder(sectionId);
        console.log(`[Debug] Navigation Debug: Section=${sectionId}, Tab=${currentTabId}, OrderLength=${tabOrder.length}`);
        
        const { previous, next } = this.getPreviousNextTabs(currentTabId);
        
        console.log(`[Debug] Navigation Debug: Previous=${previous?.id}, Next=${next?.id}`);
        
        // Don't show navigation if there's no previous or next tab
        if (!previous && !next) {
            console.warn(`[Debug] No previous or next tab found for: ${currentTabId}`);
            return null;
        }
        
        const navContainer = document.createElement('div');
        navContainer.className = 'page-navigation';
        navContainer.style.display = 'flex'; // Explicitly set display flex
        
        // Previous button
        if (previous) {
            const prevButton = document.createElement('button');
            prevButton.className = 'nav-button nav-button-prev';
            prevButton.innerHTML = `
                <span class="nav-button-icon">←</span>
                <span class="nav-button-content">
                    <span class="nav-button-label">Previous</span>
                    <span class="nav-button-title">${this.escapeHtml(previous.label)}</span>
                </span>
            `;
            prevButton.onclick = (e) => {
                e.preventDefault();
                if (window.app && window.app.navigationManager) {
                    window.app.navigationManager.navigateToTab(previous.id);
                }
            };
            navContainer.appendChild(prevButton);
        } else {
            // Spacer to keep next button on the right
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            navContainer.appendChild(spacer);
        }
        
        // Next button
        if (next) {
            const nextButton = document.createElement('button');
            nextButton.className = 'nav-button nav-button-next';
            nextButton.innerHTML = `
                <span class="nav-button-content">
                    <span class="nav-button-label">Next</span>
                    <span class="nav-button-title">${this.escapeHtml(next.label)}</span>
                </span>
                <span class="nav-button-icon">→</span>
            `;
            nextButton.onclick = (e) => {
                e.preventDefault();
                if (window.app && window.app.navigationManager) {
                    window.app.navigationManager.navigateToTab(next.id);
                }
            };
            navContainer.appendChild(nextButton);
        } else {
            // Spacer to keep prev button on the left if no next button
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            navContainer.appendChild(spacer);
        }
        
        // Ensure the container is visible
        navContainer.style.display = 'flex';
        
        return navContainer;
    }
    
    /**
     * Gets the first tab ID for a section
     */
    getFirstTabIdForSection(sectionId) {
        // Get config from appState (should already be loaded)
        let config = appState.config && appState.config.sections && appState.config.sections[sectionId];
        
        // If config doesn't have groups, try config manager cache
        if (!config || (!config.groups && !config.children && !config.items)) {
            if (this.configManager && this.configManager.configCache) {
                const cachedConfig = this.configManager.configCache.get(sectionId);
                if (cachedConfig && (cachedConfig.groups || cachedConfig.children || cachedConfig.items)) {
                    config = cachedConfig;
                }
            }
        }
        
        if (!config) {
            console.warn(`[Debug] getFirstTabIdForSection: No config found for ${sectionId}`);
            return null;
        }
        
        console.log(`[Debug] getFirstTabIdForSection: Using config with groups: ${!!config.groups}`);
        return this._findFirstTabInConfig(config);
    }

    /**
     * Helper method to find first tab ID in a config object
     */
    _findFirstTabInConfig(config) {
        console.log(`[Debug] _findFirstTabInConfig called. Config has groups: ${!!config.groups}, groups is array: ${Array.isArray(config.groups)}`);
        // Helper function to find first valid item recursively
        const findFirstItem = (items) => {
            if (!Array.isArray(items)) return null;
            for (const item of items) {
                if (item.file) {
                    console.log(`[Debug] Found first item with file: ${item.id}`);
                    return item; // Found a leaf item
                }
                if (item.items && Array.isArray(item.items)) {
                    const found = findFirstItem(item.items);
                    if (found) return found;
                }
                if (item.children && Array.isArray(item.children)) {
                    const found = findFirstItem(item.children);
                    if (found) return found;
                }
                if (item.groups && Array.isArray(item.groups)) {
                    const found = findFirstItem(item.groups);
                    if (found) return found;
                }
            }
            return null;
        };

        let firstItem = null;
        if (config.groups && Array.isArray(config.groups)) {
            console.log(`[Debug] Searching in ${config.groups.length} groups`);
            firstItem = findFirstItem(config.groups);
        }
        if (!firstItem && config.children && Array.isArray(config.children)) {
            firstItem = findFirstItem(config.children);
        }
        if (!firstItem && config.items && Array.isArray(config.items)) {
            firstItem = findFirstItem(config.items);
        }
        
        console.log(`[Debug] _findFirstTabInConfig result: ${firstItem ? firstItem.id : 'null'}`);
        return firstItem ? firstItem.id : null;
    }

    /**
     * Creates a "Start Learning" button for section homepages
     */
    createStartLearningButton(sectionId) {
        const firstTabId = this.getFirstTabIdForSection(sectionId);
        console.log(`[Debug] createStartLearningButton for ${sectionId}: firstTabId=${firstTabId}`);
        if (!firstTabId) {
            console.warn(`[Debug] No first tab found for section ${sectionId}`);
            return null;
        }

        // Get the first tab's label
        const firstTab = appState.getTabData(firstTabId);
        const buttonLabel = firstTab?.title || firstTab?.label || 'Start Learning';
        console.log(`[Debug] Creating Start Learning button with label: ${buttonLabel}`);

        const navContainer = document.createElement('div');
        navContainer.className = 'page-navigation';
        navContainer.style.display = 'flex';
        navContainer.style.justifyContent = 'flex-end'; // Align to right like next button

        const startButton = document.createElement('button');
        startButton.className = 'nav-button nav-button-next';
        startButton.innerHTML = `
            <span class="nav-button-content">
                <span class="nav-button-label">Start Learning</span>
                <span class="nav-button-title">${this.escapeHtml(buttonLabel)}</span>
            </span>
            <span class="nav-button-icon">→</span>
        `;
        startButton.onclick = (e) => {
            e.preventDefault();
            if (window.app && window.app.navigationManager) {
                window.app.navigationManager.navigateToTab(firstTabId);
            }
        };
        
        navContainer.appendChild(startButton);
        return navContainer;
    }

    /**
     * Escapes HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Highlights Java syntax with HTML spans
     */
    highlightJava(code) {
        if (!code) return '';
        
        // Escape HTML first
        let highlighted = this.escapeHtml(code);
        
        // Use a marker system to protect already-highlighted content
        const markers = [];
        let markerIndex = 0;
        
        const mark = (content) => {
            const marker = `\x01MARK${markerIndex++}\x01`;
            markers.push({ marker, content });
            return marker;
        };
        
        // Process in order: comments first, then strings, then everything else
        // This prevents matching inside already-highlighted sections
        
        // Highlight multi-line comments first
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            return mark(`<span class="java-comment">${match}</span>`);
        });
        
        // Highlight single-line comments
        highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
            return mark(`<span class="java-comment">${match}</span>`);
        });
        
        // Highlight string literals (both single and double quotes)
        highlighted = highlighted.replace(/"([^"\\]|\\.)*"/g, (match) => {
            return mark(`<span class="java-string">${match}</span>`);
        });
        highlighted = highlighted.replace(/'([^'\\]|\\.)*'/g, (match) => {
            return mark(`<span class="java-string">${match}</span>`);
        });
        
        // Highlight annotations
        highlighted = highlighted.replace(/@(\w+)/g, (match, annotation) => {
            return mark(`<span class="java-annotation">@${annotation}</span>`);
        });
        
        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, (match) => {
            return mark(`<span class="java-number">${match}</span>`);
        });
        
        // Java keywords
        const keywords = [
            'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
            'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
            'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
            'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
            'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'
        ];
        
        // Highlight keywords
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            highlighted = highlighted.replace(regex, (match) => {
                return mark(`<span class="java-keyword">${match}</span>`);
            });
        });
        
        // Java types
        const types = ['String', 'Integer', 'Double', 'Float', 'Long', 'Boolean', 'Character', 'Byte', 'Short'];
        
        // Highlight types
        types.forEach(type => {
            const regex = new RegExp(`\\b(${type})\\b`, 'g');
            highlighted = highlighted.replace(regex, (match) => {
                return mark(`<span class="java-type">${match}</span>`);
            });
        });
        
        // Literals
        const literals = ['true', 'false', 'null'];
        
        // Highlight literals
        literals.forEach(literal => {
            const regex = new RegExp(`\\b(${literal})\\b`, 'g');
            highlighted = highlighted.replace(regex, (match) => {
                return mark(`<span class="java-literal">${match}</span>`);
            });
        });
        
        // Replace all markers with their actual content (in reverse order to maintain correct replacement)
        for (let i = markers.length - 1; i >= 0; i--) {
            const { marker, content } = markers[i];
            highlighted = highlighted.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), content);
        }
        
        return highlighted;
    }

    /**
     * Updates the page title based on the current content
     */
    updatePageTitle(data) {
        let title = 'Mantik - Programming Fundamentals';
        
        if (data && data.title) {
            // Format: "Page Title - Mantik"
            title = `${data.title} - Mantik`;
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

    renderSection(container, sectionData) {
        const renderers = {
            'text': this.renderTextSection.bind(this),
            'list': this.renderListSection.bind(this),
            'code': this.renderCodeSection.bind(this),
            'code-tabs': this.renderCodeTabsSection.bind(this),
            'rules-box': this.renderRulesBox.bind(this),
            'steps-box': this.renderStepsBox.bind(this),
            'exercise-box': this.renderExerciseBox.bind(this),
            'data-types-grid': this.renderDataTypesGrid.bind(this),
            'logical-operators': this.renderLogicalOperators.bind(this),
            'emphasis-box': this.renderRulesBox.bind(this),
            'link-grid': this.renderLinkGrid.bind(this),
            'section': this.renderSectionTypeSection.bind(this),
            'table': this.renderTableSection.bind(this)
        };

        const renderer = renderers[sectionData.type];
        if (renderer) {
            renderer(container, sectionData);
        } else {
            console.warn(`Unknown section type: ${sectionData.type}`);
        }
    }

    // Helper methods to reduce code duplication
    createSectionTitle(container, title) {
        if (title) {
            const h3 = document.createElement('h3');
            h3.textContent = title;
            container.appendChild(h3);
        }
    }

    createStyledElement(tagName, className, styles = {}) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        Object.assign(element.style, styles);
        return element;
    }

    renderTextSection(container, data) {
        this.createSectionTitle(container, data.title);
        
        const paragraph = document.createElement('p');
        paragraph.innerHTML = data.content;
        container.appendChild(paragraph);
    }

    renderListSection(container, data) {
        this.createSectionTitle(container, data.title);
        
        const list = document.createElement('ul');
        // Defensive: support both 'items' and 'content', and ensure it's an array
        const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.content) ? data.content : []);
        
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = item;
            list.appendChild(listItem);
        });
        
        container.appendChild(list);
    }

    renderCodeSection(container, data) {
        this.createSectionTitle(container, data.title);
        
        // Render description property as HTML (same as content in text sections)
        if (data.description && data.description.trim()) {
            const paragraph = document.createElement('p');
            paragraph.innerHTML = data.description;
            container.appendChild(paragraph);
        }
        
        // Determine what code to render - use content if no code property exists
        const codeToRender = data.code || data.content;
        
        // Only render content as HTML above the code block if there's a code property AND content is different
        // If there's no code property, content IS the code, so don't render it as HTML
        if (data.code && data.content && data.content !== data.code) {
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = data.content;
            container.appendChild(contentDiv);
        }
        
        const codeBlock = this.createStyledElement('div', 'code-block');
        
        // Default to Java if no language is specified
        const language = data.language || 'java';
        codeBlock.classList.add(`language-${language}`);
        
        // Create header with minimize/maximize button
        const codeHeader = this.createStyledElement('div', 'code-header', {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--color-background-secondary)',
            borderBottom: '1px solid var(--color-border)',
            borderRadius: '6px 6px 0 0',
            fontSize: '0.9em',
            color: 'var(--color-foreground-secondary)'
        });
        
        const titleLabel = this.createStyledElement('span', null, {
            fontWeight: '500',
            fontFamily: 'var(--font-stack--monospace)',
            fontSize: '0.85em'
        });
        
        // Use the section title if available, otherwise fall back to language or "JAVA"
        const displayTitle = data.title || (language ? language.toUpperCase() : 'JAVA');
        titleLabel.textContent = displayTitle;
        
        const toggleButton = this.createStyledElement('button', 'code-toggle-btn', {
            background: 'none',
            border: 'none',
            color: 'var(--color-foreground-secondary)',
            cursor: 'pointer',
            fontSize: '1.2em',
            fontWeight: 'bold',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            transition: 'background-color 0.2s'
        });
        
        toggleButton.innerHTML = '−'; // Minus sign for collapse
        
        // Add hover effect
        toggleButton.addEventListener('mouseenter', () => {
            toggleButton.style.backgroundColor = 'var(--color-background-tertiary)';
        });
        
        toggleButton.addEventListener('mouseleave', () => {
            toggleButton.style.backgroundColor = 'transparent';
        });
        
        // Create copy button
        const copyButton = this.createCopyButton();
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const codeText = this.extractCodeText(code);
            const success = await this.copyToClipboard(codeText);
            if (success) {
                this.showCopyFeedback(copyButton);
            } else {
                // Show error feedback
                const originalText = copyButton.querySelector('.copy-text');
                if (originalText) {
                    originalText.textContent = 'Failed';
                    setTimeout(() => {
                        originalText.textContent = 'Copy';
                    }, 2000);
                }
            }
        });
        
        // Create button container
        const buttonContainer = this.createStyledElement('div', null, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(toggleButton);
        
        codeHeader.appendChild(titleLabel);
        codeHeader.appendChild(buttonContainer);
        codeBlock.appendChild(codeHeader);
        
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Set language class on code element for syntax highlighting
        code.className = `language-${language}`;
        
        // Apply Java syntax highlighting if language is Java
        if (language === 'java' || !data.language) {
            code.innerHTML = this.highlightJava(codeToRender);
        } else {
            code.textContent = codeToRender;
        }
        
        pre.appendChild(code);
        codeBlock.appendChild(pre);
        
        // Add toggle functionality - store state on the code block element
        codeBlock.dataset.collapsed = 'false';
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            const isCollapsed = codeBlock.dataset.collapsed === 'true';
            const newState = !isCollapsed;
            codeBlock.dataset.collapsed = newState.toString();
            
            if (newState) {
                pre.style.display = 'none';
                toggleButton.innerHTML = '+'; // Plus sign for expand
                codeBlock.style.borderRadius = '6px';
            } else {
                pre.style.display = 'block';
                toggleButton.innerHTML = '−'; // Minus sign for collapse
                codeBlock.style.borderRadius = '6px 6px 0 0';
            }
        });
        
        container.appendChild(codeBlock);
    }

    renderCodeTabsSection(container, data) {
        this.createSectionTitle(container, data.title);
        
        // Render description property as HTML (same as content in text sections)
        if (data.description && data.description.trim()) {
            const paragraph = document.createElement('p');
            paragraph.innerHTML = data.description;
            container.appendChild(paragraph);
        }
        
        // Render content as HTML if provided (explanation text)
        if (data.content && data.content !== '') {
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = data.content;
            contentDiv.style.marginBottom = '1rem';
            container.appendChild(contentDiv);
        }
        
        // Create tabs container
        const tabsContainer = this.createStyledElement('div', 'code-tabs-container', {
            border: '1px solid var(--color-background-border)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '1rem'
        });
        
        // Create tabs header
        const tabsHeader = this.createStyledElement('div', 'code-tabs-header', {
            display: 'flex',
            background: 'var(--color-background-secondary)',
            borderBottom: '1px solid var(--color-background-border)',
            overflowX: 'auto',
            alignItems: 'center'
        });
        
        // Create tabs wrapper for tab buttons
        const tabsWrapper = this.createStyledElement('div', null, {
            display: 'flex',
            flex: '1',
            overflowX: 'auto'
        });
        
        // Create tabs content container
        const tabsContent = this.createStyledElement('div', 'code-tabs-content');
        
        // Validate tabs data
        if (!data.tabs || !Array.isArray(data.tabs) || data.tabs.length === 0) {
            console.warn('code-tabs section requires a tabs array with at least one tab');
            return;
        }
        
        // Create tabs and content
        let activeTabIndex = 0;
        data.tabs.forEach((tab, index) => {
            // Create tab button
            const tabButton = this.createStyledElement('button', 'code-tab-button', {
                padding: '10px 16px',
                background: index === 0 ? 'var(--color-background)' : 'transparent',
                border: 'none',
                borderBottom: index === 0 ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                color: index === 0 ? 'var(--color-brand-primary)' : 'var(--color-foreground-secondary)',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: index === 0 ? '600' : '400',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-stack--monospace)'
            });
            
            if (index === 0) {
                tabButton.setAttribute('data-active', 'true');
                tabButton.classList.add('active');
            } else {
                tabButton.setAttribute('data-active', 'false');
            }
            
            tabButton.textContent = tab.label || `Tab ${index + 1}`;
            
            // Create tab content
            const tabContent = this.createStyledElement('div', 'code-tab-content', {
                display: index === 0 ? 'flex' : 'none',
                padding: '0',
                flexDirection: 'column'
            });
            
            if (index === 0) {
                tabContent.classList.add('active');
            }
            
            // Create code block for this tab (reuse code section rendering logic)
            const codeBlock = this.createStyledElement('div', 'code-block', {
                border: 'none',
                borderRadius: '0',
                margin: '0'
            });
            
            // Determine code to render
            const codeToRender = tab.code || tab.content || '';
            const language = tab.language || 'java';
            
            // Create code element
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = `language-${language}`;
            
            // Apply syntax highlighting
            if (language === 'java' || !tab.language) {
                code.innerHTML = this.highlightJava(codeToRender);
            } else {
                code.textContent = codeToRender;
            }
            
            pre.appendChild(code);
            codeBlock.appendChild(pre);
            tabContent.appendChild(codeBlock);
            
            // Tab click handler
            tabButton.addEventListener('click', () => {
                // Update all tabs
                data.tabs.forEach((_, i) => {
                    const otherButton = tabsWrapper.children[i];
                    const otherContent = tabsContent.children[i];
                    
                    if (i === index) {
                        // Activate this tab
                        otherButton.style.background = 'var(--color-background)';
                        otherButton.style.borderBottomColor = 'var(--color-brand-primary)';
                        otherButton.style.color = 'var(--color-brand-primary)';
                        otherButton.style.fontWeight = '600';
                        otherButton.setAttribute('data-active', 'true');
                        otherButton.classList.add('active');
                        otherContent.style.display = 'flex';
                        otherContent.style.flexDirection = 'column';
                        otherContent.classList.add('active');
                    } else {
                        // Deactivate other tabs
                        otherButton.style.background = 'transparent';
                        otherButton.style.borderBottomColor = 'transparent';
                        otherButton.style.color = 'var(--color-foreground-secondary)';
                        otherButton.style.fontWeight = '400';
                        otherButton.setAttribute('data-active', 'false');
                        otherButton.classList.remove('active');
                        otherContent.style.display = 'none';
                        otherContent.classList.remove('active');
                    }
                });
                activeTabIndex = index;
            });
            
            // Add hover effect
            tabButton.addEventListener('mouseenter', () => {
                if (index !== activeTabIndex) {
                    tabButton.style.background = 'var(--color-background-tertiary)';
                }
            });
            tabButton.addEventListener('mouseleave', () => {
                if (index !== activeTabIndex) {
                    tabButton.style.background = 'transparent';
                }
            });
            
            tabsWrapper.appendChild(tabButton);
            tabsContent.appendChild(tabContent);
        });
        
        // Create copy button for code tabs (copies active tab)
        const copyButton = this.createCopyButton();
        copyButton.style.marginLeft = 'auto';
        copyButton.style.marginRight = '8px';
        copyButton.style.flexShrink = '0';
        
        // Function to copy active tab's code
        const copyActiveTab = async () => {
            // Use the tracked activeTabIndex to get the correct tab content
            const activeContent = tabsContent.children[activeTabIndex];
            if (activeContent) {
                const activeCode = activeContent.querySelector('code');
                if (activeCode) {
                    const codeText = this.extractCodeText(activeCode);
                    const success = await this.copyToClipboard(codeText);
                    if (success) {
                        this.showCopyFeedback(copyButton);
                    } else {
                        const originalText = copyButton.querySelector('.copy-text');
                        if (originalText) {
                            originalText.textContent = 'Failed';
                            setTimeout(() => {
                                originalText.textContent = 'Copy';
                            }, 2000);
                        }
                    }
                }
            }
        };
        
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            await copyActiveTab();
        });
        
        tabsHeader.appendChild(tabsWrapper);
        tabsHeader.appendChild(copyButton);
        tabsContainer.appendChild(tabsHeader);
        tabsContainer.appendChild(tabsContent);
        container.appendChild(tabsContainer);
    }

    renderRulesBox(container, data) {
        const rulesBox = document.createElement('div');
        rulesBox.className = 'rules-box';
        
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            rulesBox.appendChild(h3);
        }
        
        if (data.subtitle) {
            const h4 = document.createElement('h4');
            h4.textContent = data.subtitle;
            h4.style.marginTop = '0.5rem';
            h4.style.marginBottom = '1rem';
            h4.style.color = 'var(--color-foreground-secondary)';
            h4.style.fontWeight = '500';
            rulesBox.appendChild(h4);
        }
        
        // Handle goodPractices section
        if (data.goodPractices && Array.isArray(data.goodPractices)) {
            const goodPracticesSection = document.createElement('div');
            goodPracticesSection.style.marginBottom = '1.5rem';
            
            const goodPracticesTitle = document.createElement('h5');
            goodPracticesTitle.textContent = 'Good Practices:';
            goodPracticesTitle.style.marginBottom = '0.5rem';
            goodPracticesTitle.style.color = 'var(--color-success)';
            goodPracticesTitle.style.fontWeight = '600';
            goodPracticesSection.appendChild(goodPracticesTitle);
            
            const goodPracticesList = document.createElement('ul');
            goodPracticesList.style.margin = '0';
            goodPracticesList.style.paddingLeft = '1.5rem';
            
            data.goodPractices.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = item;
                li.style.marginBottom = '0.5rem';
                li.style.lineHeight = '1.5';
                goodPracticesList.appendChild(li);
            });
            goodPracticesSection.appendChild(goodPracticesList);
            rulesBox.appendChild(goodPracticesSection);
        }
        
        // Handle avoid section
        if (data.avoid && Array.isArray(data.avoid)) {
            const avoidSection = document.createElement('div');
            avoidSection.style.marginBottom = '1.5rem';
            
            const avoidTitle = document.createElement('h5');
            avoidTitle.textContent = 'Avoid:';
            avoidTitle.style.marginBottom = '0.5rem';
            avoidTitle.style.color = 'var(--color-error)';
            avoidTitle.style.fontWeight = '600';
            avoidSection.appendChild(avoidTitle);
            
            const avoidList = document.createElement('ul');
            avoidList.style.margin = '0';
            avoidList.style.paddingLeft = '1.5rem';
            
            data.avoid.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = item;
                li.style.marginBottom = '0.5rem';
                li.style.lineHeight = '1.5';
                avoidList.appendChild(li);
            });
            avoidSection.appendChild(avoidList);
            rulesBox.appendChild(avoidSection);
        }
        
        // Handle legacy items (for backward compatibility)
        if (data.items && Array.isArray(data.items)) {
            const itemsList = document.createElement('ul');
            itemsList.style.margin = '0';
            itemsList.style.paddingLeft = '1.5rem';
            
            data.items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = item;
                li.style.marginBottom = '0.5rem';
                li.style.lineHeight = '1.5';
                itemsList.appendChild(li);
            });
            rulesBox.appendChild(itemsList);
        }
        
        if (data.content) {
            const content = document.createElement('div');
            content.innerHTML = data.content;
            content.style.marginTop = '1rem';
            rulesBox.appendChild(content);
        }
        
        container.appendChild(rulesBox);
    }

    renderStepsBox(container, data) {
        const stepsBox = document.createElement('div');
        stepsBox.className = 'rules-box';
        
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            stepsBox.appendChild(h3);
        }
        
        if (data.subtitle) {
            const h4 = document.createElement('h4');
            h4.textContent = data.subtitle;
            h4.style.marginTop = '0.5rem';
            h4.style.marginBottom = '1rem';
            h4.style.color = 'var(--color-foreground-secondary)';
            h4.style.fontWeight = '500';
            stepsBox.appendChild(h4);
        }
        
        // Handle steps items (ordered list)
        if (data.items && Array.isArray(data.items)) {
            const stepsList = document.createElement('ol');
            stepsList.style.margin = '0';
            stepsList.style.paddingLeft = '1.5rem';
            stepsList.style.listStyleType = 'decimal';
            
            data.items.forEach(item => {
                const li = document.createElement('li');
                li.style.marginBottom = '0.75rem';
                li.style.lineHeight = '1.6';
                
                // Handle both string items and object items with subitems
                if (typeof item === 'string') {
                    li.innerHTML = item;
                } else if (typeof item === 'object' && item.text) {
                    li.innerHTML = item.text;
                    
                    // Handle subitems if present
                    if (item.subitems && Array.isArray(item.subitems)) {
                        const subList = document.createElement('ul');
                        subList.style.marginTop = '0.5rem';
                        subList.style.marginBottom = '0';
                        subList.style.paddingLeft = '1.5rem';
                        subList.style.listStyleType = 'disc';
                        
                        item.subitems.forEach(subitem => {
                            const subLi = document.createElement('li');
                            subLi.innerHTML = subitem;
                            subLi.style.marginBottom = '0.25rem';
                            subLi.style.lineHeight = '1.5';
                            subList.appendChild(subLi);
                        });
                        
                        li.appendChild(subList);
                    }
                }
                
                stepsList.appendChild(li);
            });
            stepsBox.appendChild(stepsList);
        }
        
        if (data.content) {
            const content = document.createElement('div');
            content.innerHTML = data.content;
            content.style.marginTop = '1rem';
            stepsBox.appendChild(content);
        }
        
        container.appendChild(stepsBox);
    }

    renderExerciseBox(container, data) {
        const exerciseBox = document.createElement('div');
        exerciseBox.className = 'exercise-box';

        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            exerciseBox.appendChild(h3);
        }
        
        if (data.subtitle) {
            const subtitle = document.createElement('h4');
            subtitle.textContent = data.subtitle;
            exerciseBox.appendChild(subtitle);
        }
        
        if (data.description) {
            const desc = document.createElement('p');
            desc.innerHTML = data.description;
            exerciseBox.appendChild(desc);
        }

        // Only render content as HTML above the code block if there's a code property AND content is different
        // If there's no code property, content IS the code, so don't render it as HTML
        if (data.code && data.content && data.content !== data.code && typeof data.content === 'string') {
            const contentP = document.createElement('p');
            contentP.innerHTML = data.content;
            exerciseBox.appendChild(contentP);
        }

        if (data.tasks) {
            const tasksList = document.createElement('ul');
            data.tasks.forEach(task => {
                const li = document.createElement('li');
                li.innerHTML = task;
                tasksList.appendChild(li);
            });
            exerciseBox.appendChild(tasksList);
        }

        // Only render code section if there's actual code or content to display
        const codeToRender = data.code || data.content;
        if (codeToRender && codeToRender.trim() !== '') {
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';
            // Default to Java if no language is specified
            const exerciseLanguage = data.language || 'java';
            codeBlock.classList.add(`language-${exerciseLanguage}`);
            
            // Create header with minimize/maximize button for exercise code
            const codeHeader = document.createElement('div');
            codeHeader.className = 'code-header';
            codeHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: var(--color-background-secondary);
                border-bottom: 1px solid var(--color-border);
                border-radius: 6px 6px 0 0;
                font-size: 0.9em;
                color: var(--color-foreground-secondary);
            `;
            
            const titleLabel = document.createElement('span');
            // Use the section title if available, otherwise fall back to language or "JAVA"
            const displayTitle = data.title || (exerciseLanguage ? exerciseLanguage.toUpperCase() : 'JAVA');
            titleLabel.textContent = displayTitle;
            titleLabel.style.cssText = `
                font-weight: 500;
                font-family: var(--font-stack--monospace);
                font-size: 0.85em;
            `;
            
            const toggleButton = document.createElement('button');
            toggleButton.className = 'code-toggle-btn';
            toggleButton.innerHTML = '−'; // Minus sign for collapse
            toggleButton.style.cssText = `
                background: none;
                border: none;
                color: var(--color-foreground-secondary);
                cursor: pointer;
                font-size: 1.2em;
                font-weight: bold;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 3px;
                transition: background-color 0.2s;
            `;
            
            // Add hover effect
            toggleButton.addEventListener('mouseenter', () => {
                toggleButton.style.backgroundColor = 'var(--color-background-tertiary)';
            });
            
            toggleButton.addEventListener('mouseleave', () => {
                toggleButton.style.backgroundColor = 'transparent';
            });
            
            codeHeader.appendChild(titleLabel);
            codeHeader.appendChild(toggleButton);
            codeBlock.appendChild(codeHeader);
            
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            // Set language class on code element for syntax highlighting
            code.className = `language-${exerciseLanguage}`;
            
            // Apply Java syntax highlighting if language is Java
            if (exerciseLanguage === 'java' || !data.language) {
                code.innerHTML = this.highlightJava(codeToRender);
            } else {
                code.textContent = codeToRender;
            }
            
            pre.appendChild(code);
            codeBlock.appendChild(pre);
            
            // Add toggle functionality - store state on the code block element
            codeBlock.dataset.collapsed = 'false';
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const isCollapsed = codeBlock.dataset.collapsed === 'true';
                const newState = !isCollapsed;
                codeBlock.dataset.collapsed = newState.toString();
                
                if (newState) {
                    pre.style.display = 'none';
                    toggleButton.innerHTML = '+'; // Plus sign for expand
                    codeBlock.style.borderRadius = '6px';
                } else {
                    pre.style.display = 'block';
                    toggleButton.innerHTML = '−'; // Minus sign for collapse
                    codeBlock.style.borderRadius = '6px 6px 0 0';
                }
            });
            
            exerciseBox.appendChild(codeBlock);
        }

        // Show/hide answers button and section
        if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'answer-toggle-btn';
            toggleBtn.textContent = 'Show Answers';
            let answersVisible = false;

            const answerSection = document.createElement('div');
            answerSection.className = 'answer-section hidden';

            // Add answers
            data.answers.forEach((answer, index) => {
                const answerItem = document.createElement('div');
                answerItem.className = 'answer-item';

                if (answer.task) {
                    const taskLabel = document.createElement('div');
                    taskLabel.className = 'answer-task-label';
                    taskLabel.textContent = answer.task;
                    answerItem.appendChild(taskLabel);
                }

                if (answer.content) {
                    const codeBlock = document.createElement('div');
                    codeBlock.className = 'code-block';
                    // Add language class if specified
                    if (answer.language) {
                        codeBlock.classList.add(`language-${answer.language}`);
                    }
                    
                    // Create header with minimize/maximize button for answer code
                    const codeHeader = document.createElement('div');
                    codeHeader.className = 'code-header';
                    codeHeader.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        background: var(--color-background-secondary);
                        border-bottom: 1px solid var(--color-border);
                        border-radius: 6px 6px 0 0;
                        font-size: 0.9em;
                        color: var(--color-foreground-secondary);
                    `;
                    
                    const titleLabel = document.createElement('span');
                    // Use the task title if available, otherwise fall back to language or "CODE"
                    const displayTitle = answer.task || (answer.language ? answer.language.toUpperCase() : 'CODE');
                    titleLabel.textContent = displayTitle;
                    titleLabel.style.cssText = `
                        font-weight: 500;
                        font-family: var(--font-stack--monospace);
                        font-size: 0.85em;
                    `;
                    
                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'code-toggle-btn';
                    toggleButton.innerHTML = '−'; // Minus sign for collapse
                    toggleButton.style.cssText = `
                        background: none;
                        border: none;
                        color: var(--color-foreground-secondary);
                        cursor: pointer;
                        font-size: 1.2em;
                        font-weight: bold;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 3px;
                        transition: background-color 0.2s;
                    `;
                    
                    // Add hover effect
                    toggleButton.addEventListener('mouseenter', () => {
                        toggleButton.style.backgroundColor = 'var(--color-background-tertiary)';
                    });
                    
                    toggleButton.addEventListener('mouseleave', () => {
                        toggleButton.style.backgroundColor = 'transparent';
                    });
                    
                    codeHeader.appendChild(titleLabel);
                    codeHeader.appendChild(toggleButton);
                    codeBlock.appendChild(codeHeader);
                    
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    // Default to Java if no language is specified
                    const answerLanguage = answer.language || 'java';
                    code.className = `language-${answerLanguage}`;
                    
                    // Apply Java syntax highlighting if language is Java
                    if (answerLanguage === 'java' || !answer.language) {
                        code.innerHTML = this.highlightJava(answer.content);
                    } else {
                        code.textContent = answer.content;
                    }
                    
                    pre.appendChild(code);
                    codeBlock.appendChild(pre);
                    
                    // Add toggle functionality - store state on the code block element
                    codeBlock.dataset.collapsed = 'false';
                    toggleButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        const isCollapsed = codeBlock.dataset.collapsed === 'true';
                        const newState = !isCollapsed;
                        codeBlock.dataset.collapsed = newState.toString();
                        
                        if (newState) {
                            pre.style.display = 'none';
                            toggleButton.innerHTML = '+'; // Plus sign for expand
                            codeBlock.style.borderRadius = '6px';
                        } else {
                            pre.style.display = 'block';
                            toggleButton.innerHTML = '−'; // Minus sign for collapse
                            codeBlock.style.borderRadius = '6px 6px 0 0';
                        }
                    });
                    
                    answerItem.appendChild(codeBlock);
                }

                answerSection.appendChild(answerItem);
            });

            toggleBtn.addEventListener('click', () => {
                answersVisible = !answersVisible;
                
                if (!answersVisible) {
                    // Show answers
                    answerSection.classList.remove('hidden');
                    answerSection.classList.add('visible');
                    toggleBtn.textContent = 'Show Answers';
                    toggleBtn.classList.add('active');
                } else {
                    // Hide answers
                    answerSection.classList.remove('visible');
                    answerSection.classList.add('hidden');
                    toggleBtn.textContent = 'Hide Answers';
                    toggleBtn.classList.remove('active');
                }
            });

            exerciseBox.appendChild(toggleBtn);
            exerciseBox.appendChild(answerSection);
        }

        container.appendChild(exerciseBox);
    }

    renderDataTypesGrid(container, data) {
        const grid = document.createElement('div');
        grid.className = 'data-types-grid';
        
        data.types.forEach(type => {
            const typeBox = document.createElement('div');
            typeBox.className = 'data-type';
            
            const name = document.createElement('h4');
            name.textContent = type.name;
            typeBox.appendChild(name);
            
            const description = document.createElement('p');
            description.textContent = type.description;
            typeBox.appendChild(description);
            
            if (type.example) {
                const example = document.createElement('code');
                example.textContent = type.example;
                typeBox.appendChild(example);
            }
            
            grid.appendChild(typeBox);
        });
        
        container.appendChild(grid);
    }

    renderLogicalOperators(container, data) {
        const logicalOperatorsBox = document.createElement('div');
        logicalOperatorsBox.className = 'logical-operators-box';
        
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            logicalOperatorsBox.appendChild(h3);
        }
        
        if (data.subtitle) {
            const h4 = document.createElement('h4');
            h4.textContent = data.subtitle;
            logicalOperatorsBox.appendChild(h4);
        }
        
        if (data.operators && Array.isArray(data.operators)) {
            const operatorsList = document.createElement('ul');
            data.operators.forEach(operator => {
                const li = document.createElement('li');
                li.innerHTML = operator;
                operatorsList.appendChild(li);
            });
            logicalOperatorsBox.appendChild(operatorsList);
        }
        
        if (data.examples) {
            const examplesDiv = document.createElement('div');
            examplesDiv.className = 'logical-operators-examples';
            
            const examplesTitle = document.createElement('h4');
            examplesTitle.textContent = 'Examples:';
            examplesDiv.appendChild(examplesTitle);
            
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = data.examples;
            pre.appendChild(code);
            codeBlock.appendChild(pre);
            examplesDiv.appendChild(codeBlock);
            logicalOperatorsBox.appendChild(examplesDiv);
        }
        
        container.appendChild(logicalOperatorsBox);
    }

    renderLinkGrid(container, data) {
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            container.appendChild(h3);
        }
        
        const grid = document.createElement('div');
        grid.className = 'link-grid';
        
        // Handle 'links', 'items', or 'content' properties for compatibility
        const links = data.links || data.items || data.content || [];
        
        if (!Array.isArray(links)) {
            console.warn('Link grid data is not an array:', links);
            return;
        }
        
        links.forEach(link => {
            const linkButton = document.createElement('div');
            linkButton.className = 'link-grid-button';
            
            // Handle different link formats
            if (typeof link === 'string') {
                // Parse HTML string to extract text and href
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = link;
                const anchor = tempDiv.querySelector('a');
                
                if (anchor) {
                    // Extract text content (remove HTML tags)
                    const textContent = anchor.textContent || anchor.innerText || 'Link';
                    linkButton.textContent = textContent;
                    
                    if (anchor.href) {
                        linkButton.setAttribute('data-url', anchor.href);
                    }
                    
                    linkButton.onclick = () => {
                        // Always open external links in new tab
                        if (anchor.href && (anchor.href.startsWith('http') || anchor.href.startsWith('https'))) {
                            window.open(anchor.href, '_blank', 'noopener,noreferrer');
                        } else if (anchor.target === '_blank') {
                            window.open(anchor.href, '_blank', 'noopener,noreferrer');
                        } else {
                            window.location.href = anchor.href;
                        }
                    };
                } else {
                    // Fallback if no anchor found
                    linkButton.textContent = link;
                }
            } else if (link.url) {
                // External link format
                linkButton.setAttribute('data-url', link.url);
                linkButton.onclick = () => {
                    // Always open external URLs in new tab
                    if (link.url.startsWith('http') || link.url.startsWith('https') || link.external) {
                        window.open(link.url, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = link.url;
                    }
                };
                linkButton.textContent = link.title || link.label;
            } else if (link.id) {
                // Internal navigation format (like homepage)
                linkButton.setAttribute('data-tab-id', link.id);
                linkButton.onclick = () => {
                    if (app && app.navigationManager) {
                        app.navigationManager.navigateToTab(link.id);
                    }
                };
                linkButton.textContent = link.label || link.title;
            }
            
            // Add under construction badge if applicable
            if (link.underConstruction) {
                linkButton.classList.add('under-construction');
                const badge = document.createElement('span');
                badge.className = 'under-construction-badge';
                badge.textContent = 'Coming Soon';
                linkButton.appendChild(badge);
            }
            
            // Add description if provided
            if (link.description) {
                const descSpan = document.createElement('span');
                descSpan.className = 'link-grid-description';
                descSpan.textContent = link.description;
                linkButton.appendChild(descSpan);
            }
            
            grid.appendChild(linkButton);
        });
        
        container.appendChild(grid);
    }

    renderSectionTypeSection(container, data) {
        // Render the title as an <h3> if present
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            container.appendChild(h3);
        }
        // Render the content as HTML if present
        if (data.content) {
            const div = document.createElement('div');
            div.innerHTML = data.content;
            container.appendChild(div);
        }
        // Optionally, support nested sections in the future
    }

    renderTableSection(container, data) {
        if (data.title) {
            const h3 = document.createElement('h3');
            h3.textContent = data.title;
            container.appendChild(h3);
        }
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        const table = document.createElement('table');
        table.className = 'content-table';
        
        // Create table header
        if (data.headers && Array.isArray(data.headers)) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            data.headers.forEach(header => {
                const th = document.createElement('th');
                th.innerHTML = header;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
        }
        
        // Create table body
        if (data.rows && Array.isArray(data.rows)) {
            const tbody = document.createElement('tbody');
            
            data.rows.forEach(row => {
                const tr = document.createElement('tr');
                
                row.forEach(cell => {
                    const td = document.createElement('td');
                    td.innerHTML = cell;
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
        }
        
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);
    }

    toggleAllCodeBlocks() {
        // Find all code blocks with a code-toggle-btn
        const codeBlocks = document.querySelectorAll('.code-block');
        if (!codeBlocks.length) return;

        // Determine if we should collapse or expand (collapse if any are open)
        let shouldCollapse = false;
        for (const block of codeBlocks) {
            const pre = block.querySelector('pre');
            const isCurrentlyCollapsed = block.dataset.collapsed === 'true';
            // Check if block is actually visible (not collapsed)
            if (pre && !isCurrentlyCollapsed && pre.style.display !== 'none') {
                shouldCollapse = true;
                break;
            }
        }

        for (const block of codeBlocks) {
            const pre = block.querySelector('pre');
            const toggleBtn = block.querySelector('.code-toggle-btn');
            if (!pre || !toggleBtn) continue;
            
            // Update the data attribute to reflect the new state
            block.dataset.collapsed = shouldCollapse ? 'true' : 'false';
            
            if (shouldCollapse) {
                pre.style.display = 'none';
                toggleBtn.innerHTML = '+';
                block.style.borderRadius = '6px';
            } else {
                pre.style.display = 'block';
                toggleBtn.innerHTML = '−';
                block.style.borderRadius = '6px 6px 0 0';
            }
        }

        // Show notification
        const action = shouldCollapse ? 'Collapsed' : 'Expanded';
        this.showNotification(`${action} code blocks`);
    }

    showNotification(message, duration = 3000) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification-popup');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification-popup';
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: calc(var(--header-height) + 10px);
            right: 20px;
            background: var(--color-background-secondary);
            color: var(--color-foreground-secondary);
            padding: 6px 10px;
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--color-background-border);
            font-family: var(--font-stack--monospace);
            font-size: 0.75rem;
            font-weight: 400;
            z-index: 10000;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s ease;
            max-width: 200px;
            word-wrap: break-word;
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // Auto remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        }, duration);

        // Allow manual dismissal on click
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentManager;
} 