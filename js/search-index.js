/**
 * Mantik - Search Index
 * Uses lunr.js for full-text search indexing
 */

class SearchIndex {
    constructor() {
        this.index = null; // lunr index instance
        this.documents = new Map(); // documentId → document metadata
        this.isIndexed = false;
        this.indexingProgress = 0;
        this.totalDocuments = 0;
    }

    /**
     * Build search index from all loaded content using lunr.js
     */
    async buildIndex(contentManager, configManager) {
        if (this.isIndexed) return;
        
        // Check if lunr is available
        if (typeof lunr === 'undefined') {
            console.error('lunr.js is not loaded');
            this.isIndexed = false;
            return;
        }
        
        this.isIndexed = false;
        this.documents.clear();
        
        try {
            // Get all sections from config
            const mainConfig = await configManager.loadMainConfig();
            const sections = mainConfig.sections || {};
            
            // Load full section configs first (they contain groups, children, etc.)
            const loadedSections = {};
            for (const sectionId in sections) {
                try {
                    // Load the full section config (this loads groups, children, etc.)
                    const fullSectionConfig = await configManager.loadSectionConfig(sectionId);
                    loadedSections[sectionId] = fullSectionConfig;
                } catch (error) {
                    console.warn(`Could not load full config for section ${sectionId}, using basic config:`, error);
                    loadedSections[sectionId] = sections[sectionId];
                }
            }
            
            // Count total documents for progress tracking (using loaded sections)
            this.totalDocuments = this.countDocuments(loadedSections);
            this.indexingProgress = 0;
            
            // Build documents array for lunr
            const documents = [];
            
            // Index all sections (using fully loaded configs)
            for (const sectionId in loadedSections) {
                const sectionDocs = await this.indexSection(sectionId, loadedSections[sectionId], contentManager, configManager);
                documents.push(...sectionDocs);
            }
            
            // Build lunr index
            this.index = lunr(function() {
                // Define fields with boost values (higher = more important)
                // Note: code sections are excluded from search
                this.ref('id');
                this.field('title', { boost: 10 });
                this.field('sectionTitle', { boost: 8 });
                this.field('codeLabel', { boost: 5 });
                this.field('listItem', { boost: 4 });
                this.field('content', { boost: 3 });
                // Code field removed - code sections are ignored in search
                
                // Add documents to index
                documents.forEach(doc => {
                    this.add(doc);
                });
            });
            
            this.isIndexed = true;
            debugLog(`Search index built with lunr.js: ${documents.length} documents indexed`);
            
            // Log some statistics
            const docsWithContent = documents.filter(doc => 
                (doc.content && doc.content.trim().length > 0) ||
                (doc.code && doc.code.trim().length > 0) ||
                (doc.sectionTitle && doc.sectionTitle.trim().length > 0)
            ).length;
            debugLog(`Documents with searchable content: ${docsWithContent} of ${documents.length}`);
        } catch (error) {
            console.error('Error building search index:', error);
            this.isIndexed = false;
        }
    }

    countDocuments(sections) {
        let count = 0;
        for (const sectionId in sections) {
            const section = sections[sectionId];
            if (section.file) count++;
            if (section.intro) count++;
            if (section.groups) {
                section.groups.forEach(group => {
                    if (group.items) count += group.items.length;
                    if (group.children) {
                        group.children.forEach(child => {
                            if (child.items) count += child.items.length;
                        });
                    }
                });
            }
            if (section.children) {
                section.children.forEach(child => {
                    if (child.items) count += child.items.length;
                });
            }
        }
        return count;
    }

    async indexSection(sectionId, section, contentManager, configManager) {
        const documents = [];
        
        // Index standalone content
        if (section.file && !section.groups && !section.intro && !section.children) {
            const doc = await this.indexDocument(sectionId, section, sectionId, section, null, configManager);
            if (doc) documents.push(doc);
        }
        
        // Index intro content
        if (section.intro) {
            const doc = await this.indexDocument(section.intro.id, section.intro, sectionId, section, null, configManager);
            if (doc) documents.push(doc);
        }
        
        // Index groups
        if (section.groups) {
            for (const group of section.groups) {
                const groupDocs = await this.indexGroup(group, sectionId, section, contentManager, configManager);
                documents.push(...groupDocs);
            }
        }
        
        // Index children
        if (section.children) {
            for (const child of section.children) {
                const childDocs = await this.indexGroup(child, sectionId, section, contentManager, configManager);
                documents.push(...childDocs);
            }
        }
        
        return documents;
    }

    async indexGroup(group, sectionId, section, contentManager, configManager) {
        const documents = [];
        
        if (group.items) {
            for (const item of group.items) {
                const doc = await this.indexDocument(item.id, item, sectionId, section, group, configManager);
                if (doc) documents.push(doc);
            }
        }
        
        if (group.children) {
            for (const child of group.children) {
                const childDocs = await this.indexGroup(child, sectionId, section, contentManager, configManager);
                documents.push(...childDocs);
            }
        }
        
        return documents;
    }

