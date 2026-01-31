/**
 * Mantik - SEO Manager
 * Handles dynamic metadata updates for SPA pages
 * Optimizes for search engine crawlability and social sharing
 */

class SEOManager {
    constructor() {
        this.baseUrl = 'https://mantik.netlify.app';
        this.siteName = 'Mantik';
        this.defaultImage = `${this.baseUrl}/media/FRCCodeLab.png`;
        
        // Section metadata configuration
        this.sectionMeta = {
            'homepage': {
                title: 'Mantik - FIRST Programming Made Easy',
                description: 'Free interactive learning platform for FIRST Robotics students. Learn Java fundamentals, FTC programming, FRC development with WPILib, and competitive coding.',
                keywords: 'FIRST Robotics, FTC programming, FRC programming, Java training, robotics education, WPILib, OnBot Java'
            },
            'java-training': {
                title: 'Java Programming Fundamentals - Mantik',
                description: 'Learn Java programming from beginner to advanced. Covers variables, loops, OOP, Git version control. Perfect for FTC and FRC robotics teams.',
                keywords: 'Java programming, Java tutorial, Java basics, OOP, object-oriented programming, Git, version control'
            },
            'ftc-specific': {
                title: 'FTC Programming Training - Mantik',
                description: 'Complete FTC (FIRST Tech Challenge) programming curriculum. Learn OnBot Java, Android Studio, motor control, sensors, and autonomous programming.',
                keywords: 'FTC programming, FIRST Tech Challenge, OnBot Java, Android Studio, FTC autonomous, FTC sensors'
            },
            'frc-specific': {
                title: 'FRC Programming Training - Mantik',
                description: 'Comprehensive FRC (FIRST Robotics Competition) programming guide. Master WPILib, command-based programming, PID control, and path planning.',
                keywords: 'FRC programming, FIRST Robotics Competition, WPILib, command-based, PID control, PathPlanner'
            },
            'competitive-training': {
                title: 'Competitive Programming Training - Mantik',
                description: 'Master competitive programming and algorithm skills. Learn data structures, algorithms, dynamic programming, and interview preparation techniques.',
                keywords: 'competitive programming, algorithms, data structures, LeetCode, interview prep, dynamic programming'
            }
        };

        // URL path to section mapping
        this.urlSectionMap = {
            'java': 'java-training',
            'ftc': 'ftc-specific',
            'frc': 'frc-specific',
            'comp': 'competitive-training'
        };
    }

    /**
     * Updates all metadata for the current page
     * @param {Object} data - Page data containing title, description, etc.
     * @param {string} sectionId - Current section ID
     * @param {string} tabId - Current tab/lesson ID
     */
    updateMetadata(data, sectionId, tabId = null) {
        const pageTitle = this.buildPageTitle(data, sectionId);
        const pageDescription = this.buildPageDescription(data, sectionId);
        const canonicalUrl = this.buildCanonicalUrl(sectionId, tabId);
        const keywords = this.buildKeywords(data, sectionId);

        // Update document title
        document.title = pageTitle;

        // Update meta tags
        this.updateMetaTag('description', pageDescription);
        this.updateMetaTag('keywords', keywords);
        this.updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

        // Update canonical URL
        this.updateCanonicalUrl(canonicalUrl);

        // Update Open Graph tags
        this.updateOpenGraphTags(pageTitle, pageDescription, canonicalUrl);

        // Update Twitter Card tags
        this.updateTwitterTags(pageTitle, pageDescription);

        // Update structured data
        this.updateStructuredData(data, sectionId, tabId, canonicalUrl);
    }

    /**
     * Builds the page title based on content and section
     */
    buildPageTitle(data, sectionId) {
        if (data && data.title) {
            // For lesson pages: "Lesson Title - Section Name - Mantik"
            const sectionName = this.getSectionDisplayName(sectionId);
            if (sectionId !== 'homepage') {
                return `${data.title} - ${sectionName} - ${this.siteName}`;
            }
            return data.title;
        }
        
        // For section landing pages
        const sectionMeta = this.sectionMeta[sectionId];
        if (sectionMeta) {
            return sectionMeta.title;
        }
        
        return `${this.siteName} - FIRST Programming Made Easy`;
    }

    /**
     * Builds the page description
     */
    buildPageDescription(data, sectionId) {
        // Use lesson-specific description if available
        if (data && data.description) {
            // Truncate to 160 characters for meta description
            return data.description.substring(0, 160);
        }

        // Use first paragraph content if available
        if (data && data.sections && data.sections.length > 0) {
            const firstText = data.sections.find(s => s.type === 'text');
            if (firstText && firstText.content) {
                // Strip HTML and truncate
                const text = firstText.content.replace(/<[^>]*>/g, '').substring(0, 160);
                return text;
            }
        }

        // Fall back to section default description
        const sectionMeta = this.sectionMeta[sectionId];
        if (sectionMeta) {
            return sectionMeta.description;
        }

        return 'Free interactive programming education for FIRST Robotics students. Learn Java, FTC, FRC, and competitive coding.';
    }

    /**
     * Builds the canonical URL for the current page
     */
    buildCanonicalUrl(sectionId, tabId) {
        if (sectionId === 'homepage' || !sectionId) {
            return this.baseUrl + '/';
        }

        // Map section ID to URL path
        const sectionPath = this.getSectionUrlPath(sectionId);
        
        if (tabId && tabId !== sectionId) {
            return `${this.baseUrl}/${sectionPath}/${tabId}`;
        }
        
        return `${this.baseUrl}/${sectionPath}`;
    }

