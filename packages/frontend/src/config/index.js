/**
 * File Path: src/config/index.js
 * Version: 1.0.1
 * Description: Central configuration management for the application.
 *              Provides type-safe access to environment variables with defaults.
 *              All environment-dependent settings should be managed through this module.
 *
 * How to Use:
 * 1. Import this module wherever you need environment configuration
 * 2. Access configuration values through the exported config object
 * 3. All environment variables are prefixed with VITE_ as required by Vite
 * 4. Defaults are provided for all values to ensure the app can run without .env
 * 5. Add new configuration sections as needed (e.g., config.features, config.analytics)
 *
 * Change Log:
 * v1.0.0 - Initial implementation with API and app configuration sections
 * v1.0.1 - Fixed VITE_API_URL reference to VITE_API_BASE_URL and updated default ports.
 */

// ================================================
// CONFIGURATION OBJECT
// ================================================

const config = {
  // ================================================
  // API CONFIGURATION
  // ================================================
  api: {
    // Base URL for the Rust backend API. Uses VITE_API_BASE_URL from .env or defaults to http://localhost:3001.
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',

    // Request timeout in milliseconds
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 5000,

    // Number of retry attempts for failed requests
    retries: parseInt(import.meta.env.VITE_API_RETRIES) || 1,

    // Whether to enable backend connection
    enableBackend: import.meta.env.VITE_ENABLE_BACKEND !== 'false',

    // WebSocket URL (derived from VITE_WS_URL, VITE_API_BASE_URL, or explicitly set default)
    wsUrl: import.meta.env.VITE_WS_URL ||
           (import.meta.env.VITE_API_BASE_URL
             ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws')
             : 'ws://localhost:3001/ws'),
  },

  // ================================================
  // APPLICATION CONFIGURATION
  // ================================================
  app: {
    // Current environment mode
    mode: import.meta.env.MODE,

    // Environment flags
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
    isStaging: import.meta.env.MODE === 'staging',

    // Application name and version
    name: import.meta.env.VITE_APP_NAME || 'React Plugin System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Debug mode
    debug: import.meta.env.VITE_DEBUG === 'true',
  },

  // ================================================
  // FEATURE FLAGS
  // ================================================
  features: {
    // Enable/disable specific features
    enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false',
    enablePlugins: import.meta.env.VITE_ENABLE_PLUGINS !== 'false',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  },

  // ================================================
  // UI CONFIGURATION
  // ================================================
  ui: {
    // Default theme
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'auto',

    // Layout defaults
    defaultLayout: {
      sidebarOpen: import.meta.env.VITE_SIDEBAR_OPEN !== 'false',
      sidebarCollapsed: import.meta.env.VITE_SIDEBAR_COLLAPSED === 'true',
      headerEnabled: import.meta.env.VITE_HEADER_ENABLED !== 'false',
      footerEnabled: import.meta.env.VITE_FOOTER_ENABLED !== 'false',
    },
  },
};

// ================================================
// CONFIGURATION VALIDATION
// ================================================

/**
 * Validates the configuration and logs warnings for missing or invalid values
 */
function validateConfig() {
  const warnings = [];

  // Check API configuration
  if (config.api.enableBackend && !config.api.baseUrl) {
    warnings.push('Backend is enabled but VITE_API_BASE_URL (or default) is not set');
  }

  if (config.api.timeout < 1000) {
    warnings.push('API timeout is very low (< 1000ms), this may cause issues');
  }

  // Check WebSocket configuration
  if (config.features.enableWebSocket && !config.api.wsUrl) {
    warnings.push('WebSocket is enabled but no WebSocket URL is configured');
  }

  // Log warnings in development
  if (config.app.isDevelopment && warnings.length > 0) {
    console.warn('Configuration warnings:', warnings);
  }

  return warnings;
}

// ================================================
// CONFIGURATION HELPERS
// ================================================

/**
 * Gets a nested configuration value safely
 * @param {string} path - Dot-separated path to the config value
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} The configuration value or default
 */
export function getConfig(path, defaultValue = undefined) {
  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Checks if the app is running in a specific environment
 * @param {string} env - Environment name to check
 * @returns {boolean} True if running in specified environment
 */
export function isEnvironment(env) {
  return config.app.mode === env;
}

/**
 * Gets the full API endpoint URL
 * @param {string} endpoint - API endpoint path
 * @returns {string} Full URL to the endpoint
 */
export function getApiUrl(endpoint) {
  const baseUrl = config.api.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

// ================================================
// INITIALIZATION
// ================================================

// Validate configuration on load
validateConfig();

// Log configuration in development mode (sanitized)
if (config.app.isDevelopment) {
  console.info('Application Configuration:', {
    api: {
      baseUrl: config.api.baseUrl,
      enableBackend: config.api.enableBackend,
    },
    app: {
      mode: config.app.mode,
      name: config.app.name,
      version: config.app.version,
    },
    features: config.features,
  });
}

// ================================================
// EXPORTS
// ================================================

// Export the configuration object as default
export default config;

// Also export as named export for explicit imports
export { config };
