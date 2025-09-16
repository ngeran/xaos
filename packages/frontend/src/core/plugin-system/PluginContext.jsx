/**
 * File Path: src/core/plugin-system/PluginContext.js
 * Version: 1.0.0
 * Description: Plugin context provider that supplies shared context and utilities
 *              to all plugins. Manages plugin communication, shared state, and
 *              provides access to system-wide resources and APIs.
 * 
 * How to Use:
 * 1. Automatically provided by the plugin loader to each plugin
 * 2. Used internally by the plugin system for context management
 * 3. Plugins receive this context in their factory function
 * 4. Provides communication bridge between plugins and the system
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with context management and communication
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '../utils/logger.js';
import { PLUGIN_EVENTS } from './PluginTypes.js';

// ================================================
// PLUGIN CONTEXT DEFINITION
// ================================================

const PluginContextReact = createContext({
  pluginManager: null,
  apiClient: null,
  eventBus: null,
  sharedState: {},
  updateSharedState: () => {},
  plugins: {},
  systemInfo: {}
});

// ================================================
// PLUGIN CONTEXT PROVIDER COMPONENT
// ================================================

// REMOVED export keyword here
const PluginContextProvider = ({ 
  children, 
  pluginManager, 
  apiClient,
  initialSharedState = {}
}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [sharedState, setSharedState] = useState(initialSharedState);
  const [plugins, setPlugins] = useState({});
  const [eventBus] = useState(() => new PluginEventBus());
  const [systemInfo] = useState(() => ({
    version: '1.0.0',
    platform: 'web',
    userAgent: navigator.userAgent,
    features: ['css-grid', 'flexbox', 'local-storage', 'web-workers'],
    capabilities: {
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasWebWorkers: typeof Worker !== 'undefined',
      hasWebGL: !!window.WebGLRenderingContext,
      hasGeolocation: !!navigator.geolocation
    }
  }));

  // ================================================
  // SHARED STATE MANAGEMENT
  // ================================================

  const updateSharedState = (updates) => {
    setSharedState(prev => {
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      
      // Emit state change event
      eventBus.emit(PLUGIN_EVENTS.PLUGIN_MESSAGE, {
        type: 'shared-state-updated',
        data: { previous: prev, current: newState, updates }
      });
      
      return newState;
    });
  };

  // ================================================
  // PLUGIN TRACKING
  // ================================================

  useEffect(() => {
    if (!pluginManager) return;

    const handlePluginLoaded = (event) => {
      setPlugins(prev => ({
        ...prev,
        [event.pluginId]: {
          id: event.pluginId,
          instance: event.instance,
          loadedAt: new Date().toISOString(),
          status: 'loaded'
        }
      }));
    };

    const handlePluginUnloaded = (event) => {
      setPlugins(prev => {
        const updated = { ...prev };
        delete updated[event.pluginId];
        return updated;
      });
    };

    pluginManager.on('plugin:loaded', handlePluginLoaded);
    pluginManager.on('plugin:unloaded', handlePluginUnloaded);

    return () => {
      pluginManager.off('plugin:loaded', handlePluginLoaded);
      pluginManager.off('plugin:unloaded', handlePluginUnloaded);
    };
  }, [pluginManager]);

  // ================================================
  // CONTEXT VALUE
  // ================================================

  const contextValue = {
    pluginManager,
    apiClient,
    eventBus,
    sharedState,
    updateSharedState,
    plugins,
    systemInfo
  };

  return (
    <PluginContextReact.Provider value={contextValue}>
      {children}
    </PluginContextReact.Provider>
  );
};

// ================================================
// CONTEXT HOOK
// ================================================

// REMOVED export keyword here
const usePluginContext = () => {
  const context = useContext(PluginContextReact);
  if (!context) {
    throw new Error('usePluginContext must be used within PluginContextProvider');
  }
  return context;
};

// ================================================
// PLUGIN EVENT BUS
// ================================================

// REMOVED export keyword here (class doesn't need it)
class PluginEventBus {
  constructor() {
    this.listeners = new Map();
    this.logger = logger.createChild({ component: 'PluginEventBus' });
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event to listen for
   * @param {Function} callback - Callback function
   * @param {string} pluginId - Plugin ID for tracking
   */
  on(eventName, callback, pluginId = 'system') {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Map());
    }

    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners.has(pluginId)) {
      eventListeners.set(pluginId, new Set());
    }

    eventListeners.get(pluginId).add(callback);
    
    this.logger.debug(`Event listener registered: ${eventName} by ${pluginId}`);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback to remove
   * @param {string} pluginId - Plugin ID
   */
  off(eventName, callback, pluginId = 'system') {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners && eventListeners.has(pluginId)) {
      eventListeners.get(pluginId).delete(callback);
      
      // Clean up empty sets
      if (eventListeners.get(pluginId).size === 0) {
        eventListeners.delete(pluginId);
      }
      
      // Clean up empty events
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Emit an event to all listeners
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @param {string} sourcePluginId - Source plugin ID
   */
  emit(eventName, data, sourcePluginId = 'system') {
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners) return;

    this.logger.debug(`Event emitted: ${eventName} from ${sourcePluginId}`, data);

    // Call all listeners for this event
    for (const [pluginId, callbacks] of eventListeners) {
      for (const callback of callbacks) {
        try {
          callback({
            eventName,
            data,
            sourcePluginId,
            targetPluginId: pluginId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          this.logger.error(`Error in event listener (${pluginId}):`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for a plugin
   * @param {string} pluginId - Plugin ID to clean up
   */
  cleanup(pluginId) {
    for (const [eventName, eventListeners] of this.listeners) {
      eventListeners.delete(pluginId);
      
      // Clean up empty events
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
    
    this.logger.debug(`Cleaned up event listeners for plugin: ${pluginId}`);
  }

  /**
   * Get event statistics
   * @returns {Object} Event bus statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.listeners.size,
      totalListeners: 0,
      eventBreakdown: {},
      pluginBreakdown: {}
    };

    for (const [eventName, eventListeners] of this.listeners) {
      let eventListenerCount = 0;
      
      for (const [pluginId, callbacks] of eventListeners) {
        const callbackCount = callbacks.size;
        eventListenerCount += callbackCount;
        
        if (!stats.pluginBreakdown[pluginId]) {
          stats.pluginBreakdown[pluginId] = 0;
        }
        stats.pluginBreakdown[pluginId] += callbackCount;
      }
      
      stats.eventBreakdown[eventName] = eventListenerCount;
      stats.totalListeners += eventListenerCount;
    }

    return stats;
  }
}

// ================================================
// PLUGIN CONTEXT FACTORY
// ================================================

/**
 * Create plugin context for individual plugins
 * @param {string} pluginId - Plugin identifier
 * @param {Object} manifest - Plugin manifest
 * @param {Object} globalContext - Global context from app
 * @returns {Object} Plugin-specific context
 */
// REMOVED export keyword here
function createPluginContext(pluginId, manifest, globalContext) {
  // ... (function body remains the same)
}

// ================================================
// PLUGIN STORAGE FACTORY
// ================================================

/**
 * Create plugin-specific storage
 * @param {string} pluginId - Plugin identifier
 * @returns {Object} Storage interface
 */
function createPluginStorage(pluginId) {
  // ... (function body remains the same)
}

// ================================================
// CONTEXT UTILITIES
// ================================================

/**
 * Create shared context for plugin communication
 * @param {Object} initialState - Initial shared state
 * @returns {Object} Shared context manager
 */
// REMOVED export keyword here
function createSharedContext(initialState = {}) {
  // ... (function body remains the same)
}

/**
 * Plugin context validator
 * @param {Object} context - Plugin context to validate
 * @returns {Object} Validation result
 */
// REMOVED export keyword here
function validatePluginContext(context) {
  // ... (function body remains the same)
}

// ================================================
// EXPORTS
// ================================================

export {
  PluginContextProvider,  // The provider component
  usePluginContext,       // The hook
  PluginEventBus,         // The event bus class
  createPluginContext,    // Context factory
  createPluginStorage,    // Storage factory
  createSharedContext,    // Shared context util
  validatePluginContext,  // Validation util
  PluginContextReact      // The context object itself
};