    /**
     * Gets the URL path for a section ID
     */
    getSectionUrlPath(sectionId) {
        const pathMap = {
            'java-training': 'java',
            'ftc-specific': 'ftc',
            'frc-specific': 'frc',
            'competitive-training': 'comp'
        };
        return pathMap[sectionId] || sectionId;
    }

    /**
     * Gets display name for a section
     */
    getSectionDisplayName(sectionId) {
        const names = {
            'homepage': 'Home',
            'java-training': 'Java Training',
            'ftc-specific': 'FTC Training',
            'frc-specific': 'FRC Training',
            'competitive-training': 'Competitive Programming'
        };
        return names[sectionId] || sectionId;
    }

    /**
     * Builds keywords for the page
     */
    buildKeywords(data, sectionId) {
        const baseKeywords = 'FIRST Robotics, Mantik, programming education';
        const sectionMeta = this.sectionMeta[sectionId];
        
        if (sectionMeta && sectionMeta.keywords) {
            return `${baseKeywords}, ${sectionMeta.keywords}`;
        }
        
        return baseKeywords;
    }

    /**
     * Updates or creates a meta tag
     */
    updateMetaTag(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    /**
     * Updates the canonical URL link element
     */
    updateCanonicalUrl(url) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;
    }

    /**
     * Updates Open Graph tags for social sharing
     */
    updateOpenGraphTags(title, description, url) {
        this.updateOGTag('og:title', title);
        this.updateOGTag('og:description', description);
        this.updateOGTag('og:url', url);
        this.updateOGTag('og:type', 'website');
        this.updateOGTag('og:site_name', this.siteName);
        this.updateOGTag('og:image', this.defaultImage);
        this.updateOGTag('og:image:width', '1200');
        this.updateOGTag('og:image:height', '630');
        this.updateOGTag('og:locale', 'en_US');
    }

    /**
     * Updates a single Open Graph tag
     */
    updateOGTag(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    /**
     * Updates Twitter Card tags
     */
    updateTwitterTags(title, description) {
        this.updateMetaTag('twitter:card', 'summary_large_image');
        this.updateMetaTag('twitter:title', title);
        this.updateMetaTag('twitter:description', description);
        this.updateMetaTag('twitter:image', this.defaultImage);
    }

    /**
     * Updates structured data (JSON-LD) for the page
     */
    updateStructuredData(data, sectionId, tabId, canonicalUrl) {
        // Remove existing dynamic structured data
        const existingScripts = document.querySelectorAll('script[data-seo-dynamic="true"]');
        existingScripts.forEach(script => script.remove());

        // Add breadcrumb structured data
        if (sectionId !== 'homepage') {
            this.addBreadcrumbSchema(data, sectionId, tabId, canonicalUrl);
        }

        // Add LearningResource schema for lesson pages
        if (data && data.title && tabId) {
            this.addLearningResourceSchema(data, sectionId, canonicalUrl);
        }
    }

    /**
     * Adds breadcrumb structured data
     */
    addBreadcrumbSchema(data, sectionId, tabId, canonicalUrl) {
        const sectionName = this.getSectionDisplayName(sectionId);
        const sectionPath = this.getSectionUrlPath(sectionId);
        
        const breadcrumbList = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": this.baseUrl
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": sectionName,
                    "item": `${this.baseUrl}/${sectionPath}`
                }
            ]
        };

        // Add lesson to breadcrumb if on a specific lesson page
        if (tabId && tabId !== sectionId && data && data.title) {
            breadcrumbList.itemListElement.push({
                "@type": "ListItem",
                "position": 3,
                "name": data.title,
                "item": canonicalUrl
            });
        }

        this.addJsonLdScript(breadcrumbList);
    }

    /**
     * Adds LearningResource structured data for lesson pages
     */
    addLearningResourceSchema(data, sectionId, canonicalUrl) {
        const learningResource = {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            "name": data.title,
            "description": this.buildPageDescription(data, sectionId),
            "url": canonicalUrl,
            "provider": {
                "@type": "Organization",
                "name": "Mantik",
                "url": this.baseUrl
            },
            "educationalLevel": data.difficulty || "Beginner to Advanced",
            "learningResourceType": "Tutorial",
            "inLanguage": "en",
            "isAccessibleForFree": true,
            "audience": {
                "@type": "EducationalAudience",
                "educationalRole": "student",
                "audienceType": "FIRST Robotics students, FTC teams, FRC teams"
            }
        };

        // Add duration if available
        if (data.duration) {
            learningResource.timeRequired = `PT${data.duration.replace(' min', 'M').replace(' hour', 'H')}`;
        }

        this.addJsonLdScript(learningResource);
    }

    /**
     * Adds a JSON-LD script to the page
     */
    addJsonLdScript(data) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-dynamic', 'true');
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    /**
     * Generates static HTML for exercise content (for crawlability)
     * This exposes exercise questions/tasks in the HTML for search engines
     */
    generateExerciseMarkup(exerciseData) {
        if (!exerciseData || !exerciseData.tasks) return '';

        let html = '<div class="exercise-content-static" style="display:none;" aria-hidden="true">';
        html += `<h4>${exerciseData.title || 'Exercise'}</h4>`;
        
        if (exerciseData.description) {
            html += `<p>${exerciseData.description}</p>`;
        }
        
        if (exerciseData.tasks && Array.isArray(exerciseData.tasks)) {
            html += '<ul>';
            exerciseData.tasks.forEach(task => {
                html += `<li>${task}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div>';
        return html;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOManager;
}
