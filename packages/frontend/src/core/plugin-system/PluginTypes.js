/**
 * File Path: src/core/plugin-system/PluginTypes.js
 * Version: 1.0.0
 * Description: Defines plugin types, states, and system constants for the plugin architecture.
 *              Provides type safety and standardization across the plugin system.
 * 
 * How to Use:
 * 1. Import required constants: import { PLUGIN_TYPES, PLUGIN_STATES } from './PluginTypes'
 * 2. Use in plugin manifests: manifest.type = PLUGIN_TYPES.UI_COMPONENT
 * 3. Check plugin states: if (state === PLUGIN_STATES.LOADED) { ... }
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with core plugin types and states
 */

// ================================================
// PLUGIN TYPES
// ================================================

/**
 * Available plugin types in the system
 * Each type defines a category of plugin functionality
 */
export const PLUGIN_TYPES = {
  // UI and Layout plugins
  LAYOUT: 'layout',                    // App layout, theme, navigation
  UI_COMPONENT: 'ui_component',        // Reusable UI components
  PAGE: 'page',                        // Full page components
  WIDGET: 'widget',                    // Small UI widgets
  MODAL: 'modal',                      // Modal dialogs and overlays
  
  // Business Logic plugins
  SERVICE: 'service',                  // Business logic services
  API_EXTENSION: 'api_extension',      // API endpoint extensions
  DATA_PROCESSOR: 'data_processor',    // Data processing and transformation
  WORKFLOW: 'workflow',                // Business process workflows
  
  // Integration plugins
  EXTERNAL_API: 'external_api',        // Third-party API integrations
  DATABASE: 'database',                // Database connectors
  AUTH_PROVIDER: 'auth_provider',      // Authentication providers
  NOTIFICATION: 'notification',        // Notification systems
  
  // Utility plugins
  MIDDLEWARE: 'middleware',            // Request/response middleware
  VALIDATOR: 'validator',              // Data validation
  FORMATTER: 'formatter',              // Data formatting
  LOGGER: 'logger',                    // Logging utilities
  
  // Developer tools
  DEV_TOOL: 'dev_tool',               // Development utilities
  DEBUG: 'debug',                      // Debugging tools
  PROFILER: 'profiler',               // Performance profiling
  
  // Custom and extension types
  EXTENSION: 'extension',              // Generic extensions
  CUSTOM: 'custom'                     // Custom plugin types
};

// ================================================
// PLUGIN STATES
// ================================================

/**
 * Plugin lifecycle states
 * Tracks the current state of each plugin in the system
 */
export const PLUGIN_STATES = {
  UNKNOWN: 'unknown',                  // State not determined
  DISCOVERED: 'discovered',            // Plugin found but not registered
  REGISTERED: 'registered',            // Plugin registered with system
  LOADING: 'loading',                  // Plugin is being loaded
  LOADED: 'loaded',                    // Plugin loaded and ready
  ACTIVE: 'active',                    // Plugin is actively running
  INACTIVE: 'inactive',                // Plugin loaded but not active
  UNLOADING: 'unloading',             // Plugin is being unloaded
  UNLOADED: 'unloaded',               // Plugin unloaded from system
  ERROR: 'error',                      // Plugin in error state
  DISABLED: 'disabled',                // Plugin disabled by user/system
  UPDATING: 'updating',                // Plugin being updated
  INCOMPATIBLE: 'incompatible'         // Plugin incompatible with current system
};

// ================================================
// PLUGIN PRIORITIES
// ================================================

/**
 * Plugin loading and execution priorities
 * Higher priority plugins load first
 */
export const PLUGIN_PRIORITIES = {
  CRITICAL: 1000,                      // System critical plugins
  HIGH: 750,                           // High priority plugins
  NORMAL: 500,                         // Standard priority
  LOW: 250,                            // Low priority plugins
  BACKGROUND: 100                      // Background/optional plugins
};

// ================================================
// PLUGIN LIFECYCLE EVENTS
// ================================================

