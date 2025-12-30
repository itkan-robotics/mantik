/**
 * Mantik - Search Manager
 * Handles global search functionality
 */

class SearchManager {
    constructor(contentManager = null, navigationManager = null) {
        this.searchResults = [];
        this.currentSearchQuery = '';
        this.contentManager = contentManager;
        this.navigationManager = navigationManager;
        this.searchTimeout = null;
        this.suggestionTimeout = null;
        this.isSearching = false;
        this.searchIndex = null;
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
        this.useIndex = false; // Flag to use new index system
        this.setupSearch();
    }

    /**
     * Set the search index instance
     */
    setSearchIndex(searchIndex) {
        this.searchIndex = searchIndex;
        this.useIndex = searchIndex && searchIndex.isIndexed;
    }

    setupSearch() {
        const searchInput = document.getElementById('header-search');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('focus', () => {
                if (this.currentSearchQuery && this.searchResults.length > 0) {
                    this.showResults();
                } else if (this.currentSearchQuery && this.currentSearchQuery.length < 3) {
                    this.showSuggestions(this.currentSearchQuery);
                }
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e, searchInput);
            });
        }
        // Also set up mobile sidebar search
        const mobileSearchInput = document.getElementById('mobile-sidebar-search');
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            mobileSearchInput.addEventListener('focus', () => {
                if (this.currentSearchQuery && this.searchResults.length > 0) {
                    this.showResults();
                } else if (this.currentSearchQuery && this.currentSearchQuery.length < 3) {
                    this.showSuggestions(this.currentSearchQuery);
                }
            });

            // Keyboard navigation
            mobileSearchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e, mobileSearchInput);
            });
        }
        // Close search results when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.search-container-header') && 
                !e.target.closest('.search-results') &&
                !e.target.closest('.search-suggestions') &&
                !e.target.closest('.mobile-sidebar-search-container')) {
                this.hideResults();
            }
        });
    }

    handleSearchKeydown(e, input) {
        const suggestionsDiv = document.querySelector('.search-suggestions');
        const resultsDiv = document.querySelector('.search-results:not(.search-suggestions)');
        
        // Handle suggestions navigation
        if (suggestionsDiv && this.suggestions.length > 0) {
            const items = suggestionsDiv.querySelectorAll('.search-suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(
                    this.selectedSuggestionIndex + 1,
                    items.length - 1
                );
                this.highlightSuggestion(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.highlightSuggestion(items);
            } else if (e.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
                e.preventDefault();
                const selected = this.suggestions[this.selectedSuggestionIndex];
                input.value = selected;
                this.handleSearchInput(selected);
            } else if (e.key === 'Escape') {
                this.hideResults();
                input.blur();
            }
            return;
        }
        
        // Handle results navigation
        if (resultsDiv && this.searchResults.length > 0) {
            const items = resultsDiv.querySelectorAll('.search-result-item, [data-search-result]');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const currentIndex = Array.from(items).findIndex(item => 
                    item.classList.contains('selected')
                );
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items.forEach(item => item.classList.remove('selected'));
                if (items[nextIndex]) {
                    items[nextIndex].classList.add('selected');
                    items[nextIndex].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const currentIndex = Array.from(items).findIndex(item => 
                    item.classList.contains('selected')
                );
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items.forEach(item => item.classList.remove('selected'));
                if (items[prevIndex]) {
                    items[prevIndex].classList.add('selected');
                    items[prevIndex].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Enter') {
                const selected = resultsDiv.querySelector('.selected');
                if (selected) {
                    e.preventDefault();
                    selected.click();
                }
            } else if (e.key === 'Escape') {
                this.hideResults();
                input.blur();
            }
        }
    }

    highlightSuggestion(items) {
        items.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.style.backgroundColor = 'var(--color-sidebar-item-background--hover)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.backgroundColor = '';
            }
        });
    }

    handleSearchInput(query) {
        // Clear existing timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        if (this.suggestionTimeout) {
            clearTimeout(this.suggestionTimeout);
        }
        
        // Store current query and save to app state
        this.currentSearchQuery = query;
        appState.setSearchQuery(query);
        
        if (!query.trim()) {
            this.hideResults();
            this.suggestions = [];
            this.selectedSuggestionIndex = -1;
            return;
        }
        
        // Show suggestions for short queries, full search for longer ones
        if (query.length < 3 && this.useIndex) {
            this.showSuggestions(query);
        } else {
            // Show loading state
            this.showLoadingState();
            
            // Debounce search
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 150);
        }
    }

    showLoadingState() {
        this.hideResults();
        
        const searchContainer = this.getSearchContainer();
        if (!searchContainer) return;
        
        // Check if this is the mobile sidebar search
        const isMobileSearch = searchContainer.classList.contains('mobile-sidebar-search-container');
        
        const loadingDiv = this.createSearchResultsContainer(isMobileSearch);
        loadingDiv.textContent = 'Searching...';
        
        searchContainer.appendChild(loadingDiv);
    }

    // Helper method to create search results container
    createSearchResultsContainer(isMobileSearch = false) {
        const container = document.createElement('div');
        container.className = 'search-results';
        
        // Calculate available viewport space
        const searchContainer = this.getSearchContainer();
        let maxHeight = isMobileSearch ? '60vh' : '400px';
        
        if (searchContainer) {
            const containerRect = searchContainer.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const spaceBelow = viewportHeight - containerRect.bottom;
            
            // Use available space below, but leave some margin
            const availableSpace = Math.max(spaceBelow - 20, 100); // 20px margin from bottom
            maxHeight = `${Math.min(availableSpace, isMobileSearch ? viewportHeight * 0.6 : 400)}px`;
        }
        
        const baseStyles = {
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            width: '100%',
            maxWidth: 'calc(100vw - 2rem)', // Prevent overflow with viewport margin
            backgroundColor: 'var(--color-sidebar-background)',
            border: '2px solid var(--color-background-border)',
            borderRadius: '0.75rem',
            zIndex: '1000',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            marginTop: '0.5rem',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--color-sidebar-link-text)',
            maxHeight: maxHeight,
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
        };
        
        Object.assign(container.style, baseStyles);
        return container;
    }

    async performSearch(query) {
        if (this.isSearching) return;
        
        this.isSearching = true;
        const searchQuery = query.toLowerCase().trim();
        
        if (!searchQuery) {
            this.hideResults();
            this.isSearching = false;
            return;
        }
        
        try {
            this.searchResults = [];
            
            // Use lunr.js index system if available
            if (this.useIndex && this.searchIndex) {
                // lunr.js handles fuzzy matching automatically
                const indexResults = this.searchIndex.search(query, 50);
                this.processIndexResults(indexResults, query);
            } else {
                // Fallback to old search method
                await this.searchAllTabs(searchQuery);
                this.sortResults();
            }
            
            this.showResults();
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Process results from search index (lunr.js format)
     */
    processIndexResults(indexResults, query) {
        // Get the current section - only include results from the selected section
        const currentSectionId = appState.currentSection;
        
        indexResults.forEach(result => {
            const doc = this.searchIndex.getDocument(result.docId);
            if (!doc) return;
            
            // Filter by current section if one is selected
            if (currentSectionId && doc.sectionId !== currentSectionId) {
                return; // Skip results from other sections
            }
            
            // For lunr.js results, we create a result based on the document
            // The score from lunr already reflects relevance
            const docData = doc.content;
            if (!docData) return;
            
            // Determine the best match type by checking what actually contains the query
            // Only mark as "title" if the title actually contains the query
            const queryLower = query.toLowerCase();
            let text = '';
            let snippet = '';
            let matchType = null;
            
            // Check if title actually contains the query
            const titleLower = doc.title ? doc.title.toLowerCase() : '';
            if (titleLower.includes(queryLower)) {
                text = doc.title;
                snippet = doc.title;
                matchType = 'title';
            } else {
                // Check section titles, content, code, etc.
                const sections = docData.sections || docData.content || [];
                
                if (Array.isArray(sections)) {
                    for (const section of sections) {
                        // Check section title
                        if (section.title) {
                            const sectionTitleLower = this.stripHTML(section.title).toLowerCase();
                            if (sectionTitleLower.includes(queryLower)) {
                                text = this.stripHTML(section.title);
                                snippet = text;
                                matchType = 'section-title';
                                break;
                            }
                        }
                        
                        // Check section content
                        if (!matchType && section.content) {
                            const contentText = this.stripHTML(section.content);
                            if (contentText.toLowerCase().includes(queryLower)) {
                                text = contentText;
                                snippet = this.createSnippet(contentText, query, 80);
                                matchType = 'content';
                                break;
                            }
                        }
                        
                        // Code sections are ignored in search - skip checking code
                        
                        // Check list items
                        if (!matchType && section.items && Array.isArray(section.items)) {
                            for (const item of section.items) {
                                if (typeof item === 'string') {
                                    const itemText = this.stripHTML(item);
                                    if (itemText.toLowerCase().includes(queryLower)) {
                                        text = itemText;
                                        snippet = this.createSnippet(itemText, query, 60);
                                        matchType = 'list-item';
                                        break;
                                    }
                                }
                            }
                            if (matchType) break;
                        }
                    }
                }
                
                // If still no match found, lunr found something but we can't locate it exactly
                // Show as content match with a snippet from the first section's content
                if (!matchType) {
                    const sections = docData.sections || docData.content || [];
                    if (Array.isArray(sections) && sections.length > 0) {
                        // Try to find any content that might contain the query
                        for (const section of sections) {
                            if (section.content) {
                                const contentText = this.stripHTML(section.content);
                                text = contentText;
                                snippet = this.createSnippet(contentText, query, 80);
                                matchType = 'content';
                                break;
                            }
                        }
                        // If no content found, don't show this result
                        if (!matchType) {
                            return; // Skip this result if we can't find where the match is
                        }
                    } else {
                        // No sections at all, skip this result
                        return;
                    }
                }
            }
            
            if (text) {
                this.searchResults.push({
                    type: matchType,
                    text: snippet || text,
                    fullText: text,
                    section: doc.sectionLabel || 'Unknown',
                    group: doc.groupLabel || 'Unknown',
                    tabId: doc.id,
                    score: result.score || 0,
                    priority: this.getPriorityFromType(matchType),
                    metadata: doc
                });
            }
        });
        
        // Sort by score/priority (lunr.js already provides good scoring)
        this.searchResults.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            if (a.score !== undefined && b.score !== undefined) {
                return b.score - a.score;
            }
            return 0;
        });
        
        // Deduplicate
        const seen = new Set();
        this.searchResults = this.searchResults.filter(result => {
            const key = `${result.tabId}|${result.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    getPriorityFromType(type) {
        const priorities = {
            'title': 1,
            'code-label': 1.5,
            'section-title': 2,
            'list-item': 3,
            'content': 4,
            'code': 5
        };
        return priorities[type] || 5;
    }

    stripHTML(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Show search suggestions
     */
    showSuggestions(query) {
        if (!this.useIndex || !this.searchIndex) {
            return;
        }
        
        this.suggestions = this.searchIndex.getSuggestions(query, 8);
        this.selectedSuggestionIndex = -1;
        
        if (this.suggestions.length === 0) {
            this.hideResults();
            return;
        }
        
        this.hideResults();
        
        const searchContainer = this.getSearchContainer();
        if (!searchContainer) return;
        
        const isMobileSearch = searchContainer.classList.contains('mobile-sidebar-search-container');
        const suggestionsDiv = this.createSearchResultsContainer(isMobileSearch);
        suggestionsDiv.className = 'search-suggestions';
        suggestionsDiv.style.textAlign = 'left';
        // maxHeight is already calculated in createSearchResultsContainer based on viewport
        // overflowY is already set in createSearchResultsContainer
        
        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'search-suggestion-item';
            item.style.cssText = `
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: background-color 0.15s ease;
                border-bottom: 1px solid var(--color-background-border);
            `;
            
            const highlighted = this.highlightQuery(suggestion, query);
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="opacity: 0.5;">🔍</span>
                    <span>${highlighted}</span>
                </div>
            `;
            
            item.addEventListener('click', () => {
                const searchInput = document.activeElement;
                if (searchInput && (searchInput.id === 'header-search' || searchInput.id === 'mobile-sidebar-search')) {
                    searchInput.value = suggestion;
                    this.handleSearchInput(suggestion);
                }
            });
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--color-sidebar-item-background--hover)';
                this.selectedSuggestionIndex = index;
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
            
            suggestionsDiv.appendChild(item);
        });
        
        searchContainer.appendChild(suggestionsDiv);
    }

    async searchAllTabs(query) {
        // Get the current section - only search within the selected section
        const currentSectionId = appState.currentSection;
        
        if (!currentSectionId) {
            // If no section is selected, search all sections (fallback)
            if (appState.allTabs) {
                for (const tab of appState.allTabs) {
                    await this.searchTab(tab, query);
                }
            }
            
            const sections = appState.config.sections;
            if (sections) {
                for (const sectionId in sections) {
                    await this.searchSection(sectionId, sections[sectionId], query);
                }
            }
            return;
        }
        
        // Search only within the current section
        const currentSection = appState.config.sections[currentSectionId];
        if (currentSection) {
            await this.searchSection(currentSectionId, currentSection, query);
        }
        
        // Also search through loaded tabs that belong to the current section
        if (appState.allTabs) {
            for (const tab of appState.allTabs) {
                // Only search tabs that belong to the current section
                if (tab.sectionId === currentSectionId) {
                    await this.searchTab(tab, query);
                }
            }
        }
    }

    async searchTab(tab, query) {
        const tabData = appState.getTabData(tab.id);
        if (!tabData) return;
        
        this.searchInContent(tabData, tab, query);
    }

    async searchSection(sectionId, section, query) {
        if (!section.file) return;
        
        try {
            // Load section if not already loaded
            if (!appState.getTabData(sectionId)) {
                await this.contentManager.loadSectionContent(sectionId);
            }
            
            // Search intro
            if (section.intro) {
                const introData = appState.getTabData(section.intro.id);
                if (introData) {
                    this.searchInContent(introData, {
                        id: section.intro.id,
                        sectionId,
                        sectionLabel: section.title || sectionId,
                        groupId: 'intro',
                        groupLabel: 'Introduction'
                    }, query);
                }
            }
            
            // Search groups
            if (section.groups) {
                for (const group of section.groups) {
                    await this.searchGroup(group, sectionId, section, query);
                }
            }
            
            // Search children
            if (section.children) {
                for (const child of section.children) {
                    await this.searchGroup(child, sectionId, section, query);
                }
            }
            
        } catch (error) {
            console.error(`Error searching section ${sectionId}:`, error);
        }
    }

    async searchGroup(group, sectionId, section, query) {
        // Search direct items
        if (group.items) {
            for (const item of group.items) {
                const tabData = appState.getTabData(item.id);
                if (tabData) {
                    this.searchInContent(tabData, {
                        id: item.id,
                        sectionId,
                        sectionLabel: section.title || sectionId,
                        groupId: group.id,
                        groupLabel: group.label
                    }, query);
                }
            }
        }
        
        // Search nested children
        if (group.children) {
            for (const child of group.children) {
                await this.searchGroup(child, sectionId, section, query);
            }
        }
    }

    searchInContent(data, tab, query) {
        // Search title (highest priority)
        if (data.title && typeof data.title === 'string' && data.title.toLowerCase().includes(query)) {
            const titleLower = data.title.toLowerCase();
            const isFullWordMatch = this.isFullWordMatch(titleLower, query);
            
            this.searchResults.push({
                type: 'title',
                text: data.title,
                section: tab.sectionLabel || tab.sectionId || 'Unknown',
                group: tab.groupLabel || tab.groupId || 'Unknown',
                tabId: tab.id,
                priority: isFullWordMatch ? 1 : 1.5 // Full word matches get higher priority
            });
        }
        
        // Search content sections
        const sections = data.sections || data.content;
        if (sections && Array.isArray(sections)) {
            for (const section of sections) {
                // Search section title
                if (section.title && typeof section.title === 'string' && section.title.toLowerCase().includes(query)) {
                    const titleLower = section.title.toLowerCase();
                    const isFullWordMatch = this.isFullWordMatch(titleLower, query);
                    
                    this.searchResults.push({
                        type: 'section-title',
                        text: section.title,
                        section: tab.sectionLabel || tab.sectionId || 'Unknown',
                        group: tab.groupLabel || tab.groupId || 'Unknown',
                        tabId: tab.id,
                        priority: isFullWordMatch ? 2 : 2.5
                    });
                }
                
                // Search section content
                if (section.content && typeof section.content === 'string' && section.content.toLowerCase().includes(query)) {
                    const contentLower = section.content.toLowerCase();
                    const isFullWordMatch = this.isFullWordMatch(contentLower, query);
                    
                    // Create snippet for content matches
                    const snippet = this.createSnippet(section.content, query);
                    
                    this.searchResults.push({
                        type: 'content',
                        text: snippet,
                        section: tab.sectionLabel || tab.sectionId || 'Unknown',
                        group: tab.groupLabel || tab.groupId || 'Unknown',
                        tabId: tab.id,
                        priority: isFullWordMatch ? 3 : 3.5
                    });
                }
                
                // Search code content
                if (section.code && typeof section.code === 'string' && section.code.toLowerCase().includes(query)) {
                    const codeLower = section.code.toLowerCase();
                    const isFullWordMatch = this.isFullWordMatch(codeLower, query);
                    
                    // Create snippet for code matches
                    const snippet = this.createSnippet(section.code, query);
                    
                    this.searchResults.push({
                        type: 'code',
                        text: snippet,
                        section: tab.sectionLabel || tab.sectionId || 'Unknown',
                        group: tab.groupLabel || tab.groupId || 'Unknown',
                        tabId: tab.id,
                        priority: isFullWordMatch ? 4 : 4.5
                    });
                }
                
                // Search list items
                if (section.items && Array.isArray(section.items)) {
                    for (const item of section.items) {
                        if (typeof item === 'string' && item.toLowerCase().includes(query)) {
                            const itemLower = item.toLowerCase();
                            const isFullWordMatch = this.isFullWordMatch(itemLower, query);
                            
                            const snippet = this.createSnippet(item, query);
                            
                            this.searchResults.push({
                                type: 'list-item',
                                text: snippet,
                                section: tab.sectionLabel || tab.sectionId || 'Unknown',
                                group: tab.groupLabel || tab.groupId || 'Unknown',
                                tabId: tab.id,
                                priority: isFullWordMatch ? 5 : 5.5
                            });
                        }
                    }
                }
            }
        }
    }

    createSnippet(content, query, contextLength = 50) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        
        if (index === -1) return content.substring(0, contextLength * 2);
        
        const start = Math.max(0, index - contextLength);
        const end = Math.min(content.length, index + query.length + contextLength);
        
        let snippet = content.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet;
    }

    isFullWordMatch(text, query) {
        const words = text.split(/\s+/);
        return words.some(word => word.toLowerCase() === query.toLowerCase());
    }

    sortResults() {
        this.searchResults.sort((a, b) => {
            // First by priority
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            
            // Then by section name
            if (a.section !== b.section) {
                return a.section.localeCompare(b.section);
            }
            
            // Then by group name
            if (a.group !== b.group) {
                return a.group.localeCompare(b.group);
            }
            
            // Finally by text
            return a.text.localeCompare(b.text);
        });
        // Deduplicate results: keep only one per tabId/type/text
        const seen = new Set();
        this.searchResults = this.searchResults.filter(result => {
            // For content/code/list-item, include text in key; for title/section-title, just tabId+type
            const key =
                (result.type === 'content' || result.type === 'code' || result.type === 'list-item')
                    ? `${result.tabId}|${result.type}|${result.text}`
                    : `${result.tabId}|${result.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Creates the header for the dropdown search results
    createSearchResultsHeader(resultsDiv, resultCount, isMobileSearch = false, shownCount = null) {
        // On mobile, use a more compact header styled for the dropdown, not the header bar
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = isMobileSearch
            ? `
                display: block;
                text-align: left;
                padding: 0.25rem 0.5rem 0.25rem 0;
                border-bottom: 1px solid var(--color-background-border);
                margin-bottom: 0.5rem;
                font-size: 0.95rem;
                color: var(--color-sidebar-link-text--top-level);
                background: none;
            `
            : `
                display: block;
                text-align: left;
                padding: 0.5rem 1rem 0.5rem 0;
                border-bottom: 1px solid var(--color-background-border);
                margin-bottom: 0.5rem;
                font-size: 1rem;
                color: var(--color-sidebar-link-text--top-level);
                background: none;
            `;

        // Results count
        const countSpan = document.createElement('span');
        countSpan.textContent = `Results (${shownCount !== null ? shownCount : resultCount}${shownCount !== null && shownCount < resultCount ? ' of ' + resultCount : ''})`;
        countSpan.style.fontWeight = 'bold';
        countSpan.style.display = 'block';
        countSpan.style.marginBottom = '0.15rem';
        headerDiv.appendChild(countSpan);

        // If there are more than 15 results, show a 'Show all results' link
        if (resultCount > 15 && shownCount !== null && shownCount < resultCount) {
            const showAllLink = document.createElement('span');
            showAllLink.textContent = 'Show all results';
            showAllLink.style.cssText = `
                color: var(--color-sidebar-link-text--top-level);
                text-decoration: underline;
                cursor: pointer;
                font-size: 0.95rem;
                display: block;
                margin-top: 0.1rem;
                margin-bottom: 0.1rem;
                width: fit-content;
            `;
            showAllLink.onclick = (e) => {
                e.preventDefault();
                this.showAllResultsPage();
            };
            headerDiv.appendChild(showAllLink);
        }

        return headerDiv;
    }

    showResults() {
        this.hideResults();
        
        const searchContainer = this.getSearchContainer();
        if (!searchContainer) {
            console.error('No search container found');
            return;
        }
        
        // Check if this is the mobile sidebar search
        const isMobileSearch = searchContainer.classList.contains('mobile-sidebar-search-container');
        
        const resultsDiv = this.createSearchResultsContainer(isMobileSearch);
        resultsDiv.style.textAlign = 'left';
        
        // Only show up to 15 results in dropdown
        const shownResults = this.searchResults.slice(0, 15);
        const header = this.createSearchResultsHeader(resultsDiv, this.searchResults.length, isMobileSearch, shownResults.length);
        if (header) {
            resultsDiv.appendChild(header); // On mobile, header goes inside the dropdown
        }
        
        // Group results by document
        const groupedResults = this.groupResultsByDocument(shownResults);
        
        // Show grouped results
        Object.entries(groupedResults).forEach(([docId, results]) => {
            const docGroup = this.createDocumentGroup(results[0], results);
            resultsDiv.appendChild(docGroup);
        });
        
        searchContainer.appendChild(resultsDiv);
    }

    groupResultsByDocument(results) {
        const grouped = {};
        results.forEach(result => {
            if (!grouped[result.tabId]) {
                grouped[result.tabId] = [];
            }
            grouped[result.tabId].push(result);
        });
        return grouped;
    }

    createDocumentGroup(firstResult, results) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'search-document-group';
        groupDiv.style.cssText = `
            margin-bottom: 0.5rem;
            border: 1px solid var(--color-background-border);
            border-radius: 0.5rem;
            overflow: hidden;
        `;
        
        // Document header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 0.75rem 1rem;
            background-color: var(--color-background-secondary);
            border-bottom: 1px solid var(--color-background-border);
            font-weight: 600;
            color: var(--color-sidebar-link-text--top-level);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        const title = firstResult.metadata ? firstResult.metadata.title : firstResult.text;
        header.innerHTML = `
            <span>📄</span>
            <span>${this.highlightQuery(title, this.currentSearchQuery)}</span>
            <span style="margin-left: auto; font-size: 0.875rem; font-weight: normal; color: var(--color-sidebar-link-text);">
                ${results.length} match${results.length !== 1 ? 'es' : ''}
            </span>
        `;
        groupDiv.appendChild(header);
        
        // Breadcrumb
        const breadcrumb = document.createElement('div');
        breadcrumb.style.cssText = `
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            color: var(--color-sidebar-link-text);
            background-color: var(--color-background-secondary);
            border-bottom: 1px solid var(--color-background-border);
        `;
        breadcrumb.textContent = `📁 ${firstResult.section} → ${firstResult.group}`;
        groupDiv.appendChild(breadcrumb);
        
        // Results list
        const resultsList = document.createElement('div');
        results.forEach((result, index) => {
            const item = this.createResultItem(result, true);
            item.setAttribute('data-search-result', 'true');
            if (index === 0) {
                item.style.borderTop = 'none';
            }
            resultsList.appendChild(item);
        });
        groupDiv.appendChild(resultsList);
        
        // Click handler for entire group
        groupDiv.addEventListener('click', (e) => {
            if (e.target.closest('.search-result-item')) return; // Let item handle its own click
            if (this.navigationManager) {
                this.navigationManager.navigateToTab(firstResult.tabId);
            }
            this.hideResults();
        });
        
        groupDiv.style.cursor = 'pointer';
        
        return groupDiv;
    }

    createResultItem(result, inGroup = false) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.style.cssText = `
            padding: ${inGroup ? '0.75rem 1rem' : '1rem'};
            border-bottom: 1px solid var(--color-background-border);
            cursor: pointer;
            transition: all 0.2s ease;
            ${inGroup ? 'background-color: var(--color-sidebar-background);' : ''}
        `;
        
        const displayText = result.text.length > 100 ? 
            result.text.substring(0, 100) + '...' : 
            result.text;
        
        const highlightedText = this.highlightQuery(displayText, this.currentSearchQuery);
        
        const typeIcons = {
            'title': '📖',
            'section-title': '📑',
            'content': '📝',
            'list-item': '📋',
            'code': '💻'
        };
        
        // Add visual indicator for full word matches
        const isFullWordMatch = result.priority < Math.floor(result.priority) + 0.5;
        const matchIndicator = isFullWordMatch ? '⭐ ' : '';
        
        item.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--color-sidebar-link-text--top-level);">
                ${matchIndicator}${typeIcons[result.type] || '📄'} ${highlightedText}
            </div>
            <div style="font-size: 0.875rem; color: var(--color-sidebar-link-text); margin-bottom: 0.25rem;">
                📁 ${result.section} → ${result.group}
            </div>
            <div style="font-size: 0.75rem; color: var(--color-sidebar-link-text); opacity: 0.7; text-transform: uppercase;">
                ${result.type}${isFullWordMatch ? ' (exact match)' : ''}
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (this.navigationManager) {
                this.navigationManager.navigateToTab(result.tabId);
            }
            this.hideResults();
        });
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'var(--color-sidebar-item-background--hover)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = inGroup ? 'var(--color-sidebar-background)' : '';
        });
        
        return item;
    }

    highlightQuery(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        // Detect theme and use appropriate highlight color
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                          (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        // Use bright yellow for light mode, amber/orange for dark mode
        const bgColor = isDarkMode ? '#FFA500' : '#FFEB3B'; // Orange for dark, yellow for light
        const textColor = isDarkMode ? '#000000' : '#000000'; // Black text works on both
        return text.replace(regex, `<mark style="background-color: ${bgColor}; color: ${textColor}; padding: 0.1rem 0.2rem; border-radius: 0.2rem; font-weight: 500;">$1</mark>`);
    }

    getSearchContainer() {
        // Prefer the focused input's container
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'mobile-sidebar-search') {
            return activeElement.closest('.mobile-sidebar-search-container');
        }
        // Default to header search container
        return document.querySelector('.search-container-header');
    }

    hideResults() {
        const existing = document.querySelector('.search-results');
        if (existing) {
            existing.remove();
        }
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) {
            suggestions.remove();
        }
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
    }

    showError(message) {
        this.hideResults();
        
        const searchContainer = this.getSearchContainer();
        if (!searchContainer) return;
        
        // Check if this is the mobile sidebar search
        const isMobileSearch = searchContainer.classList.contains('mobile-sidebar-search-container');
        
        const errorDiv = this.createSearchResultsContainer(isMobileSearch);
        errorDiv.textContent = message;
        
        searchContainer.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    showAllResultsPage() {
        // Hide the dropdown
        this.hideResults();
        
        // Create the full-page search results
        const container = document.getElementById('tab-container');
        if (!container) return;
        
        // Clear current content
        container.innerHTML = '';
        
        // Create search results page
        const searchPage = document.createElement('div');
        searchPage.id = 'search-results-page';
        searchPage.className = 'tab-content active';
        searchPage.style.cssText = `
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            text-align: left;
        `;
        
        // Header section
        const header = document.createElement('div');
        header.style.cssText = `
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--color-background-border);
            text-align: left;
        `;
        
        const title = document.createElement('h1');
        title.style.cssText = `
            color: var(--color-sidebar-link-text--top-level);
            margin-bottom: 0.5rem;
            text-align: left;
        `;
        title.textContent = `Search Results for "${this.currentSearchQuery}"`;
        
        const resultCount = document.createElement('p');
        resultCount.style.cssText = `
            color: var(--color-sidebar-link-text);
            font-size: 1.1rem;
            margin: 0;
            text-align: left;
        `;
        resultCount.textContent = `Found ${this.searchResults.length} result${this.searchResults.length !== 1 ? 's' : ''}`;
        
        // Improved back button logic
        const backButton = document.createElement('span');
        backButton.textContent = '← Back to Previous Page';
        backButton.style.cssText = `
            margin-top: 1rem;
            color: var(--color-sidebar-link-text--top-level);
            text-decoration: underline;
            cursor: pointer;
            font-size: 1rem;
            display: inline-block;
        `;
        backButton.onclick = (e) => {
            e.preventDefault();
            // Try to go back, but if not possible, go to homepage
            if (window.history.length > 1) {
                window.history.back();
                setTimeout(() => {
                    window.location.reload();
                }, 200);
            } else {
                window.location.href = '/';
            }
        };
        
        header.appendChild(title);
        header.appendChild(resultCount);
        header.appendChild(backButton);
        searchPage.appendChild(header);
        
        // Group results by type
        const groupedResults = this.groupResultsByType();
        
        // Display grouped results
        Object.entries(groupedResults).forEach(([type, results]) => {
            if (results.length === 0) return;
            
            const section = document.createElement('div');
            section.style.cssText = `
                margin-bottom: 2rem;
                text-align: left;
            `;
            
            const sectionTitle = document.createElement('h2');
            sectionTitle.style.cssText = `
                color: var(--color-sidebar-link-text--top-level);
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--color-background-border);
                text-align: left;
            `;
            
            const typeLabels = {
                'title': '📖 Page Titles',
                'section-title': '📑 Section Headers',
                'content': '📝 Content',
                'list-item': '📋 List Items',
                'code': '💻 Code'
            };
            
            sectionTitle.textContent = `${typeLabels[type] || type} (${results.length})`;
            section.appendChild(sectionTitle);
            
            // Create results grid
            const resultsGrid = document.createElement('div');
            resultsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                gap: 1rem;
                text-align: left;
            `;
            
            results.forEach(result => {
                const resultCard = this.createFullPageResultCard(result);
                resultCard.style.textAlign = 'left';
                resultsGrid.appendChild(resultCard);
            });
            
            section.appendChild(resultsGrid);
            searchPage.appendChild(section);
        });
        
        container.appendChild(searchPage);
        
        // Update URL to reflect search state
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('search', this.currentSearchQuery);
        const newUrl = `${window.location.pathname}?${searchParams.toString()}#search-results`;
        window.history.pushState({ search: this.currentSearchQuery }, '', newUrl);
        
        // Scroll to top
        window.scrollTo({ top: 0 });
    }

    groupResultsByType() {
        const grouped = {
            'title': [],
            'section-title': [],
            'content': [],
            'list-item': [],
            'code': []
        };
        
        this.searchResults.forEach(result => {
            if (grouped[result.type]) {
                grouped[result.type].push(result);
            }
        });
        
        return grouped;
    }

    createFullPageResultCard(result) {
        const card = document.createElement('div');
        card.style.cssText = `
            background-color: var(--color-sidebar-background);
            border: 1px solid var(--color-background-border);
            border-radius: 0.75rem;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        
        const displayText = result.text.length > 200 ? 
            result.text.substring(0, 200) + '...' : 
            result.text;
        
        const highlightedText = this.highlightQuery(displayText, this.currentSearchQuery);
        
        const typeIcons = {
            'title': '📖',
            'section-title': '📑',
            'content': '📝',
            'list-item': '📋',
            'code': '💻'
        };
        
        // Add visual indicator for full word matches
        const isFullWordMatch = result.priority < Math.floor(result.priority) + 0.5;
        const matchIndicator = isFullWordMatch ? '⭐ ' : '';
        
        card.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 0.75rem; color: var(--color-sidebar-link-text--top-level); font-size: 1.1rem;">
                ${matchIndicator}${typeIcons[result.type] || '📄'} ${highlightedText}
            </div>
            <div style="font-size: 0.9rem; color: var(--color-sidebar-link-text); margin-bottom: 0.5rem;">
                📁 ${result.section} → ${result.group}
            </div>
            <div style="font-size: 0.8rem; color: var(--color-sidebar-link-text); opacity: 0.7; text-transform: uppercase;">
                ${result.type}${isFullWordMatch ? ' (exact match)' : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (this.navigationManager) {
                this.navigationManager.navigateToTab(result.tabId);
            }
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.backgroundColor = 'var(--color-sidebar-item-background--hover)';
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.backgroundColor = 'var(--color-sidebar-background)';
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        });
        
        return card;
    }

    restoreSearchResults() {
        if (this.currentSearchQuery && this.searchResults.length > 0) {
            this.showResults();
        }
    }
    
    restoreSearchInputs() {
        if (this.currentSearchQuery) {
            const searchInput = document.getElementById('header-search');
            
            if (searchInput) searchInput.value = this.currentSearchQuery;
        }
    }
    
    testSearch() {
        // Test search functionality
        this.performSearch('test');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
} 