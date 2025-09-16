/**
 * File Path: src/core/plugin-system/PluginLoader.js
 * Version: 1.0.1
 * Description: Dynamic plugin loading system responsible for instantiating plugins,
 *              managing their lifecycle, and providing runtime context. Handles
 *              plugin initialization, dependency injection, and error recovery.
 * 
 * How to Use:
 * 1. Create loader instance: const loader = new PluginLoader()
 * 2. Load plugin: await loader.loadPlugin(pluginId, registry, context)
 * 3. Unload plugin: await loader.unloadPlugin(pluginId)
 * 4. Hot reload: await loader.reloadPlugin(pluginId, registry, context)
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with dynamic loading and hot-reload support
 * v1.0.1 - Fixed TypeError in _unsubscribeFromPluginEvent by ensuring eventSubscriptions
 *          is initialized and adding strict validation for Map/Set structures
 */

import { logger } from '../utils/logger.js';
import { PLUGIN_STATES, PLUGIN_ERROR_TYPES, SYSTEM_CONSTANTS } from './PluginTypes.js';
import { validatePluginInstance } from '../utils/validators.js';

// ================================================
// PLUGIN LOADER CLASS
// ================================================

class PluginLoader {
  constructor() {
    this.loadedPlugins = new Map(); // pluginId -> plugin instance
    this.pluginContexts = new Map(); // pluginId -> plugin context
    this.loadingPromises = new Map(); // pluginId -> loading promise
    this.errorRecovery = new Map(); // pluginId -> recovery info
    this.hotReloadEnabled = process.env.NODE_ENV === 'development';
    this.loadTimeouts = new Map(); // pluginId -> timeout handle
    this.eventSubscriptions = new Map(); // Initialize eventSubscriptions
    
    logger.info('PluginLoader initialized', { hotReloadEnabled: this.hotReloadEnabled });
  }

  // ================================================
  // PLUGIN LOADING
  // ================================================

  /**
   * Load and instantiate a plugin
   * @param {string} pluginId - Plugin identifier to load
   * @param {PluginRegistry} registry - Plugin registry instance
   * @param {Object} context - Runtime context for plugin
   * @returns {Promise<Object>} Plugin instance
   */
  async loadPlugin(pluginId, registry, context = {}) {
    try {
      // Check if already loading
      if (this.loadingPromises.has(pluginId)) {
        logger.info(`Plugin ${pluginId} is already loading, waiting...`);
        return await this.loadingPromises.get(pluginId);
      }

      // Check if already loaded
      if (this.loadedPlugins.has(pluginId)) {
        logger.info(`Plugin ${pluginId} is already loaded`);
        return this.loadedPlugins.get(pluginId);
      }

      // Create loading promise
      const loadingPromise = this._performPluginLoad(pluginId, registry, context);
      this.loadingPromises.set(pluginId, loadingPromise);

      try {
        const instance = await loadingPromise;
        return instance;
      } finally {
        this.loadingPromises.delete(pluginId);
      }

    } catch (error) {
      logger.error(`Failed to load plugin ${pluginId}:`, error);
      this._recordError(pluginId, PLUGIN_ERROR_TYPES.LOADING_ERROR, error);
      throw error;
    }
  }