/**
 * Plugin system events that can be listened to
 */
export const PLUGIN_EVENTS = {
  // Registration events
  PLUGIN_REGISTERED: 'plugin:registered',
  PLUGIN_UNREGISTERED: 'plugin:unregistered',
  
  // Loading events
  PLUGIN_LOADING: 'plugin:loading',
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_LOAD_FAILED: 'plugin:load_failed',
  
  // State change events
  PLUGIN_ACTIVATED: 'plugin:activated',
  PLUGIN_DEACTIVATED: 'plugin:deactivated',
  PLUGIN_STATE_CHANGED: 'plugin:state_changed',
  
  // Unloading events
  PLUGIN_UNLOADING: 'plugin:unloading',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  
  // Error events
  PLUGIN_ERROR: 'plugin:error',
  PLUGIN_WARNING: 'plugin:warning',
  
  // System events
  SYSTEM_READY: 'system:ready',
  SYSTEM_SHUTDOWN: 'system:shutdown',
  
  // Communication events
  PLUGIN_MESSAGE: 'plugin:message',
  PLUGIN_REQUEST: 'plugin:request',
  PLUGIN_RESPONSE: 'plugin:response'
};

// ================================================
// PLUGIN CAPABILITIES
// ================================================

/**
 * Standard plugin capabilities that can be declared
 */
export const PLUGIN_CAPABILITIES = {
  // UI Capabilities
  RENDERS_UI: 'renders_ui',            // Plugin renders user interface
  PROVIDES_ROUTES: 'provides_routes',  // Plugin adds routes
  MODIFIES_LAYOUT: 'modifies_layout',  // Plugin changes app layout
  THEME_AWARE: 'theme_aware',          // Plugin supports theming
  
  // Data Capabilities
  READS_DATA: 'reads_data',            // Plugin reads application data
  WRITES_DATA: 'writes_data',          // Plugin writes application data
  CACHES_DATA: 'caches_data',          // Plugin caches data
  VALIDATES_DATA: 'validates_data',    // Plugin validates data
  
  // API Capabilities
  PROVIDES_API: 'provides_api',        // Plugin provides API endpoints
  CONSUMES_API: 'consumes_api',        // Plugin calls external APIs
  MIDDLEWARE: 'middleware',            // Plugin acts as middleware
  AUTHENTICATES: 'authenticates',      // Plugin handles authentication
  
  // System Capabilities
  BACKGROUND_TASKS: 'background_tasks', // Plugin runs background tasks
  SCHEDULED_TASKS: 'scheduled_tasks',   // Plugin runs scheduled tasks
  SYSTEM_INTEGRATION: 'system_integration', // Plugin integrates with system
  LOGGING: 'logging',                   // Plugin provides logging
  
  // Communication Capabilities
  INTER_PLUGIN: 'inter_plugin',        // Plugin communicates with other plugins
  EXTERNAL_COMM: 'external_comm',      // Plugin communicates externally
  REAL_TIME: 'real_time',              // Plugin supports real-time features
  NOTIFICATIONS: 'notifications'        // Plugin sends notifications
};

// ================================================
// PLUGIN PERMISSIONS
// ================================================

/**
 * Permission levels for plugin operations
 */
export const PLUGIN_PERMISSIONS = {
  // Data permissions
  READ_USER_DATA: 'read_user_data',
  WRITE_USER_DATA: 'write_user_data',
  READ_SYSTEM_DATA: 'read_system_data',
  WRITE_SYSTEM_DATA: 'write_system_data',
  
  // API permissions
  MAKE_API_CALLS: 'make_api_calls',
  PROVIDE_ENDPOINTS: 'provide_endpoints',
  ACCESS_INTERNAL_API: 'access_internal_api',
  
  // System permissions
  MODIFY_UI: 'modify_ui',
  ACCESS_FILE_SYSTEM: 'access_file_system',
  BACKGROUND_EXECUTION: 'background_execution',
  SYSTEM_NOTIFICATIONS: 'system_notifications',
  
  // Plugin permissions
  LOAD_OTHER_PLUGINS: 'load_other_plugins',
  COMMUNICATE_WITH_PLUGINS: 'communicate_with_plugins',
  MODIFY_PLUGIN_STATE: 'modify_plugin_state'
};

