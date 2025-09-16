/**
 * File Path: src/plugins/AppLayout/index.js
 * Version: 1.0.1
 * Description: AppLayout plugin entry point that exports the plugin manifest and factory.
 *              This file registers the plugin with the system and provides the main
 *              plugin interface for the application layout management system.
 * 
 * How to Use:
 * 1. Automatically imported by the plugin system
 * 2. Provides manifest and factory for plugin registration
 * 3. Factory creates the layout component with context
 * 4. Handles plugin lifecycle and configuration
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with complete plugin structure
 * v1.0.1 - Added safety checks for configuration validation and fixed undefined reference errors
 */

import React from 'react';
import AppLayout from './AppLayout.jsx';
import manifest from './manifest.json';
import { logger } from '../../core/utils/logger.js';
import { validatePluginConfiguration } from '../../core/utils/validators.js';

// ================================================
// PLUGIN CONFIGURATION
// ================================================

const defaultConfig = {
  theme: 'auto',
  showSidebar: true,
  sidebarCollapsible: true,
  showHeader: true,
  showFooter: true,
  enableBreadcrumbs: true,
  maxContentWidth: '1200px',
  headerHeight: '64px',
  sidebarWidth: '280px',
  footerHeight: '60px'
};

// ================================================
// PLUGIN FACTORY FUNCTION
// ================================================

/**
 * AppLayout plugin factory function
 * Creates and configures the layout plugin instance
 * @param {Object} context - Plugin context provided by the plugin system
 * @returns {Object} Plugin instance
 */
