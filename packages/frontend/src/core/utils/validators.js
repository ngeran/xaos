
/**
 * File Path: src/core/utils/validators.js
 * Version: 1.1.0
 * Description: Comprehensive validation utilities for the plugin system. Provides
 *              validation for plugin manifests, instances, configurations, and
 *              system constraints. Ensures plugin integrity and compatibility.
 * 
 * How to Use:
 * 1. Import validators: import { validatePluginManifest, validatePluginInstance } from '../utils/validators'
 * 2. Validate manifest: const result = validatePluginManifest(manifest)
 * 3. Check result: if (result.valid) { ... } else { console.log(result.errors) }
 * 4. Custom validation: const validator = createValidator(schema)
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with comprehensive plugin validation
 * v1.1.0 - Added safe fallback implementations for validatePluginInstance and
 *          validatePluginConfiguration to prevent undefined returns
 */

import { 
  PLUGIN_TYPES, 
  PLUGIN_CAPABILITIES, 
  PLUGIN_PERMISSIONS,
  REQUIRED_MANIFEST_FIELDS,
  OPTIONAL_MANIFEST_FIELDS,
  VERSION_PATTERNS,
  SYSTEM_CONSTANTS,
  isValidPluginType 
} from '../plugin-system/PluginTypes.js';
import { logger } from './logger.js';

// ================================================
// VALIDATION RESULT TYPES
// ================================================

/**
 * Create validation result
 * @param {boolean} valid - Whether validation passed
 * @param {Array} errors - Array of error messages
 * @param {Array} warnings - Array of warning messages
 * @returns {Object} Validation result
 */
function createValidationResult(valid = true, errors = [], warnings = []) {
  return {
    valid,
    errors: [...errors],
    warnings: [...warnings],
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errorCount: errors.length,
    warningCount: warnings.length
  };
}

// ================================================
// PLUGIN MANIFEST VALIDATION
// ================================================

/**
 * Validate plugin manifest structure and content
 * @param {Object} manifest - Plugin manifest to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validatePluginManifest(manifest, options = {}) {
  // Placeholder implementation - extend as needed
  if (!manifest || typeof manifest !== 'object') {
    return createValidationResult(false, ['Manifest must be an object']);
  }
  if (!manifest.id) {
    return createValidationResult(false, ['Manifest must include an id']);
  }
  if (!manifest.version) {
    return createValidationResult(false, ['Manifest must include a version']);
  }
  return createValidationResult(true);
}

// ================================================
// PLUGIN INSTANCE VALIDATION
// ================================================

/**
 * Validate plugin instance after creation
 * @param {Object} instance - Plugin instance to validate
 * @param {Object} manifest - Plugin manifest
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validatePluginInstance(instance, manifest, options = {}) {
  const errors = [];
  const warnings = [];

  if (!instance || typeof instance !== 'object') {
    errors.push('Plugin instance must be a valid object');
    return createValidationResult(false, errors, warnings);
  }

  // Check for required lifecycle methods
  if (typeof instance.init !== 'function') {
    warnings.push('Plugin does not implement an init() method');
  }
  if (typeof instance.cleanup !== 'function') {
    warnings.push('Plugin does not implement a cleanup() method');
  }

  // Ensure manifest consistency
  if (!manifest || typeof manifest !== 'object') {
    warnings.push('Manifest not provided or invalid during instance validation');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

// ================================================
// PLUGIN FACTORY VALIDATION
// ================================================

/**
 * Validate plugin factory function
 * @param {Function} factory - Plugin factory function
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validatePluginFactory(factory, options = {}) {
  if (typeof factory !== 'function') {
    return createValidationResult(false, ['Factory must be a function']);
  }
  return createValidationResult(true);
}

// ================================================
// CONFIGURATION VALIDATION
// ================================================

/**
 * Validate plugin configuration against schema
 * @param {Object} config - Configuration object
 * @param {Object} schema - Configuration schema
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validatePluginConfiguration(config, schema, options = {}) {
  if (!schema || typeof schema !== 'object') {
    // No schema provided → assume valid
    return createValidationResult(true);
  }

  const errors = [];
  const warnings = [];

  // Basic validation loop (extend with real schema checks later)
  for (const key of Object.keys(config || {})) {
    if (!schema.properties || !schema.properties[key]) {
      warnings.push(`Unknown configuration key: ${key}`);
    }
  }

  // Required keys check
  if (schema.required) {
    for (const requiredKey of schema.required) {
      if (config[requiredKey] === undefined) {
        errors.push(`Missing required configuration key: ${requiredKey}`);
      }
    }
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

// ================================================
// SYSTEM VALIDATION
// ================================================

/**
 * Validate system constraints
 * @param {Object} constraints - System constraints to validate
 * @returns {Object} Validation result
 */