  /**
   * Perform the actual plugin loading process
   * @param {string} pluginId - Plugin identifier
   * @param {PluginRegistry} registry - Plugin registry
   * @param {Object} context - Runtime context
   * @returns {Promise<Object>} Plugin instance
   */
  async _performPluginLoad(pluginId, registry, context) {
    // Set loading timeout
    const timeoutHandle = setTimeout(() => {
      const error = new Error(`Plugin ${pluginId} load timeout after ${SYSTEM_CONSTANTS.LOAD_TIMEOUT}ms`);
      this._recordError(pluginId, PLUGIN_ERROR_TYPES.LOADING_ERROR, error);
      throw error;
    }, SYSTEM_CONSTANTS.LOAD_TIMEOUT);

    this.loadTimeouts.set(pluginId, timeoutHandle);

    try {
      // Get plugin registration
      const registration = registry.getPlugin(pluginId);
      if (!registration) {
        throw new Error(`Plugin ${pluginId} not found in registry`);
      }

      const { manifest, factory } = registration;
      
      logger.info(`Loading plugin: ${pluginId}@${manifest.version} (${manifest.type})`);

      // Validate plugin factory
      if (typeof factory !== 'function') {
        throw new Error(`Plugin ${pluginId} factory is not a function`);
      }

      // Create plugin context
      const pluginContext = this._createPluginContext(pluginId, manifest, context);
      this.pluginContexts.set(pluginId, pluginContext);

      // Instantiate plugin
      let pluginInstance;
      try {
        pluginInstance = await factory(pluginContext);
      } catch (factoryError) {
        throw new Error(`Plugin ${pluginId} factory failed: ${factoryError.message}`);
      }

      // Validate plugin instance
      const validation = validatePluginInstance(pluginInstance, manifest);
      if (!validation.valid) {
        throw new Error(`Plugin ${pluginId} validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize plugin if it has an init method
      if (typeof pluginInstance.init === 'function') {
        logger.debug(`Initializing plugin ${pluginId}...`);
        await pluginInstance.init(pluginContext);
      }

      // Store plugin instance
      this.loadedPlugins.set(pluginId, pluginInstance);

      // Clear timeout
      clearTimeout(timeoutHandle);
      this.loadTimeouts.delete(pluginId);

      logger.info(`Plugin ${pluginId} loaded successfully`);

      // Setup hot reload if enabled
      if (this.hotReloadEnabled) {
        this._setupHotReload(pluginId, registry, context);
      }

      return pluginInstance;

    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutHandle);
      this.loadTimeouts.delete(pluginId);
      
      // Clean up partial state
      this.pluginContexts.delete(pluginId);
      this.loadedPlugins.delete(pluginId);
      
      throw error;
    }
  }

  /**
   * Create plugin runtime context
   * @param {string} pluginId - Plugin identifier
   * @param {Object} manifest - Plugin manifest
   * @param {Object} globalContext - Global context
   * @returns {Object} Plugin context
   */
  _createPluginContext(pluginId, manifest, globalContext) {
    const pluginContext = {
      // Plugin identity
      pluginId,
      manifest: { ...manifest },
      
      // API access
      api: globalContext.apiClient || null,
      
      // System utilities
      logger: logger.createChild({ plugin: pluginId }),
      
      // Plugin communication
      emit: (event, data) => this._emitPluginEvent(pluginId, event, data),
      on: (event, handler) => this._subscribeToPluginEvent(pluginId, event, handler),
      off: (event, handler) => this._unsubscribeFromPluginEvent(pluginId, event, handler),
      
      // Plugin management
      loadPlugin: (targetId) => this._loadDependentPlugin(pluginId, targetId, globalContext),
      getPlugin: (targetId) => this._getPluginForContext(pluginId, targetId),
      
      // Configuration
      config: manifest.configuration || {},
      
      // Storage (memory-based for artifacts environment)
      storage: this._createPluginStorage(pluginId),
      
      // Utilities
      utils: {
        debounce: this._debounce,
        throttle: this._throttle,
        uuid: this._generateUUID,
        deepClone: this._deepClone
      },
      
      // Lifecycle hooks
      onUnload: (callback) => this._registerUnloadCallback(pluginId, callback),
      onReload: (callback) => this._registerReloadCallback(pluginId, callback),
      
      // Error handling
      reportError: (error) => this._recordError(pluginId, PLUGIN_ERROR_TYPES.RUNTIME_ERROR, error),
      
      // Development utilities (only in dev mode)
      ...(this.hotReloadEnabled && {
        dev: {
          reload: () => this.reloadPlugin(pluginId, globalContext.registry, globalContext),
          inspect: () => this._inspectPlugin(pluginId)
        }
      })
    };

    return pluginContext;
  }

  // ================================================
  // PLUGIN UNLOADING
  // ================================================

  /**
   * Unload a plugin and clean up its resources
   * @param {string} pluginId - Plugin to unload
   */
  async unloadPlugin(pluginId) {
    try {
      if (!this.loadedPlugins.has(pluginId)) {
        logger.warn(`Plugin ${pluginId} is not loaded`);
        return;
      }

      logger.info(`Unloading plugin: ${pluginId}`);

      const pluginInstance = this.loadedPlugins.get(pluginId);

      // Call unload callbacks first
      await this._executeUnloadCallbacks(pluginId);

      // Call plugin cleanup if available
      if (typeof pluginInstance.cleanup === 'function') {
        logger.debug(`Running cleanup for plugin ${pluginId}`);
        await pluginInstance.cleanup();
      }

      // Clean up plugin context
      this._cleanupPluginContext(pluginId);

      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);
      this.pluginContexts.delete(pluginId);

      // Clear any pending timeouts
      if (this.loadTimeouts.has(pluginId)) {
        clearTimeout(this.loadTimeouts.get(pluginId));
        this.loadTimeouts.delete(pluginId);
      }

      logger.info(`Plugin ${pluginId} unloaded successfully`);

    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginId}:`, error);
      this._recordError(pluginId, PLUGIN_ERROR_TYPES.RUNTIME_ERROR, error);
      throw error;
    }
  }

  // ================================================
  // HOT RELOAD FUNCTIONALITY
  // ================================================

  /**
   * Reload a plugin (unload and load again)
   * @param {string} pluginId - Plugin to reload
   * @param {PluginRegistry} registry - Plugin registry
   * @param {Object} context - Runtime context
   */
  async reloadPlugin(pluginId, registry, context) {
    try {
      if (!this.hotReloadEnabled) {
        throw new Error('Hot reload is not enabled');
      }

      logger.info(`Hot reloading plugin: ${pluginId}`);

      // Execute reload callbacks before unloading
      await this._executeReloadCallbacks(pluginId);

      // Unload existing instance
      if (this.loadedPlugins.has(pluginId)) {
        await this.unloadPlugin(pluginId);
      }

      // Load fresh instance
      const newInstance = await this.loadPlugin(pluginId, registry, context);

      logger.info(`Plugin ${pluginId} hot reloaded successfully`);

      return newInstance;

    } catch (error) {
      logger.error(`Failed to hot reload plugin ${pluginId}:`, error);
      this._recordError(pluginId, PLUGIN_ERROR_TYPES.LOADING_ERROR, error);
      throw error;
    }
  }

  /**
   * Setup hot reload monitoring for a plugin
   * @param {string} pluginId - Plugin to monitor
   * @param {PluginRegistry} registry - Plugin registry
   * @param {Object} context - Runtime context
   */
  _setupHotReload(pluginId, registry, context) {
    // In a real implementation, this would set up file watchers
    // For now, we'll just log that hot reload is ready
    logger.debug(`Hot reload setup for plugin ${pluginId}`);
    
    // Store reload context for manual reload triggers
    if (!this.hotReloadContexts) {
      this.hotReloadContexts = new Map();
    }
    
    this.hotReloadContexts.set(pluginId, { registry, context });
  }

  // ================================================
  // PLUGIN QUERYING
  // ================================================

  /**
   * Get a loaded plugin instance
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin instance or null
   */
  getLoadedPlugin(pluginId) {
    return this.loadedPlugins.get(pluginId) || null;
  }

  /**
   * Get plugin context
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin context or null
   */
  getPluginContext(pluginId) {
    return this.pluginContexts.get(pluginId) || null;
  }

  /**
   * Get all loaded plugin IDs
   * @returns {Array} Array of loaded plugin IDs
   */
  getLoadedPluginIds() {
    return Array.from(this.loadedPlugins.keys());
  }

  /**
   * Check if plugin is loaded
   * @param {string} pluginId - Plugin identifier
   * @returns {boolean} True if plugin is loaded
   */
  isPluginLoaded(pluginId) {
    return this.loadedPlugins.has(pluginId);
  }

  // ================================================
  // PLUGIN COMMUNICATION
  // ================================================

  /**
   * Emit plugin event
   * @param {string} pluginId - Source plugin ID
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  _emitPluginEvent(pluginId, event, data) {
    // Implement plugin-to-plugin communication
    logger.debug(`Plugin ${pluginId} emitted event: ${event}`, data);
    
    // This would integrate with a broader event system
    // For now, just log the event
  }

  /**
   * Subscribe to plugin events
   * @param {string} pluginId - Subscriber plugin ID
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  _subscribeToPluginEvent(pluginId, event, handler) {
    logger.debug(`Plugin ${pluginId} subscribed to event: ${event}`);
    
    // Store event subscription for cleanup
    if (!this.eventSubscriptions) {
      this.eventSubscriptions = new Map();
    }
    
    if (!this.eventSubscriptions.has(pluginId)) {
      this.eventSubscriptions.set(pluginId, new Map());
    }
    
    if (!this.eventSubscriptions.get(pluginId).has(event)) {
      this.eventSubscriptions.get(pluginId).set(event, new Set());
    }
    
    this.eventSubscriptions.get(pluginId).get(event).add(handler);
  }

  /**
   * Unsubscribe from plugin events
   * @param {string} pluginId - Subscriber plugin ID
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  _unsubscribeFromPluginEvent(pluginId, event, handler) {
    // Ensure eventSubscriptions is initialized
    if (!this.eventSubscriptions) {
      logger.debug(`No event subscriptions exist for plugin ${pluginId}`);
      return;
    }

    // Check if pluginId has subscriptions
    if (!this.eventSubscriptions.has(pluginId)) {
      logger.debug(`No subscriptions found for plugin ${pluginId}`);
      return;
    }

    const pluginSubs = this.eventSubscriptions.get(pluginId);
    // Verify pluginSubs is a Map
    if (!(pluginSubs instanceof Map)) {
      logger.error(`Invalid pluginSubs for ${pluginId}:`, pluginSubs);
      return;
    }

    // Check if event has subscriptions
    if (!pluginSubs.has(event)) {
      logger.debug(`No subscriptions found for event ${event} in plugin ${pluginId}`);
      return;
    }

    const eventSubs = pluginSubs.get(event);
    // Verify eventSubs is a Set
    if (!(eventSubs instanceof Set)) {
      logger.error(`Invalid eventSubs for ${pluginId}/${event}:`, eventSubs);
      return;
    }

    // Remove the handler
    eventSubs.delete(handler);
    logger.debug(`Unsubscribed handler from ${pluginId}/${event}`);

    // Clean up empty event subscriptions
    if (eventSubs.size === 0) {
      pluginSubs.delete(event);
    }
    // Clean up empty plugin subscriptions
    if (pluginSubs.size === 0) {
      this.eventSubscriptions.delete(pluginId);
    }
  }

  // ================================================
  // PLUGIN STORAGE
  // ================================================

  /**
   * Create plugin-specific storage
   * @param {string} pluginId - Plugin identifier
   * @returns {Object} Storage interface
   */
  _createPluginStorage(pluginId) {
    // Memory-based storage for artifacts environment
    const pluginStorage = new Map();
    
    return {
      get: (key) => pluginStorage.get(key),
      set: (key, value) => pluginStorage.set(key, value),
      delete: (key) => pluginStorage.delete(key),
      clear: () => pluginStorage.clear(),
      has: (key) => pluginStorage.has(key),
      keys: () => Array.from(pluginStorage.keys()),
      values: () => Array.from(pluginStorage.values()),
      entries: () => Array.from(pluginStorage.entries()),
      size: () => pluginStorage.size
    };
  }

  // ================================================
  // LIFECYCLE CALLBACKS
  // ================================================

  /**
   * Register unload callback
   * @param {string} pluginId - Plugin identifier
   * @param {Function} callback - Unload callback
   */
  _registerUnloadCallback(pluginId, callback) {
    if (!this.unloadCallbacks) {
      this.unloadCallbacks = new Map();
    }
    
    if (!this.unloadCallbacks.has(pluginId)) {
      this.unloadCallbacks.set(pluginId, new Set());
    }
    
    this.unloadCallbacks.get(pluginId).add(callback);
  }

  /**
   * Register reload callback
   * @param {string} pluginId - Plugin identifier
   * @param {Function} callback - Reload callback
   */
  _registerReloadCallback(pluginId, callback) {
    if (!this.reloadCallbacks) {
      this.reloadCallbacks = new Map();
    }
    
    if (!this.reloadCallbacks.has(pluginId)) {
      this.reloadCallbacks.set(pluginId, new Set());
    }
    
    this.reloadCallbacks.get(pluginId).add(callback);
  }

  /**
   * Execute unload callbacks
   * @param {string} pluginId - Plugin identifier
   */
  async _executeUnloadCallbacks(pluginId) {
    const callbacks = this.unloadCallbacks?.get(pluginId);
    if (!callbacks) return;
    
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error(`Unload callback failed for plugin ${pluginId}:`, error);
      }
    }
    
