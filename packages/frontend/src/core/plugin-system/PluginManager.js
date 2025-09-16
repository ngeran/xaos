/**
 * File Path: src/core/plugin-system/PluginManager.js
 * Version: 1.0.1
 * Description: Main plugin system orchestrator responsible for managing plugin lifecycle,
 *              dependencies, and communication between plugins and the core application.
 * 
 * How to Use:
 * 1. Import PluginManager in your main App component
 * 2. Initialize with PluginManager.getInstance()
 * 3. Register plugins using registerPlugin()
 * 4. Load plugins using loadPlugin() or loadAllPlugins()
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with basic plugin lifecycle management
 * v1.0.1 - Added registry reset in cleanup and debug logging for registration to prevent duplicate registration errors
 */

import { PluginRegistry } from './PluginRegistry.js';
import PluginLoaderModule from './PluginLoader.js';
const PluginLoader = PluginLoaderModule.default || PluginLoaderModule;
import { logger } from '../utils/logger.js';
import { PLUGIN_STATES, PLUGIN_TYPES } from './PluginTypes.js';

// ================================================
// PLUGIN MANAGER CLASS
// ================================================

class PluginManager {
  constructor() {
    if (PluginManager.instance) {
      return PluginManager.instance;
    }
    console.log('PluginLoader import value:', PluginLoader);
    console.log('Type of PluginLoader:', typeof PluginLoader);
    if (typeof PluginLoader !== 'function') {
      throw new Error('PluginLoader is not a constructor function');
    }
    this.registry = new PluginRegistry();
    try {
      this.loader = new PluginLoader();
      console.log('this.loader instance:', this.loader);
      console.log('this.loader.loadPlugin exists:', typeof this.loader.loadPlugin === 'function');
    } catch (error) {
      logger.error('Failed to instantiate PluginLoader:', error);
      throw error;
    }
    this.plugins = new Map(); // Active plugin instances
    this.pluginStates = new Map(); // Plugin state tracking
    this.eventListeners = new Map(); // Plugin event system
    this.dependencies = new Map(); // Plugin dependency graph
    this.apiClient = null; // Will be injected
    PluginManager.instance = this;
    
    logger.info('PluginManager initialized');
  }

  // ================================================
  // SINGLETON PATTERN
  // ================================================

