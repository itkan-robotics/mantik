/**
 * Mantik - Main Entry Point
 * Documents the loading order used by index.html.
 *
 * Loading Order (in index.html):
 * 1. app-state.js - Global state management (must be first)
 * 2. config-manager.js - Configuration loading
 * 3. seo-manager.js - Dynamic SEO metadata
 * 4. content-manager.js - Content loading and rendering
 * 5. navigation-manager.js - Navigation and routing
 * 6. theme-manager.js - Theme switching
 * 7. sidebar-resize-manager.js - Sidebar resizing
 * 8. event-manager.js - Event handling
 * 9. application.js - Main application coordination
 * 10. global-functions.js - HTML integration functions
 * 11. main.js - This file (documentation only)
 * Then: lunr.min.js, search-index.js, search-manager.js
 */ 