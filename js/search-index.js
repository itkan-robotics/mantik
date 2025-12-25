/**
 * Mantik - Search Index
 * Pre-builds and manages search index for fast lookups
 */

class SearchIndex {
    constructor() {
        this.index = new Map(); // term → array of document matches
        this.documents = new Map(); // documentId → document metadata
        this.isIndexed = false;
        this.indexingProgress = 0;
        this.totalDocuments = 0;
    }

    /**
     * Build search index from all loaded content
     */
    async buildIndex(contentManager, configManager) {
        if (this.isIndexed) return;
        
        this.isIndexed = false;
        this.index.clear();
        this.documents.clear();
        
        try {
            // Get all sections from config
            const mainConfig = await configManager.loadMainConfig();
            const sections = mainConfig.sections || {};
            
            // Count total documents for progress tracking
            this.totalDocuments = this.countDocuments(sections);
            this.indexingProgress = 0;
            
            // Index all sections
            for (const sectionId in sections) {
                await this.indexSection(sectionId, sections[sectionId], contentManager, configManager);
            }
            
            this.isIndexed = true;
            console.log(`Search index built: ${this.index.size} terms, ${this.documents.size} documents`);
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
        // Index standalone content
        if (section.file && !section.groups && !section.intro && !section.children) {
            await this.indexDocument(sectionId, section, sectionId, section);
        }
        
        // Index intro content
        if (section.intro) {
            await this.indexDocument(section.intro.id, section.intro, sectionId, section);
        }
        
        // Index groups
        if (section.groups) {
            for (const group of section.groups) {
                await this.indexGroup(group, sectionId, section);
            }
        }
        
        // Index children
        if (section.children) {
            for (const child of section.children) {
                await this.indexGroup(child, sectionId, section);
            }
        }
    }

    async indexGroup(group, sectionId, section) {
        if (group.items) {
            for (const item of group.items) {
                await this.indexDocument(item.id, item, sectionId, section, group);
            }
        }
        
        if (group.children) {
            for (const child of group.children) {
                await this.indexGroup(child, sectionId, section);
            }
        }
    }

    async indexDocument(docId, docConfig, sectionId, sectionConfig, group = null) {
        try {
            // Load document content if not already loaded
            let docData = appState.getTabData(docId);
            if (!docData && docConfig.file) {
                // Try to load it
                const configManager = new ConfigManager();
                docData = await configManager.loadContentFile(docConfig.file);
            }
            
            if (!docData) return;
            
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
            
            // Index document content
            this.indexDocumentContent(docId, docData, docMetadata);
            
            this.indexingProgress++;
        } catch (error) {
            console.error(`Error indexing document ${docId}:`, error);
        }
    }

    indexDocumentContent(docId, docData, metadata) {
        // Index title (highest weight)
        if (docData.title) {
            this.addTerm(docId, docData.title, 'title', 10, metadata);
        }
        
        // Index sections
        const sections = docData.sections || docData.content || [];
        if (Array.isArray(sections)) {
            sections.forEach((section, sectionIndex) => {
                // Index section title
                if (section.title) {
                    this.addTerm(docId, section.title, 'section-title', 8, metadata, sectionIndex);
                }
                
                // Index section content
                if (section.content) {
                    this.addTerm(docId, section.content, 'content', 3, metadata, sectionIndex);
                }
                
                // Index code
                if (section.code) {
                    this.addTerm(docId, section.code, 'code', 2, metadata, sectionIndex);
                }
                
                // Index code tabs
                if (section.tabs && Array.isArray(section.tabs)) {
                    section.tabs.forEach((tab, tabIndex) => {
                        if (tab.code) {
                            this.addTerm(docId, tab.code, 'code', 2, metadata, sectionIndex, tabIndex);
                        }
                        if (tab.label) {
                            this.addTerm(docId, tab.label, 'code-label', 5, metadata, sectionIndex, tabIndex);
                        }
                    });
                }
                
                // Index list items
                if (section.items && Array.isArray(section.items)) {
                    section.items.forEach((item, itemIndex) => {
                        if (typeof item === 'string') {
                            this.addTerm(docId, item, 'list-item', 4, metadata, sectionIndex, itemIndex);
                        }
                    });
                }
            });
        }
    }

    addTerm(docId, text, type, weight, metadata, sectionIndex = null, itemIndex = null) {
        if (!text || typeof text !== 'string') return;
        
        // Tokenize text (simple word splitting)
        const tokens = this.tokenize(text);
        
        tokens.forEach((token, position) => {
            if (token.length < 2) return; // Skip very short tokens
            
            const term = token.toLowerCase();
            
            if (!this.index.has(term)) {
                this.index.set(term, []);
            }
            
            // Check if this document/type combination already exists for this term
            const termMatches = this.index.get(term);
            let existingMatch = termMatches.find(m => 
                m.docId === docId && 
                m.type === type &&
                m.sectionIndex === sectionIndex &&
                m.itemIndex === itemIndex
            );
            
            if (existingMatch) {
                // Add position to existing match
                existingMatch.positions.push(position);
                existingMatch.count++;
            } else {
                // Create new match
                termMatches.push({
                    docId,
                    type,
                    weight,
                    metadata,
                    positions: [position],
                    count: 1,
                    sectionIndex,
                    itemIndex
                });
            }
        });
    }

    tokenize(text) {
        // Remove HTML tags
        const cleanText = text.replace(/<[^>]*>/g, ' ');
        // Split on whitespace and punctuation, keep words
        return cleanText
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    /**
     * Search the index
     */
    search(query, maxResults = 50) {
        if (!this.isIndexed || !query || query.trim().length === 0) {
            return [];
        }
        
        const queryTerms = this.tokenize(query);
        if (queryTerms.length === 0) return [];
        
        // Score documents
        const docScores = new Map(); // docId → { score, matches: [] }
        
        queryTerms.forEach(term => {
            const matches = this.index.get(term) || [];
            
            matches.forEach(match => {
                if (!docScores.has(match.docId)) {
                    docScores.set(match.docId, {
                        docId: match.docId,
                        score: 0,
                        matches: [],
                        metadata: match.metadata
                    });
                }
                
                const docScore = docScores.get(match.docId);
                
                // Calculate score: weight * match count * inverse document frequency
                const idf = this.calculateIDF(term);
                const termScore = match.weight * match.count * idf;
                
                docScore.score += termScore;
                docScore.matches.push({
                    type: match.type,
                    weight: match.weight,
                    positions: match.positions,
                    sectionIndex: match.sectionIndex,
                    itemIndex: match.itemIndex,
                    termScore
                });
            });
        });
        
        // Convert to array and sort by score
        const results = Array.from(docScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
        
        return results;
    }

    calculateIDF(term) {
        const matches = this.index.get(term) || [];
        const docCount = new Set(matches.map(m => m.docId)).size;
        
        if (docCount === 0) return 1;
        
        // IDF = log(total documents / documents containing term)
        // Higher IDF = rarer term = more important
        return Math.log(this.documents.size / docCount);
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
        this.documents.forEach((doc, docId) => {
            if (doc.title.toLowerCase().includes(queryLower)) {
                suggestions.add(doc.title);
            }
        });
        
        // Get suggestions from indexed terms
        this.index.forEach((matches, term) => {
            if (term.startsWith(queryLower) && term.length > queryLower.length) {
                // Find the most relevant document for this term
                const topMatch = matches
                    .sort((a, b) => b.weight - a.weight)[0];
                if (topMatch) {
                    const doc = this.documents.get(topMatch.docId);
                    if (doc && doc.title) {
                        suggestions.add(doc.title);
                    }
                }
            }
        });
        
        return Array.from(suggestions).slice(0, maxSuggestions);
    }

    /**
     * Fuzzy search (simple Levenshtein-based)
     */
    fuzzySearch(query, maxResults = 50, maxDistance = 2) {
        if (!this.isIndexed || !query || query.trim().length === 0) {
            return [];
        }
        
        const queryLower = query.toLowerCase();
        const queryTerms = this.tokenize(query);
        const docScores = new Map();
        
        // Try exact matches first
        const exactResults = this.search(query, maxResults);
        if (exactResults.length > 0) {
            return exactResults;
        }
        
        // Try fuzzy matches
        this.index.forEach((matches, term) => {
            const distance = this.levenshteinDistance(queryLower, term);
            if (distance <= maxDistance && distance < term.length) {
                matches.forEach(match => {
                    if (!docScores.has(match.docId)) {
                        docScores.set(match.docId, {
                            docId: match.docId,
                            score: 0,
                            matches: [],
                            metadata: match.metadata
                        });
                    }
                    
                    const docScore = docScores.get(match.docId);
                    // Lower score for fuzzy matches (inverse of distance)
                    const fuzzyScore = match.weight * (1 / (distance + 1)) * 0.5;
                    docScore.score += fuzzyScore;
                    docScore.matches.push({
                        type: match.type,
                        weight: match.weight,
                        positions: match.positions,
                        sectionIndex: match.sectionIndex,
                        itemIndex: match.itemIndex,
                        termScore: fuzzyScore,
                        fuzzy: true
                    });
                });
            }
        });
        
        return Array.from(docScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[len2][len1];
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







