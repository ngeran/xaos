 /**
 * File Path: src/core/plugin-system/PluginRegistry.js
 * Version: 1.0.0
 * Description: Plugin registration and discovery system that maintains a registry of all
 *              available plugins, their metadata, and factory functions. Handles plugin
 *              validation, version management, and conflict resolution.
 * 
 * How to Use:
 * 1. Create registry instance: const registry = new PluginRegistry()
 * 2. Register plugins: await registry.register(manifest, factory)
 * 3. Query plugins: registry.getPlugin(id) or registry.getPluginsByType(type)
 * 4. Auto-discovery: await registry.discoverPlugins(pluginDirectory)
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with registration, discovery, and validation
 */

import { logger } from '../utils/logger.js';
import { PLUGIN_TYPES, PLUGIN_STATES } from './PluginTypes.js';
import { validatePluginManifest, validatePluginFactory } from '../utils/validators.js';

// ================================================
// PLUGIN REGISTRY CLASS
// ================================================

class PluginRegistry {
  constructor() {
    this.registeredPlugins = new Map(); // pluginId -> { manifest, factory, metadata }
    this.pluginsByType = new Map(); // pluginType -> Set of pluginIds
    this.pluginVersions = new Map(); // pluginId -> Set of versions
    this.registrationOrder = []; // Order of plugin registration
    this.discoveryPaths = new Set(); // Paths where plugins can be discovered
    
    logger.info('PluginRegistry initialized');
  }

  // ================================================
  // PLUGIN REGISTRATION
  // ================================================