// ================================================
// ERROR TYPES
// ================================================

/**
 * Plugin system error types
 */
export const PLUGIN_ERROR_TYPES = {
  REGISTRATION_ERROR: 'registration_error',
  LOADING_ERROR: 'loading_error',
  RUNTIME_ERROR: 'runtime_error',
  DEPENDENCY_ERROR: 'dependency_error',
  PERMISSION_ERROR: 'permission_error',
  VALIDATION_ERROR: 'validation_error',
  API_ERROR: 'api_error',
  CONFIGURATION_ERROR: 'configuration_error'
};

// ================================================
// PLUGIN MANIFEST SCHEMA
// ================================================

/**
 * Required fields in plugin manifest
 */
export const REQUIRED_MANIFEST_FIELDS = [
  'id',                                // Unique plugin identifier
  'name',                              // Human-readable plugin name
  'version',                           // Plugin version (semver)
  'type',                              // Plugin type from PLUGIN_TYPES
  'description'                        // Plugin description
];

/**
 * Optional manifest fields
 */
export const OPTIONAL_MANIFEST_FIELDS = [
  'author',                            // Plugin author
  'license',                           // Plugin license
  'homepage',                          // Plugin homepage URL
  'repository',                        // Source repository URL
  'keywords',                          // Search keywords
  'dependencies',                      // Plugin dependencies
  'peerDependencies',                  // Peer dependencies
  'capabilities',                      // Plugin capabilities
  'permissions',                       // Required permissions
  'configuration',                     // Configuration schema
  'priority',                          // Loading priority
  'disabled',                          // Initially disabled
  'experimental',                      // Experimental plugin flag
  'deprecated',                        // Deprecation notice
  'minimumSystemVersion',              // Minimum system version required
  'maximumSystemVersion',              // Maximum system version supported
  'platforms',                         // Supported platforms
  'tags',                              // Plugin tags for categorization
  'icon',                              // Plugin icon path/URL
  'screenshots',                       // Plugin screenshots
  'changelog'                          // Plugin changelog
];

// ================================================
// VERSION PATTERNS
// ================================================

/**
 * Semantic versioning patterns
 */
export const VERSION_PATTERNS = {
  SEMVER: /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/,
  MAJOR_MINOR: /^(\d+)\.(\d+)$/,
  MAJOR_ONLY: /^(\d+)$/
};

// ================================================
// SYSTEM CONSTANTS
// ================================================

/**
 * Plugin system configuration constants
 */
export const SYSTEM_CONSTANTS = {
  MAX_PLUGINS: 1000,                   // Maximum number of plugins
  MAX_PLUGIN_SIZE: 10 * 1024 * 1024,   // Maximum plugin size (10MB)
  LOAD_TIMEOUT: 30000,                 // Plugin load timeout (30 seconds)
  DEFAULT_PRIORITY: PLUGIN_PRIORITIES.NORMAL,
  PLUGIN_FILE_EXTENSION: '.plugin.js',
  MANIFEST_FILENAME: 'manifest.json',
  CONFIG_FILENAME: 'config.js'
};

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Check if a plugin type is valid
 * @param {string} type - Plugin type to validate
 * @returns {boolean} True if type is valid
 */
export function isValidPluginType(type) {
  return Object.values(PLUGIN_TYPES).includes(type);
}

/**
 * Check if a plugin state is valid
 * @param {string} state - Plugin state to validate
 * @returns {boolean} True if state is valid
 */
export function isValidPluginState(state) {
  return Object.values(PLUGIN_STATES).includes(state);
}

/**
 * Get plugin type display name
 * @param {string} type - Plugin type
 * @returns {string} Human-readable type name
 */