async function createAppLayoutPlugin(context) {
  const pluginLogger = context.logger || logger.createChild({ plugin: 'app-layout' });
  
  try {
    pluginLogger.info('Initializing AppLayout plugin...');

    // Validate and merge configuration
    const config = { ...defaultConfig, ...context.config };
    
    // Safe configuration validation with comprehensive error handling
    let configValidation = { valid: true, errors: [], warnings: [] };
    
    try {
      // Check if manifest has configuration schema before validating
      if (manifest.configuration && manifest.configuration.schema) {
        const validationResult = validatePluginConfiguration(config, manifest.configuration.schema);
        
        // Handle cases where validatePluginConfiguration might return undefined
        if (validationResult) {
          configValidation = validationResult;
        } else {
          pluginLogger.warn('Configuration validation returned undefined, assuming valid configuration');
          configValidation = { valid: true, errors: [], warnings: [] };
        }
      } else {
        pluginLogger.debug('No configuration schema found in manifest, skipping validation');
      }
    } catch (validationError) {
      pluginLogger.warn('Configuration validation failed, using defaults:', validationError);
      configValidation = { valid: true, errors: [], warnings: [] };
    }
    
    if (!configValidation.valid) {
      pluginLogger.warn('Configuration validation warnings:', configValidation.warnings);
      if (configValidation.errors.length > 0) {
        throw new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`);
      }
    }

    // Plugin state
    let isInitialized = false;
    let isActive = false;
    const eventListeners = new Map();

    // ================================================
    // PLUGIN INSTANCE METHODS
    // ================================================

    /**
     * Initialize the plugin
     */
    const init = async () => {
      if (isInitialized) return;
      
      try {
        pluginLogger.debug('Initializing AppLayout plugin...');

        // Setup event listeners
        if (context.on) {
          setupEventListeners();
        }

        // Register API endpoints if available
        if (context.api && registerApiEndpoints) {
          registerApiEndpoints();
        }

        // Load user preferences
        await loadUserPreferences();

        isInitialized = true;
        isActive = true;
        
        pluginLogger.info('AppLayout plugin initialized successfully');

        // Emit initialization event
        context.emit?.('plugin:initialized', {
          pluginId: context.pluginId,
          version: manifest.version
        });

      } catch (error) {
        pluginLogger.error('Failed to initialize AppLayout plugin:', error);
        throw error;
      }
    };

    /**
     * Reload plugin configuration
     */
    const reload = async (newConfig = {}) => {
      try {
        pluginLogger.debug('Reloading AppLayout plugin...');

        // Update configuration
        Object.assign(config, newConfig);

        // Safe re-validation with error handling
        let validation = { valid: true, errors: [], warnings: [] };
        
        try {
          if (manifest.configuration && manifest.configuration.schema) {
            const validationResult = validatePluginConfiguration(config, manifest.configuration.schema);
            validation = validationResult || { valid: true, errors: [], warnings: [] };
          }
        } catch (validationError) {
          pluginLogger.warn('Configuration validation failed during reload:', validationError);
          validation = { valid: true, errors: [], warnings: [] };
        }

        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Emit reload event
        context.emit?.('plugin:reloaded', {
          pluginId: context.pluginId,
          config: newConfig
        });

        pluginLogger.info('AppLayout plugin reloaded successfully');

      } catch (error) {
        pluginLogger.error('Failed to reload AppLayout plugin:', error);
        throw error;
      }
    };

    /**
     * Cleanup plugin resources
     */
    const cleanup = async () => {
      try {
        pluginLogger.debug('Cleaning up AppLayout plugin...');

        // Remove event listeners
        cleanupEventListeners();

        // Save current state
        await saveUserPreferences();

        isActive = false;
        
        pluginLogger.info('AppLayout plugin cleanup completed');

        // Emit cleanup event
        context.emit?.('plugin:cleanup', {
          pluginId: context.pluginId
        });

      } catch (error) {
        pluginLogger.error('Error during AppLayout plugin cleanup:', error);
      }
    };

    /**
     * Get plugin status information
     */
    const getStatus = () => ({
      pluginId: context.pluginId,
      version: manifest.version,
      isInitialized,
      isActive,
      config,
      eventListeners: eventListeners.size,
      uptime: isInitialized ? Date.now() - initTime : 0
    });

    /**
     * Update plugin configuration
     */
    const configure = async (updates) => {
      try {
        const newConfig = { ...config, ...updates };
        
        // Safe validation with error handling
        let validation = { valid: true, errors: [], warnings: [] };
        
        try {
          if (manifest.configuration && manifest.configuration.schema) {
            const validationResult = validatePluginConfiguration(newConfig, manifest.configuration.schema);
            validation = validationResult || { valid: true, errors: [], warnings: [] };
          }
        } catch (validationError) {
          pluginLogger.warn('Configuration validation failed during configure:', validationError);
          validation = { valid: true, errors: [], warnings: [] };
        }

        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Apply configuration
        Object.assign(config, updates);

        // Save to user preferences
        await saveUserPreferences();

        // Emit configuration change event
        context.emit?.('layout:config:changed', {
          previous: config,
          current: newConfig,
          updates
        });

        pluginLogger.debug('AppLayout configuration updated', updates);

      } catch (error) {
        pluginLogger.error('Failed to update configuration:', error);
        throw error;
      }
    };

    // ================================================
    // EVENT HANDLERS
    // ================================================

    const setupEventListeners = () => {
      // Listen for theme change requests
      const handleThemeChange = (event) => {
        if (event.data?.theme) {
          config.theme = event.data.theme;
          context.emit?.('layout:theme:changed', { theme: event.data.theme });
        }
      };

      // Listen for layout change requests
      const handleLayoutChange = (event) => {
        if (event.data) {
          Object.assign(config, event.data);
          context.emit?.('layout:changed', { config });
        }
      };

      // Register event listeners
      context.on?.('theme:change', handleThemeChange);
      context.on?.('layout:change', handleLayoutChange);

      // Store for cleanup
      eventListeners.set('theme:change', handleThemeChange);
      eventListeners.set('layout:change', handleLayoutChange);
    };

    const cleanupEventListeners = () => {
      for (const [event, handler] of eventListeners) {
        context.off?.(event, handler);
      }
      eventListeners.clear();
    };

    // ================================================
    // API INTEGRATION
// ================================================

    const registerApiEndpoints = () => {
      const endpoints = {
        getLayoutConfig: {
          method: 'GET',
          path: '/api/layout/config'
        },
        updateLayoutConfig: {
          method: 'PUT',
          path: '/api/layout/config'
        },
        getThemePreferences: {
          method: 'GET',
          path: '/api/user/theme'
        },
        updateThemePreferences: {
          method: 'PUT',
          path: '/api/user/theme'
        }
      };

      // Register with API client
      if (context.api?.registerPluginEndpoints) {
        context.api.registerPluginEndpoints(context.pluginId, endpoints);
      }
    };

    // ================================================
    // USER PREFERENCES
    // ================================================

    const loadUserPreferences = async () => {
      try {
        // Load from plugin storage
        const savedPreferences = context.storage?.get('preferences');
        if (savedPreferences) {
          Object.assign(config, savedPreferences);
          pluginLogger.debug('Loaded user preferences from storage');
        }

        // Load from API if available
        if (context.api) {
          try {
            const response = await context.api.get('/api/layout/preferences');
            if (response.data) {
              Object.assign(config, response.data);
              pluginLogger.debug('Loaded user preferences from API');
            }
          } catch (apiError) {
            pluginLogger.debug('No user preferences found on server');
          }
        }

      } catch (error) {
        pluginLogger.warn('Failed to load user preferences:', error);
      }
    };

    const saveUserPreferences = async () => {
      try {
        // Save to plugin storage
        if (context.storage) {
          context.storage.set('preferences', config);
        }

        // Save to API if available
        if (context.api) {
          try {
            await context.api.put('/api/layout/preferences', config);
            pluginLogger.debug('Saved user preferences to API');
          } catch (apiError) {
            pluginLogger.debug('Failed to save preferences to API:', apiError);
          }
        }

      } catch (error) {
        pluginLogger.warn('Failed to save user preferences:', error);
      }
    };

    // ================================================
    // COMPONENT WRAPPER
    // ================================================

    /**
     * Enhanced AppLayout component with plugin context
     */
    const LayoutComponent = (props) => {
      return (
        <AppLayout
          {...props}
          config={config}
          context={context}
          onConfigChange={configure}
          pluginApi={{
            getStatus,
            configure,
            reload
          }}
        />
      );
    };

    // Set display name for debugging
    LayoutComponent.displayName = 'AppLayoutPlugin';

    // ================================================
    // PLUGIN INSTANCE
    // ================================================

    const initTime = Date.now();

    const pluginInstance = {
      // Plugin metadata
      id: context.pluginId,
      manifest,
      version: manifest.version,
      
      // Plugin lifecycle
      init,
      cleanup,
      reload,
      configure,
      getStatus,
      
      // Plugin interface
      component: LayoutComponent,
      config,
      
      // Event handling
      on: (event, handler) => context.on?.(event, handler),
      off: (event, handler) => context.off?.(event, handler),
      emit: (event, data) => context.emit?.(event, data),
      
      // API integration
      api: context.api,
      
      // Storage access
      storage: context.storage,
      
      // Logging
      logger: pluginLogger,
      
      // Development utilities
      ...(process.env.NODE_ENV === 'development' && {
        dev: {
          getConfig: () => config,
          getEventListeners: () => Array.from(eventListeners.keys()),
          forceReload: () => reload(),
          clearStorage: () => context.storage?.clear()
        }
      })
    };

    // Register unload callback
    if (context.onUnload) {
      context.onUnload(cleanup);
    }

    pluginLogger.info('AppLayout plugin created successfully');

    return pluginInstance;

  } catch (error) {
    pluginLogger.error('Failed to create AppLayout plugin:', error);
    throw error;
  }
}

// ================================================
// PLUGIN VALIDATION
// ================================================

/**
 * Validate plugin environment and dependencies
 */
function validatePluginEnvironment() {
  const errors = [];
  const warnings = [];

  // Check React availability
  if (typeof React === 'undefined') {
    errors.push('React is not available in the global scope');
  }

  // Check required DOM APIs
  if (typeof document === 'undefined') {
    warnings.push('Document API not available (SSR environment?)');
  }

  if (typeof window === 'undefined') {
    warnings.push('Window API not available (SSR environment?)');
  }

  // Check CSS Grid support
  if (typeof CSS !== 'undefined' && !CSS.supports('display', 'grid')) {
    warnings.push('CSS Grid not supported in this browser');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ================================================
// PLUGIN EXPORT
// ================================================

// Validate environment on module load
const envValidation = validatePluginEnvironment();
if (!envValidation.valid) {
  logger.error('AppLayout plugin environment validation failed:', envValidation.errors);
  throw new Error(`AppLayout plugin cannot load: ${envValidation.errors.join(', ')}`);
}

if (envValidation.warnings.length > 0) {
  logger.warn('AppLayout plugin environment warnings:', envValidation.warnings);
}

// Export plugin definition
export const AppLayoutPlugin = {
  manifest,
  factory: createAppLayoutPlugin,
  validate: validatePluginEnvironment
};

// Default export
export default AppLayoutPlugin;

// Named exports for convenience
export { manifest, createAppLayoutPlugin as factory, AppLayout as component };