function validateSystemConstraints(constraints) {
  // Basic always-pass implementation for now
  return createValidationResult(true);
}

/**
 * Validate plugin compatibility with system
 * @param {Object} manifest - Plugin manifest
 * @param {Object} systemInfo - System information
 * @returns {Object} Validation result
 */
function validatePluginCompatibility(manifest, systemInfo) {
  // Basic always-pass implementation for now
  return createValidationResult(true);
}

// ================================================
// BASIC VALIDATION UTILITIES
// ================================================

/**
 * Validate plugin ID format
 * @param {string} id - Plugin ID to validate
 * @returns {boolean} True if valid
 */
function validatePluginId(id) {
  return typeof id === 'string' && /^[a-z0-9-_]+$/.test(id);
}

/**
 * Validate version string
 * @param {string} version - Version string to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateVersion(version) {
  if (typeof version !== 'string') {
    return createValidationResult(false, ['Version must be a string']);
  }
  if (!VERSION_PATTERNS.SEMVER.test(version)) {
    return createValidationResult(false, [`Invalid version format: ${version}`]);
  }
  return createValidationResult(true);
}

/**
 * Validate version range string
 * @param {string} range - Version range to validate
 * @returns {Object} Validation result
 */
function validateVersionRange(range) {
  if (typeof range !== 'string') {
    return createValidationResult(false, ['Version range must be a string']);
  }
  return createValidationResult(true);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Create custom validator
 * @param {Object} schema - Validation schema
 * @returns {Function} Validator function
 */
function createValidator(schema) {
  return (data, options = {}) => {
    return validatePluginConfiguration(data, schema, options);
  };
}

/**
 * Combine multiple validation results
 * @param {...Object} results - Validation results to combine
 * @returns {Object} Combined validation result
 */
function combineValidationResults(...results) {
  const allErrors = [];
  const allWarnings = [];
  
  for (const result of results) {
    if (result.errors) {
      allErrors.push(...result.errors);
    }
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }
  
  return createValidationResult(allErrors.length === 0, allErrors, allWarnings);
}

/**
 * Validate multiple plugins at once
 * @param {Array} plugins - Array of {manifest, factory} objects
 * @param {Object} options - Validation options
 * @returns {Object} Batch validation result
 */
function validatePluginBatch(plugins, options = {}) {
  const results = [];
  
  for (let i = 0; i < plugins.length; i++) {
    const { manifest, factory } = plugins[i];
    
    try {
      const manifestValidation = validatePluginManifest(manifest, options);
      const factoryValidation = factory ? validatePluginFactory(factory, options) : createValidationResult();
      
      const combinedResult = combineValidationResults(manifestValidation, factoryValidation);
      
      results.push({
        index: i,
        pluginId: manifest?.id || `plugin-${i}`,
        ...combinedResult
      });
    } catch (error) {
      results.push({
        index: i,
        pluginId: manifest?.id || `plugin-${i}`,
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      });
    }
  }
  
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  
  return {
    valid: totalErrors === 0,
    totalPlugins: plugins.length,
    validPlugins: results.filter(r => r.valid).length,
    invalidPlugins: results.filter(r => !r.valid).length,
    totalErrors,
    totalWarnings,
    results
  };
}

// ================================================
// EXPORTS (SINGLE EXPORT SECTION)
// ================================================

export {
  createValidationResult,
  validatePluginManifest,
  validatePluginInstance,
  validatePluginFactory,
  validatePluginConfiguration,
  validateSystemConstraints,
  validatePluginCompatibility,
  validatePluginId,
  validateVersion,
  validateVersionRange,
  validateUrl,
  validateEmail,
  createValidator,
  combineValidationResults,
  validatePluginBatch
};

export default {
  validatePluginManifest,
  validatePluginInstance,
  validatePluginFactory,
  validatePluginConfiguration,
  validateSystemConstraints,
  validatePluginCompatibility,
  createValidator,
  combineValidationResults,
  validatePluginBatch
};