  static getInstance() {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  // ================================================
  // API CLIENT INTEGRATION
  // ================================================

  /**
   * Inject the API client for plugin-backend communication
   * @param {Object} apiClient - The Rust API client instance
   */
  setApiClient(apiClient) {
    this.apiClient = apiClient;
    logger.info('API client injected into PluginManager');
  }

  // ================================================
  // PLUGIN REGISTRATION
  // ================================================

  /**
   * Register a plugin with the system
   * @param {Object} pluginManifest - Plugin manifest containing metadata
   * @param {Function} pluginFactory - Factory function to create plugin instance
   */
  async registerPlugin(pluginManifest, pluginFactory) {
    try {
      logger.debug(`Attempting to register plugin: ${pluginManifest.id}`);
      
      // Validate plugin manifest
      this._validatePluginManifest(pluginManifest);
      
      // Check for conflicts
      if (this.registry.isRegistered(pluginManifest.id)) {
        logger.warn(`Plugin ${pluginManifest.id} is already registered, skipping registration`);
        return false; // Skip duplicate registration
      }

      // Register with registry
      await this.registry.register(pluginManifest, pluginFactory);
      
      // Initialize dependency tracking
      this.dependencies.set(pluginManifest.id, pluginManifest.dependencies || []);
      
      // Set initial state
      this.pluginStates.set(pluginManifest.id, PLUGIN_STATES.REGISTERED);
      
      logger.info(`Plugin ${pluginManifest.id} registered successfully`);
      
      // Emit registration event
      this._emitPluginEvent('plugin:registered', {
        pluginId: pluginManifest.id,
        manifest: pluginManifest
      });

      return true;
    } catch (error) {
      logger.error(`Failed to register plugin ${pluginManifest.id}:`, error);
      throw error;
    }
  }

  // ================================================
  // PLUGIN LOADING
  // ================================================

  /**
   * Load and activate a specific plugin
   * @param {string} pluginId - Unique plugin identifier
   * @param {Object} options - Loading options
   */
  async loadPlugin(pluginId, options = {}) {
    try {
      // Check if plugin is registered
      if (!this.registry.isRegistered(pluginId)) {
        throw new Error(`Plugin ${pluginId} is not registered`);
      }

      // Check current state
      const currentState = this.pluginStates.get(pluginId);
      if (currentState === PLUGIN_STATES.LOADED) {
        logger.warn(`Plugin ${pluginId} is already loaded`);
        return this.plugins.get(pluginId);
      }

      // Load dependencies first
      await this._loadDependencies(pluginId);

      // Load the plugin
      this.pluginStates.set(pluginId, PLUGIN_STATES.LOADING);
      
      const pluginInstance = await this.loader.loadPlugin(
        pluginId, 
        this.registry, 
        { apiClient: this.apiClient, ...options }
      );
      
      // Store plugin instance
      this.plugins.set(pluginId, pluginInstance);
      this.pluginStates.set(pluginId, PLUGIN_STATES.LOADED);
      
      logger.info(`Plugin ${pluginId} loaded successfully`);
      
      // Emit load event
      this._emitPluginEvent('plugin:loaded', {
        pluginId,
        instance: pluginInstance
      });

      return pluginInstance;
    } catch (error) {
      this.pluginStates.set(pluginId, PLUGIN_STATES.ERROR);
      logger.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Load all registered plugins
   */
  async loadAllPlugins() {
    const registeredPlugins = this.registry.getAllPlugins();
    const results = [];

    for (const [pluginId] of registeredPlugins) {
      try {
        const instance = await this.loadPlugin(pluginId);
        results.push({ pluginId, success: true, instance });
      } catch (error) {
        results.push({ pluginId, success: false, error: error.message });
      }
    }

    logger.info(`Loaded ${results.filter(r => r.success).length}/${results.length} plugins`);
    return results;
  }

  // ================================================
  // PLUGIN UNLOADING
  // ================================================

  /**
   * Unload and deactivate a plugin
   * @param {string} pluginId - Plugin to unload
   */
  async unloadPlugin(pluginId) {
    try {
      if (!this.plugins.has(pluginId)) {
        logger.warn(`Plugin ${pluginId} is not loaded`);
        return;
      }

      // Check for dependents
      const dependents = this._findDependents(pluginId);
      if (dependents.length > 0) {
        throw new Error(`Cannot unload ${pluginId}: Required by ${dependents.join(', ')}`);
      }

      const pluginInstance = this.plugins.get(pluginId);
      
      // Call plugin cleanup if available
      if (pluginInstance && typeof pluginInstance.cleanup === 'function') {
        await pluginInstance.cleanup();
      }

      // Remove from active plugins
      this.plugins.delete(pluginId);
      this.pluginStates.set(pluginId, PLUGIN_STATES.UNLOADED);
      
      logger.info(`Plugin ${pluginId} unloaded successfully`);
      
      // Emit unload event
      this._emitPluginEvent('plugin:unloaded', { pluginId });

    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // ================================================
  // PLUGIN QUERYING
  // ================================================

  /**
   * Get a loaded plugin instance
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin instance or null if not loaded
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get all plugins of a specific type
   * @param {string} pluginType - Plugin type to filter by
   * @returns {Array} Array of plugin instances
   */
  getPluginsByType(pluginType) {
    const result = [];
    
    for (const [pluginId, instance] of this.plugins) {
      const manifest = this.registry.getPluginManifest(pluginId);
      if (manifest && manifest.type === pluginType) {
        result.push({ pluginId, instance, manifest });
      }
    }
    
    return result;
  }

  /**
   * Get plugin state
   * @param {string} pluginId - Plugin identifier
   * @returns {string} Current plugin state
   */
  getPluginState(pluginId) {
    return this.pluginStates.get(pluginId) || PLUGIN_STATES.UNKNOWN;
  }

  // ================================================
  // EVENT SYSTEM
  // ================================================

  /**
   * Subscribe to plugin events
   * @param {string} eventName - Event name to listen for
   * @param {Function} callback - Event callback function
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
  }

  /**
   * Unsubscribe from plugin events
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback to remove
   */
  off(eventName, callback) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit plugin event to all listeners
   * @param {string} eventName - Event name
   * @param {Object} eventData - Event data
   */
  _emitPluginEvent(eventName, eventData) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          logger.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  // ================================================
  // PRIVATE HELPER METHODS
  // ================================================

  /**
   * Validate plugin manifest structure
   * @param {Object} manifest - Plugin manifest to validate
   */
  _validatePluginManifest(manifest) {
    const required = ['id', 'name', 'version', 'type'];
    const missing = required.filter(field => !manifest[field]);
    
    if (missing.length > 0) {
      throw new Error(`Plugin manifest missing required fields: ${missing.join(', ')}`);
    }
    
    if (!Object.values(PLUGIN_TYPES).includes(manifest.type)) {
      throw new Error(`Invalid plugin type: ${manifest.type}`);
    }
  }

  /**
   * Load plugin dependencies recursively
   * @param {string} pluginId - Plugin whose dependencies to load
   */
  async _loadDependencies(pluginId) {
    const dependencies = this.dependencies.get(pluginId) || [];
    
    for (const depId of dependencies) {
      if (!this.registry.isRegistered(depId)) {
        throw new Error(`Dependency ${depId} not found for plugin ${pluginId}`);
      }
      
      if (this.pluginStates.get(depId) !== PLUGIN_STATES.LOADED) {
        await this.loadPlugin(depId);
      }
    }
  }

  /**
   * Find plugins that depend on a given plugin
   * @param {string} pluginId - Plugin to find dependents for
   * @returns {Array} Array of dependent plugin IDs
   */
  _findDependents(pluginId) {
    const dependents = [];
    
    for (const [id, deps] of this.dependencies) {
      if (deps.includes(pluginId) && this.pluginStates.get(id) === PLUGIN_STATES.LOADED) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  // ================================================
  // CLEANUP AND UTILITIES
  // ================================================

  /**
   * Clean up all plugins and reset manager state
   */
  async cleanup() {
    logger.info('Cleaning up PluginManager...');
    
    // Unload all plugins
    const loadedPlugins = Array.from(this.plugins.keys());
    for (const pluginId of loadedPlugins) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        logger.error(`Error unloading plugin ${pluginId} during cleanup:`, error);
      }
    }
    
    // Clear all maps
    this.plugins.clear();
    this.pluginStates.clear();
    this.eventListeners.clear();
    this.dependencies.clear();
    
    // Reset registry and loader
    await this.registry.cleanup();
    await this.loader.cleanup();
    
    // Reset singleton instance to allow re-initialization
    PluginManager.instance = null;
    
    logger.info('PluginManager cleanup completed');
  }
}

// ================================================
// EXPORTS
// ================================================

export { PluginManager };
export default PluginManager;