  /**
   * Register a plugin with the registry
   * @param {Object} manifest - Plugin manifest containing metadata
   * @param {Function} factory - Factory function to create plugin instances
   * @param {Object} options - Registration options
   */
  async register(manifest, factory, options = {}) {
    try {
      // Validate inputs
      validatePluginManifest(manifest);
      validatePluginFactory(factory);

      const pluginId = manifest.id;
      const pluginType = manifest.type;
      const pluginVersion = manifest.version;

      // Check for existing registration
      if (this.registeredPlugins.has(pluginId)) {
        if (!options.allowOverride) {
          throw new Error(`Plugin ${pluginId} is already registered. Use allowOverride option to replace.`);
        }
        logger.warn(`Overriding existing plugin registration: ${pluginId}`);
      }

      // Version conflict check
      await this._checkVersionConflicts(pluginId, pluginVersion, options);

      // Create plugin registration entry
      const registration = {
        manifest: { ...manifest },
        factory,
        metadata: {
          registeredAt: new Date().toISOString(),
          registrationOrder: this.registrationOrder.length,
          source: options.source || 'manual',
          checksum: options.checksum || null
        }
      };

      // Store registration
      this.registeredPlugins.set(pluginId, registration);
      
      // Update type mapping
      if (!this.pluginsByType.has(pluginType)) {
        this.pluginsByType.set(pluginType, new Set());
      }
      this.pluginsByType.get(pluginType).add(pluginId);

      // Update version tracking
      if (!this.pluginVersions.has(pluginId)) {
        this.pluginVersions.set(pluginId, new Set());
      }
      this.pluginVersions.get(pluginId).add(pluginVersion);

      // Track registration order
      if (!this.registrationOrder.includes(pluginId)) {
        this.registrationOrder.push(pluginId);
      }

      logger.info(`Plugin registered: ${pluginId}@${pluginVersion} (${pluginType})`);

      return {
        success: true,
        pluginId,
        version: pluginVersion,
        type: pluginType
      };

    } catch (error) {
      logger.error(`Failed to register plugin ${manifest?.id || 'unknown'}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin from the registry
   * @param {string} pluginId - Plugin to unregister
   * @param {Object} options - Unregistration options
   */
  async unregister(pluginId, options = {}) {
    try {
      if (!this.registeredPlugins.has(pluginId)) {
        if (!options.silentFail) {
          throw new Error(`Plugin ${pluginId} is not registered`);
        }
        return { success: true, message: 'Plugin was not registered' };
      }

      const registration = this.registeredPlugins.get(pluginId);
      const pluginType = registration.manifest.type;

      // Remove from main registry
      this.registeredPlugins.delete(pluginId);

      // Remove from type mapping
      if (this.pluginsByType.has(pluginType)) {
        this.pluginsByType.get(pluginType).delete(pluginId);
        if (this.pluginsByType.get(pluginType).size === 0) {
          this.pluginsByType.delete(pluginType);
        }
      }

      // Remove from version tracking
      this.pluginVersions.delete(pluginId);

      // Remove from registration order
      const orderIndex = this.registrationOrder.indexOf(pluginId);
      if (orderIndex !== -1) {
        this.registrationOrder.splice(orderIndex, 1);
      }

      logger.info(`Plugin unregistered: ${pluginId}`);

      return {
        success: true,
        pluginId,
        type: pluginType
      };

    } catch (error) {
      logger.error(`Failed to unregister plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // ================================================
  // PLUGIN DISCOVERY
  // ================================================

  /**
   * Auto-discover plugins from specified directories
   * @param {Array<string>} discoveryPaths - Paths to search for plugins
   * @param {Object} options - Discovery options
   */
  async discoverPlugins(discoveryPaths = [], options = {}) {
    try {
      const discovered = [];
      const errors = [];

      // Add to known discovery paths
      discoveryPaths.forEach(path => this.discoveryPaths.add(path));

      // In a real implementation, this would scan directories
      // For now, we'll simulate discovery from a known plugin structure
      logger.info(`Starting plugin discovery in ${discoveryPaths.length} paths`);

      // Simulate discovery process
      for (const path of discoveryPaths) {
        try {
          const pluginsInPath = await this._discoverPluginsInPath(path, options);
          discovered.push(...pluginsInPath);
        } catch (error) {
          logger.error(`Discovery failed for path ${path}:`, error);
          errors.push({ path, error: error.message });
        }
      }

      logger.info(`Plugin discovery completed: ${discovered.length} plugins found, ${errors.length} errors`);

      return {
        discovered,
        errors,
        totalFound: discovered.length
      };

    } catch (error) {
      logger.error('Plugin discovery failed:', error);
      throw error;
    }
  }

  /**
   * Discover plugins in a specific path
   * @param {string} path - Path to scan
   * @param {Object} options - Discovery options
   */
  async _discoverPluginsInPath(path, options) {
    // This would be implemented to scan actual directories
    // For now, return empty array as plugins will be manually registered
    logger.info(`Scanning for plugins in: ${path}`);
    return [];
  }

  // ================================================
  // PLUGIN QUERYING
  // ================================================

  /**
   * Check if a plugin is registered
   * @param {string} pluginId - Plugin identifier
   * @returns {boolean} True if plugin is registered
   */
  isRegistered(pluginId) {
    return this.registeredPlugins.has(pluginId);
  }

  /**
   * Get plugin registration data
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin registration or null if not found
   */
  getPlugin(pluginId) {
    return this.registeredPlugins.get(pluginId) || null;
  }

  /**
   * Get plugin manifest
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin manifest or null if not found
   */
  getPluginManifest(pluginId) {
    const registration = this.registeredPlugins.get(pluginId);
    return registration ? registration.manifest : null;
  }

  /**
   * Get plugin factory function
   * @param {string} pluginId - Plugin identifier
   * @returns {Function|null} Plugin factory or null if not found
   */
  getPluginFactory(pluginId) {
    const registration = this.registeredPlugins.get(pluginId);
    return registration ? registration.factory : null;
  }

  /**
   * Get all registered plugins
   * @returns {Map} Map of all registered plugins
   */
  getAllPlugins() {
    return new Map(this.registeredPlugins);
  }

  /**
   * Get plugins by type
   * @param {string} pluginType - Plugin type to filter by
   * @returns {Array} Array of plugin registrations
   */
  getPluginsByType(pluginType) {
    const pluginIds = this.pluginsByType.get(pluginType);
    if (!pluginIds) return [];

    return Array.from(pluginIds).map(id => ({
      pluginId: id,
      ...this.registeredPlugins.get(id)
    }));
  }

  /**
   * Search plugins by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Array of matching plugin registrations
   */
  searchPlugins(criteria = {}) {
    const results = [];
    
    for (const [pluginId, registration] of this.registeredPlugins) {
      let matches = true;
      
      // Check type filter
      if (criteria.type && registration.manifest.type !== criteria.type) {
        matches = false;
      }
      
      // Check name filter (partial match)
      if (criteria.name && !registration.manifest.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        matches = false;
      }
      
      // Check version filter
      if (criteria.version && registration.manifest.version !== criteria.version) {
        matches = false;
      }
      
      // Check tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const pluginTags = registration.manifest.tags || [];
        const hasMatchingTag = criteria.tags.some(tag => pluginTags.includes(tag));
        if (!hasMatchingTag) {
          matches = false;
        }
      }
      
      if (matches) {
        results.push({
          pluginId,
          ...registration
        });
      }
    }
    
    return results;
  }

  // ================================================
  // VERSION MANAGEMENT
  // ================================================

  /**
   * Check for version conflicts
   * @param {string} pluginId - Plugin identifier
   * @param {string} version - Version to check
   * @param {Object} options - Check options
   */
  async _checkVersionConflicts(pluginId, version, options = {}) {
    const existingVersions = this.pluginVersions.get(pluginId);
    
    if (!existingVersions || existingVersions.size === 0) {
      return; // No conflicts for new plugin
    }
    
    if (existingVersions.has(version)) {
      if (!options.allowVersionOverride) {
        throw new Error(`Plugin ${pluginId} version ${version} is already registered`);
      }
      logger.warn(`Overriding existing version ${version} for plugin ${pluginId}`);
    }
    
    // Additional version compatibility checks could go here
    logger.info(`Version check passed for ${pluginId}@${version}`);
  }

  /**
   * Get plugin version history
   * @param {string} pluginId - Plugin identifier
   * @returns {Array} Array of registered versions
   */
  getPluginVersions(pluginId) {
    const versions = this.pluginVersions.get(pluginId);
    return versions ? Array.from(versions).sort() : [];
  }

  // ================================================
  // REGISTRY STATISTICS
  // ================================================

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getRegistryStats() {
    const stats = {
      totalPlugins: this.registeredPlugins.size,
      pluginsByType: {},
      totalVersions: 0,
      registrationOrder: [...this.registrationOrder],
      discoveryPaths: Array.from(this.discoveryPaths)
    };
    
    // Count plugins by type
    for (const [type, pluginIds] of this.pluginsByType) {
      stats.pluginsByType[type] = pluginIds.size;
    }
    
    // Count total versions
    for (const versions of this.pluginVersions.values()) {
      stats.totalVersions += versions.size;
    }
    
    return stats;
  }

  /**
   * Get detailed plugin information
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Detailed plugin information
   */
  getPluginDetails(pluginId) {
    const registration = this.registeredPlugins.get(pluginId);
    if (!registration) return null;
    
    const versions = this.getPluginVersions(pluginId);
    const dependents = this._findPluginDependents(pluginId);
    
    return {
      pluginId,
      manifest: registration.manifest,
      metadata: registration.metadata,
      versions,
      dependents,
      hasFactory: typeof registration.factory === 'function'
    };
  }

  /**
   * Find plugins that depend on a given plugin
   * @param {string} pluginId - Plugin to find dependents for
   * @returns {Array} Array of dependent plugin IDs
   */
  _findPluginDependents(pluginId) {
    const dependents = [];
    
    for (const [id, registration] of this.registeredPlugins) {
      const dependencies = registration.manifest.dependencies || [];
      if (dependencies.includes(pluginId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  // ================================================
  // VALIDATION AND UTILITIES
  // ================================================

  /**
   * Validate registry integrity
   * @returns {Object} Validation result
   */
  async validateRegistry() {
    const issues = [];
    const warnings = [];
    
    // Check for missing dependencies
    for (const [pluginId, registration] of this.registeredPlugins) {
      const dependencies = registration.manifest.dependencies || [];
      
      for (const depId of dependencies) {
        if (!this.registeredPlugins.has(depId)) {
          issues.push({
            type: 'missing_dependency',
            pluginId,
            dependency: depId,
            message: `Plugin ${pluginId} depends on missing plugin ${depId}`
          });
        }
      }
    }
    
    // Check for circular dependencies
    const circularDeps = this._detectCircularDependencies();
    if (circularDeps.length > 0) {
      issues.push(...circularDeps.map(cycle => ({
        type: 'circular_dependency',
        cycle,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`
      })));
    }
    
    // Check for duplicate names (different from IDs)
    const nameMap = new Map();
    for (const [pluginId, registration] of this.registeredPlugins) {
      const name = registration.manifest.name;
      if (nameMap.has(name)) {
        warnings.push({
          type: 'duplicate_name',
          name,
          plugins: [nameMap.get(name), pluginId],
          message: `Multiple plugins with same name: ${name}`
        });
      } else {
        nameMap.set(name, pluginId);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings,
      summary: {
        totalPlugins: this.registeredPlugins.size,
        issueCount: issues.length,
        warningCount: warnings.length
      }
    };
  }

  /**
   * Detect circular dependencies in the registry
   * @returns {Array} Array of circular dependency chains
   */
  _detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    const dfs = (pluginId, path = []) => {
      if (recursionStack.has(pluginId)) {
        // Found cycle
        const cycleStart = path.indexOf(pluginId);
        cycles.push([...path.slice(cycleStart), pluginId]);
        return;
      }
      
      if (visited.has(pluginId)) return;
      
      visited.add(pluginId);
      recursionStack.add(pluginId);
      path.push(pluginId);
      
      const registration = this.registeredPlugins.get(pluginId);
      if (registration) {
        const dependencies = registration.manifest.dependencies || [];
        for (const depId of dependencies) {
          if (this.registeredPlugins.has(depId)) {
            dfs(depId, [...path]);
          }
        }
      }
      
      recursionStack.delete(pluginId);
    };
    
    // Check all plugins
    for (const pluginId of this.registeredPlugins.keys()) {
      if (!visited.has(pluginId)) {
        dfs(pluginId);
      }
    }
    
    return cycles;
  }

  // ================================================
  // EXPORT AND IMPORT
  // ================================================

  /**
   * Export registry data
   * @param {Object} options - Export options
   * @returns {Object} Serializable registry data
   */
  exportRegistry(options = {}) {
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      plugins: {},
      metadata: {
        totalPlugins: this.registeredPlugins.size,
        discoveryPaths: Array.from(this.discoveryPaths),
        registrationOrder: [...this.registrationOrder]
      }
    };
    
    // Export plugin data (excluding factory functions)
    for (const [pluginId, registration] of this.registeredPlugins) {
      exportData.plugins[pluginId] = {
        manifest: registration.manifest,
        metadata: registration.metadata
      };
      
      if (options.includeSource && registration.factory.toString) {
        exportData.plugins[pluginId].factorySource = registration.factory.toString();
      }
    }
    
    return exportData;
  }

  /**
   * Import registry data (manifests only, factories must be re-registered)
   * @param {Object} registryData - Registry data to import
   * @param {Object} options - Import options
   */
  async importRegistry(registryData, options = {}) {
    try {
      if (!registryData.version || !registryData.plugins) {
        throw new Error('Invalid registry data format');
      }
      
      const imported = [];
      const failed = [];
      
      for (const [pluginId, pluginData] of Object.entries(registryData.plugins)) {
        try {
          // Only import manifest, factory must be provided separately
          if (!options.factoryMap || !options.factoryMap[pluginId]) {
            failed.push({
              pluginId,
              error: 'No factory function provided for plugin'
            });
            continue;
          }
          
          await this.register(
            pluginData.manifest,
            options.factoryMap[pluginId],
            { allowOverride: options.allowOverride }
          );
          
          imported.push(pluginId);
          
        } catch (error) {
          failed.push({
            pluginId,
            error: error.message
          });
        }
      }
      
      logger.info(`Registry import completed: ${imported.length} success, ${failed.length} failed`);
      
      return {
        success: true,
        imported,
        failed,
        summary: {
          totalAttempted: Object.keys(registryData.plugins).length,
          successful: imported.length,
          failed: failed.length
        }
      };
      
    } catch (error) {
      logger.error('Registry import failed:', error);
      throw error;
    }
  }

  // ================================================
  // CLEANUP
  // ================================================

  /**
   * Clear all registry data
   */
  async cleanup() {
    logger.info('Cleaning up PluginRegistry...');
    
    this.registeredPlugins.clear();
    this.pluginsByType.clear();
    this.pluginVersions.clear();
    this.registrationOrder.length = 0;
    this.discoveryPaths.clear();
    
    logger.info('PluginRegistry cleanup completed');
  }

  /**
   * Get registry health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    const validation = this.validateRegistry();
    const stats = this.getRegistryStats();
    
    return {
      healthy: validation.valid && validation.warnings.length === 0,
      status: validation.valid ? 'healthy' : 'issues_detected',
      lastCheck: new Date().toISOString(),
      stats,
      issues: validation.issues,
      warnings: validation.warnings
    };
  }
}

// ================================================
// EXPORTS
// ================================================

export { PluginRegistry };
export default PluginRegistry;