    this.unloadCallbacks.delete(pluginId);
  }

  /**
   * Execute reload callbacks
   * @param {string} pluginId - Plugin identifier
   */
  async _executeReloadCallbacks(pluginId) {
    const callbacks = this.reloadCallbacks?.get(pluginId);
    if (!callbacks) return;
    
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error(`Reload callback failed for plugin ${pluginId}:`, error);
      }
    }
  }

  // ================================================
  // ERROR HANDLING
  // ================================================

  /**
   * Record plugin error
   * @param {string} pluginId - Plugin identifier
   * @param {string} errorType - Error type
   * @param {Error} error - Error object
   */
  _recordError(pluginId, errorType, error) {
    const errorRecord = {
      pluginId,
      type: errorType,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    if (!this.errorRecovery.has(pluginId)) {
      this.errorRecovery.set(pluginId, []);
    }
    
    this.errorRecovery.get(pluginId).push(errorRecord);
    
    // Keep only last 10 errors per plugin
    const errors = this.errorRecovery.get(pluginId);
    if (errors.length > 10) {
      errors.splice(0, errors.length - 10);
    }
    
    logger.error(`Plugin error recorded: ${pluginId}`, errorRecord);
  }

  /**
   * Get plugin errors
   * @param {string} pluginId - Plugin identifier
   * @returns {Array} Array of error records
   */
  getPluginErrors(pluginId) {
    return this.errorRecovery.get(pluginId) || [];
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /**
   * Load dependent plugin (for plugin dependencies)
   * @param {string} sourcePluginId - Source plugin requesting dependency
   * @param {string} targetPluginId - Target plugin to load
   * @param {Object} context - Runtime context
   */
  async _loadDependentPlugin(sourcePluginId, targetPluginId, context) {
    logger.debug(`Plugin ${sourcePluginId} requesting dependency: ${targetPluginId}`);
    
    // This would integrate with the plugin manager
    // For now, just return null
    return null;
  }

  /**
   * Get plugin for context (with permission checking)
   * @param {string} sourcePluginId - Source plugin
   * @param {string} targetPluginId - Target plugin
   */
  _getPluginForContext(sourcePluginId, targetPluginId) {
    // In a real implementation, this would check permissions
    return this.getLoadedPlugin(targetPluginId);
  }

  /**
   * Clean up plugin context
   * @param {string} pluginId - Plugin identifier
   */
  _cleanupPluginContext(pluginId) {
    // Clean up event subscriptions
    this.eventSubscriptions?.delete(pluginId);
    
    // Clean up callbacks
    this.unloadCallbacks?.delete(pluginId);
    this.reloadCallbacks?.delete(pluginId);
    
    // Clean up hot reload context
    this.hotReloadContexts?.delete(pluginId);
  }

  /**
   * Inspect plugin for debugging
   * @param {string} pluginId - Plugin identifier
   * @returns {Object} Plugin inspection data
   */
  _inspectPlugin(pluginId) {
    const instance = this.loadedPlugins.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    const errors = this.getPluginErrors(pluginId);
    
    return {
      pluginId,
      loaded: !!instance,
      hasContext: !!context,
      errorCount: errors.length,
      lastError: errors[errors.length - 1] || null,
      instance: instance ? Object.keys(instance) : null,
      contextKeys: context ? Object.keys(context) : null
    };
  }

  // ================================================
  // UTILITY FUNCTIONS FOR PLUGIN CONTEXT
  // ================================================

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit time in ms
   * @returns {Function} Throttled function
   */
  _throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Generate UUID
   * @returns {string} UUID string
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this._deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // ================================================
  // CLEANUP
  // ================================================

  /**
   * Clean up loader and unload all plugins
   */
  async cleanup() {
    logger.info('Cleaning up PluginLoader...');
    
    // Unload all plugins
    const loadedPluginIds = Array.from(this.loadedPlugins.keys());
    for (const pluginId of loadedPluginIds) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        logger.error(`Error unloading plugin ${pluginId} during cleanup:`, error);
      }
    }
    
    // Clear all timeouts
    for (const timeout of this.loadTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    // Clear all maps
    this.loadedPlugins.clear();
    this.pluginContexts.clear();
    this.loadingPromises.clear();
    this.errorRecovery.clear();
    this.loadTimeouts.clear();
    
    // Clear optional maps
    this.eventSubscriptions?.clear();
    this.unloadCallbacks?.clear();
    this.reloadCallbacks?.clear();
    this.hotReloadContexts?.clear();
    
    logger.info('PluginLoader cleanup completed');
  }
}

// ================================================
// EXPORTS
// ================================================

export { PluginLoader };
export default PluginLoader;
