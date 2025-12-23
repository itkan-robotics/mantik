/**
 * Mantik - Configuration Manager
 * Handles all configuration loading and management
 */

class ConfigManager {
    constructor(basePath = '') {
        this.basePath = basePath;
        this.configCache = new Map();
    }

    getBasePath() {
        // Allow override via global variable for custom deployments (e.g., GitHub Pages)
        if (typeof window !== 'undefined' && window.BASE_PATH) {
            return window.BASE_PATH;
        }
        // Auto-detect for GitHub Pages (repo subdirectory), else default to root
        const pathname = window.location.pathname;
        if (pathname !== '/' && pathname.includes('/')) {
            const segments = pathname.split('/').filter(s => s !== '');
            if (segments.length > 0) {
                const firstSegment = segments[0];
                // If the first segment looks like a repo name (no file extension)
                if (firstSegment && !firstSegment.includes('.') && !firstSegment.includes('#')) {
                    // Only use this for GitHub Pages (hostname includes github.io)
                    if (window.location.hostname.includes('github.io')) {
                        return `/${firstSegment}/`;
                    }
                }
            }
        }
        // Default to root for local development or simple hosting
        return '/';
    }

    resolvePath(relativePath) {
        // If the path is already absolute, return it
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
        }
        
        // Resolve relative path
        const resolvedPath = this.basePath + relativePath;
        return resolvedPath;
    }

    async loadMainConfig() {
        try {
            const configPath = this.resolvePath('data/config/config.json');
            const response = await fetch(configPath);
            if (!response.ok) throw new Error('Failed to load main configuration');
            
            const config = await response.json();
            appState.setConfig(config);
            return config;
        } catch (error) {
            console.error('Error loading main configuration:', error);
            throw error;
        }
    }

    async loadSectionConfig(sectionId) {
        // Check cache first
        if (this.configCache.has(sectionId)) {
            return this.configCache.get(sectionId);
        }

        const section = appState.config.sections[sectionId];
        if (!section || !section.file) {
            throw new Error(`Section ${sectionId} not found or missing file`);
        }
    
        try {
            // Resolve path considering base path (for GitHub Pages)
            const resolvedPath = this.resolvePath(section.file);
            // Add cache-busting parameter
            const url = `${resolvedPath}?v=${Date.now()}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load section config: ${section.file}`);
                
            const sectionConfig = await response.json();
            const fullConfig = { ...section, ...sectionConfig };
            
            // Cache the config
            this.configCache.set(sectionId, fullConfig);
            
            // Update the main config
            appState.config.sections[sectionId] = fullConfig;
            
            return fullConfig;
        } catch (error) {
            console.error(`Error loading section config ${sectionId}:`, error);
            throw error;
        }
    }

    async loadContentFile(filePath) {
        try {
            // Resolve path considering base path (for GitHub Pages)
            const resolvedPath = this.resolvePath(filePath);
            // Add cache-busting parameter
            const url = `${resolvedPath}?v=${Date.now()}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load content file: ${filePath}`);
            return await response.json();
        } catch (error) {
            console.error(`Error loading content file ${filePath}:`, error);
            throw error;
        }
    }

    getSectionConfig(sectionId) {
        // First check cache (most up-to-date)
        if (this.configCache.has(sectionId)) {
            return this.configCache.get(sectionId);
        }
        // Fallback to appState
        return appState.config.sections[sectionId];
    }

    isSectionConfigLoaded(sectionId) {
        // Check if config is fully loaded (has groups/children/items/tiers, not just base metadata)
        const config = this.getSectionConfig(sectionId);
        if (!config) return false;
        // If it only has {id, label, file}, it's not fully loaded
        return !!(config.groups || config.children || config.items || config.tiers || config.intro);
    }

    getAllSections() {
        return Object.keys(appState.config.sections);
    }

    clearCache() {
        this.configCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
} 