export function getPluginTypeDisplayName(type) {
  const displayNames = {
    [PLUGIN_TYPES.LAYOUT]: 'Layout',
    [PLUGIN_TYPES.UI_COMPONENT]: 'UI Component',
    [PLUGIN_TYPES.PAGE]: 'Page',
    [PLUGIN_TYPES.WIDGET]: 'Widget',
    [PLUGIN_TYPES.MODAL]: 'Modal',
    [PLUGIN_TYPES.SERVICE]: 'Service',
    [PLUGIN_TYPES.API_EXTENSION]: 'API Extension',
    [PLUGIN_TYPES.DATA_PROCESSOR]: 'Data Processor',
    [PLUGIN_TYPES.WORKFLOW]: 'Workflow',
    [PLUGIN_TYPES.EXTERNAL_API]: 'External API',
    [PLUGIN_TYPES.DATABASE]: 'Database',
    [PLUGIN_TYPES.AUTH_PROVIDER]: 'Auth Provider',
    [PLUGIN_TYPES.NOTIFICATION]: 'Notification',
    [PLUGIN_TYPES.MIDDLEWARE]: 'Middleware',
    [PLUGIN_TYPES.VALIDATOR]: 'Validator',
    [PLUGIN_TYPES.FORMATTER]: 'Formatter',
    [PLUGIN_TYPES.LOGGER]: 'Logger',
    [PLUGIN_TYPES.DEV_TOOL]: 'Dev Tool',
    [PLUGIN_TYPES.DEBUG]: 'Debug',
    [PLUGIN_TYPES.PROFILER]: 'Profiler',
    [PLUGIN_TYPES.EXTENSION]: 'Extension',
    [PLUGIN_TYPES.CUSTOM]: 'Custom'
  };
  
  return displayNames[type] || 'Unknown';
}

/**
 * Get plugin state display information
 * @param {string} state - Plugin state
 * @returns {Object} State display information
 */
export function getPluginStateInfo(state) {
  const stateInfo = {
    [PLUGIN_STATES.UNKNOWN]: { color: 'gray', label: 'Unknown' },
    [PLUGIN_STATES.DISCOVERED]: { color: 'blue', label: 'Discovered' },
    [PLUGIN_STATES.REGISTERED]: { color: 'purple', label: 'Registered' },
    [PLUGIN_STATES.LOADING]: { color: 'yellow', label: 'Loading...' },
    [PLUGIN_STATES.LOADED]: { color: 'green', label: 'Loaded' },
    [PLUGIN_STATES.ACTIVE]: { color: 'green', label: 'Active' },
    [PLUGIN_STATES.INACTIVE]: { color: 'orange', label: 'Inactive' },
    [PLUGIN_STATES.UNLOADING]: { color: 'yellow', label: 'Unloading...' },
    [PLUGIN_STATES.UNLOADED]: { color: 'gray', label: 'Unloaded' },
    [PLUGIN_STATES.ERROR]: { color: 'red', label: 'Error' },
    [PLUGIN_STATES.DISABLED]: { color: 'gray', label: 'Disabled' },
    [PLUGIN_STATES.UPDATING]: { color: 'blue', label: 'Updating...' },
    [PLUGIN_STATES.INCOMPATIBLE]: { color: 'red', label: 'Incompatible' }
  };
  
  return stateInfo[state] || { color: 'gray', label: 'Unknown' };
}

// ================================================
// EXPORTS
// ================================================

export default {
  PLUGIN_TYPES,
  PLUGIN_STATES,
  PLUGIN_PRIORITIES,
  PLUGIN_EVENTS,
  PLUGIN_CAPABILITIES,
  PLUGIN_PERMISSIONS,
  PLUGIN_ERROR_TYPES,
  REQUIRED_MANIFEST_FIELDS,
  OPTIONAL_MANIFEST_FIELDS,
  VERSION_PATTERNS,
  SYSTEM_CONSTANTS,
  isValidPluginType,
  isValidPluginState,
  getPluginTypeDisplayName,
  getPluginStateInfo
};