    async indexDocument(docId, docConfig, sectionId, sectionConfig, group = null, configManager = null) {
        try {
            // Always load document content from file - don't rely on appState
            // This ensures we index all pages, not just ones that have been visited
            let docData = null;
            
            if (docConfig.file) {
                // Use provided configManager - it should have the correct basePath
                if (configManager) {
                    try {
                        docData = await configManager.loadContentFile(docConfig.file);
                    } catch (loadError) {
                        console.warn(`Could not load content file for ${docId}: ${docConfig.file}`, loadError);
                        // Try appState as fallback
                        docData = appState.getTabData(docId);
                    }
                } else {
                    // Fallback: try appState first, then try loading
                    docData = appState.getTabData(docId);
                    if (!docData) {
                        const cm = new ConfigManager();
                        try {
                            docData = await cm.loadContentFile(docConfig.file);
                        } catch (loadError) {
                            console.warn(`Could not load content file for ${docId}: ${docConfig.file}`, loadError);
                        }
                    }
                }
            } else {
                // No file specified, try appState
                docData = appState.getTabData(docId);
            }
            
            if (!docData) {
                console.warn(`No data found for document ${docId} (file: ${docConfig.file || 'none'})`);
                return null;
            }
            
            // Store document metadata
            const docMetadata = {
                id: docId,
                title: docData.title || docConfig.label || docId,
                sectionId: sectionId,
                sectionLabel: sectionConfig.title || sectionConfig.label || sectionId,
                groupId: group ? group.id : null,
                groupLabel: group ? group.label : null,
                path: docConfig.file || '',
                content: docData
            };
            
            this.documents.set(docId, docMetadata);
            
            // Build lunr document
            const lunrDoc = this.buildLunrDocument(docId, docData, docMetadata);
            
            this.indexingProgress++;
            return lunrDoc;
        } catch (error) {
            console.error(`Error indexing document ${docId}:`, error);
            return null;
        }
    }

    buildLunrDocument(docId, docData, metadata) {
        // Extract text content from document
        // Note: code sections are excluded from search
        const title = docData.title || '';
        const sectionTitles = [];
        const codeLabels = [];
        const listItems = [];
        const contentTexts = [];
        // codeTexts removed - code sections are ignored
        
        // Process sections
        const sections = docData.sections || docData.content || [];
        if (Array.isArray(sections)) {
            sections.forEach((section) => {
                // Section titles
                if (section.title) {
                    sectionTitles.push(this.stripHTML(section.title));
                }
                
                // Section content
                if (section.content) {
                    const content = this.stripHTML(section.content);
                    if (content && content.trim().length > 0) {
                        contentTexts.push(content);
                    }
                }
                
                // Code content - SKIPPED (not indexed for search)
                // if (section.code) {
                //     codeTexts.push(section.code);
                // }
                
                // Code tabs - only index labels, not code content
                if (section.tabs && Array.isArray(section.tabs)) {
                    section.tabs.forEach((tab) => {
                        if (tab.label) {
                            codeLabels.push(tab.label);
                        }
                        // Code content - SKIPPED (not indexed for search)
                        // if (tab.code) {
                        //     codeTexts.push(tab.code);
                        // }
                    });
                }
                
                // List items
                if (section.items && Array.isArray(section.items)) {
                    section.items.forEach((item) => {
                        if (typeof item === 'string') {
                            const itemText = this.stripHTML(item);
                            if (itemText && itemText.trim().length > 0) {
                                listItems.push(itemText);
                            }
                        }
                    });
                }
            });
        }
        
        // Build lunr document (without code field)
        const lunrDoc = {
            id: docId,
            title: title,
            sectionTitle: sectionTitles.join(' '),
            codeLabel: codeLabels.join(' '),
            listItem: listItems.join(' '),
            content: contentTexts.join(' ')
            // code field removed - code sections are ignored
        };
        
        // Debug logging for documents with no content
        const hasContent = lunrDoc.content.length > 0 || 
                          lunrDoc.listItem.length > 0 || lunrDoc.sectionTitle.length > 0;
        if (!hasContent && title) {
            console.warn(`Document ${docId} (${title}) has no searchable content`);
        }
        
        return lunrDoc;
    }

    stripHTML(html) {
        if (!html || typeof html !== 'string') return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Search the index using lunr.js
     */
    search(query, maxResults = 50) {
        if (!this.isIndexed || !this.index || !query || query.trim().length === 0) {
            return [];
        }
        
        try {
            // Perform search with lunr
            const results = this.index.search(query);
            
            // Convert lunr results to our format
            // lunr.js returns results with 'ref' (document ID) and 'score' properties
            const formattedResults = results
                .slice(0, maxResults)
                .map(result => {
                    const doc = this.documents.get(result.ref);
                    if (!doc) return null;
                    
                    return {
                        docId: result.ref,
                        score: result.score || 0,
                        metadata: doc
                    };
                })
                .filter(result => result !== null);
            
            return formattedResults;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    /**
     * Get document by ID
     */
    getDocument(docId) {
        return this.documents.get(docId);
    }

    /**
     * Get suggestions based on partial query
     */
    getSuggestions(query, maxSuggestions = 10) {
        if (!this.isIndexed || !query || query.trim().length === 0) {
            return [];
        }
        
        const queryLower = query.toLowerCase();
        const suggestions = new Set();
        
        // Get suggestions from document titles
        this.documents.forEach((doc) => {
            if (doc.title && doc.title.toLowerCase().includes(queryLower)) {
                suggestions.add(doc.title);
            }
        });
        
        return Array.from(suggestions).slice(0, maxSuggestions);
    }

    /**
     * Get indexing progress (0-1)
     */
    getProgress() {
        if (this.totalDocuments === 0) return 1;
        return Math.min(this.indexingProgress / this.totalDocuments, 1);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchIndex;
}
