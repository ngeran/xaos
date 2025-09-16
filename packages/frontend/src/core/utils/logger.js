/**
 * File Path: src/core/utils/logger.js
 * Version: 1.0.0
 * Description: Comprehensive logging utility for the plugin system. Provides structured
 *              logging with different levels, contextual information, and plugin-specific
 *              loggers. Supports both development and production environments.
 * 
 * How to Use:
 * 1. Import logger: import { logger } from '../utils/logger'
 * 2. Basic logging: logger.info('message'), logger.error('error', data)
 * 3. Plugin logger: const pluginLogger = logger.createChild({ plugin: 'myPlugin' })
 * 4. Configure levels: logger.setLevel('debug') for development
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with hierarchical logging and plugin support
 */

// ================================================
// LOG LEVELS AND CONSTANTS
// ================================================

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
  4: 'TRACE'
};

const LOG_COLORS = {
  ERROR: '\x1b[31m',   // Red
  WARN: '\x1b[33m',    // Yellow
  INFO: '\x1b[36m',    // Cyan
  DEBUG: '\x1b[32m',   // Green
  TRACE: '\x1b[35m',   // Magenta
  RESET: '\x1b[0m'     // Reset
};

// ================================================
// LOGGER CLASS
// ================================================

class Logger {
  constructor(context = {}, level = null) {
    this.context = { ...context };
    this.level = level !== null ? level : this._getDefaultLevel();
    this.children = new Map();
    this.logHistory = [];
    this.maxHistorySize = 1000;
    this.enableConsole = true;
    this.enableHistory = true;
    this.enableColors = process.env.NODE_ENV === 'development';
    
    // Bind methods to maintain context
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
  }

  // ================================================
  // CONFIGURATION
  // ================================================

  /**
   * Set logging level
   * @param {string|number} level - Log level name or number
   */
  setLevel(level) {
    if (typeof level === 'string') {
      const levelName = level.toUpperCase();
      this.level = LOG_LEVELS[levelName] !== undefined ? LOG_LEVELS[levelName] : LOG_LEVELS.INFO;
    } else if (typeof level === 'number') {
      this.level = Math.max(0, Math.min(4, level));
    }
    
    // Update all children
    for (const child of this.children.values()) {
      child.setLevel(this.level);
    }
  }

  /**
   * Enable or disable console output
   * @param {boolean} enabled - Whether to enable console output
   */
  setConsoleOutput(enabled) {
    this.enableConsole = enabled;
    
    // Update all children
    for (const child of this.children.values()) {
      child.setConsoleOutput(enabled);
    }
  }

  /**
   * Enable or disable log history
   * @param {boolean} enabled - Whether to enable log history
   */
  setHistoryEnabled(enabled) {
    this.enableHistory = enabled;
    
    if (!enabled) {
      this.clearHistory();
    }
    
    // Update all children
    for (const child of this.children.values()) {
      child.setHistoryEnabled(enabled);
    }
  }

  /**
   * Get default log level based on environment
   * @returns {number} Default log level
   */
  _getDefaultLevel() {
    if (process.env.NODE_ENV === 'development') {
      return LOG_LEVELS.DEBUG;
    } else if (process.env.NODE_ENV === 'test') {
      return LOG_LEVELS.WARN;
    }
    return LOG_LEVELS.INFO;
  }

  // ================================================
  // CHILD LOGGERS
  // ================================================

  /**
   * Create a child logger with additional context
   * @param {Object} additionalContext - Additional context to merge
   * @returns {Logger} Child logger instance
   */
  createChild(additionalContext = {}) {
    const childContext = { ...this.context, ...additionalContext };
    const contextKey = JSON.stringify(childContext);
    
    // Reuse existing child if same context
    if (this.children.has(contextKey)) {
      return this.children.get(contextKey);
    }
    
    const child = new Logger(childContext, this.level);
    child.enableConsole = this.enableConsole;
    child.enableHistory = this.enableHistory;
    child.enableColors = this.enableColors;
    child.maxHistorySize = this.maxHistorySize;
    
    this.children.set(contextKey, child);
    return child;
  }

  /**
   * Remove a child logger
   * @param {Object} context - Context of child to remove
   */
  removeChild(context) {
    const contextKey = JSON.stringify({ ...this.context, ...context });
    this.children.delete(contextKey);
  }

  // ================================================
  // LOGGING METHODS
  // ================================================

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, message, ...args);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, message, ...args);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, message, ...args);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, message, ...args);
  }

  /**
   * Log trace message
   * @param {string} message - Trace message
   * @param {...any} args - Additional arguments
   */
  trace(message, ...args) {
    this._log(LOG_LEVELS.TRACE, message, ...args);
  }

  // ================================================
  // CORE LOGGING LOGIC
  // ================================================

  /**
   * Core logging method
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    // Check if level is enabled
    if (level > this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    // Create log entry
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      context: this.context,
      args: args.length > 0 ? args : undefined,
      stack: level === LOG_LEVELS.ERROR ? this._getStackTrace() : undefined
    };

    // Add to history
    if (this.enableHistory) {
      this.logHistory.push(logEntry);
      
      // Maintain history size limit
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.splice(0, this.logHistory.length - this.maxHistorySize);
      }
    }

    // Console output
    if (this.enableConsole) {
      this._writeToConsole(logEntry);
    }

    // Propagate to parent logger if this is a child
    if (this.parent) {
      this.parent._log(level, message, ...args);
    }
  }

  /**
   * Write log entry to console
   * @param {Object} logEntry - Log entry to write
   */
  _writeToConsole(logEntry) {
    const { timestamp, level, message, context, args } = logEntry;
    
    // Format timestamp
    const timeStr = new Date(timestamp).toLocaleTimeString();
    
    // Format context
    const contextStr = Object.keys(context).length > 0 
      ? `[${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(',')}]`
      : '';
    
    // Color formatting
    const color = this.enableColors ? LOG_COLORS[level] || '' : '';
    const reset = this.enableColors ? LOG_COLORS.RESET : '';
    
    // Build log line
    const logLine = `${color}${timeStr} ${level}${reset} ${contextStr} ${message}`;
    
    // Choose console method based on level
    const consoleMethods = {
      ERROR: console.error,
      WARN: console.warn,
      INFO: console.info,
      DEBUG: console.log,
      TRACE: console.log
    };
    
    const consoleMethod = consoleMethods[level] || console.log;
    
    // Output to console
    if (args && args.length > 0) {
      consoleMethod(logLine, ...args);
    } else {
      consoleMethod(logLine);
    }
  }

  /**
   * Get stack trace for error logging
   * @returns {string|null} Stack trace string
   */
  _getStackTrace() {
    try {
      throw new Error();
    } catch (error) {
      return error.stack
        ?.split('\n')
        .slice(3) // Remove logger internal calls
        .join('\n') || null;
    }
  }

  // ================================================
  // QUERY AND HISTORY METHODS
  // ================================================

  /**
   * Get log history
   * @param {Object} options - Query options
   * @returns {Array} Array of log entries
   */
  getHistory(options = {}) {
    let history = [...this.logHistory];
    
    // Filter by level
    if (options.level) {
      const targetLevel = typeof options.level === 'string' 
        ? LOG_LEVELS[options.level.toUpperCase()]
        : options.level;
      
      history = history.filter(entry => LOG_LEVELS[entry.level] <= targetLevel);
    }
    
    // Filter by time range
    if (options.since) {
      const sinceTime = new Date(options.since);
      history = history.filter(entry => new Date(entry.timestamp) >= sinceTime);
    }
    
    if (options.until) {
      const untilTime = new Date(options.until);
      history = history.filter(entry => new Date(entry.timestamp) <= untilTime);
    }
    
    // Filter by context
    if (options.context) {
      history = history.filter(entry => {
        return Object.entries(options.context).every(([key, value]) => 
          entry.context[key] === value
        );
      });
    }
    
    // Filter by message pattern
    if (options.messagePattern) {
      const pattern = new RegExp(options.messagePattern, 'i');
      history = history.filter(entry => pattern.test(entry.message));
    }
    
    // Limit results
    if (options.limit && options.limit > 0) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory.length = 0;
  }

  /**
   * Get log statistics
   * @returns {Object} Log statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.logHistory.length,
      byLevel: {},
      timeRange: null,
      contextKeys: new Set(),
      childLoggers: this.children.size
    };
    
    // Count by level
    Object.keys(LOG_LEVELS).forEach(level => {
      stats.byLevel[level] = 0;
    });
    
    // Process history
    if (this.logHistory.length > 0) {
      let earliestTime = new Date(this.logHistory[0].timestamp);
      let latestTime = new Date(this.logHistory[0].timestamp);
      
      this.logHistory.forEach(entry => {
        // Count by level
        stats.byLevel[entry.level]++;
        
        // Track time range
        const entryTime = new Date(entry.timestamp);
        if (entryTime < earliestTime) earliestTime = entryTime;
        if (entryTime > latestTime) latestTime = entryTime;
        
        // Collect context keys
        Object.keys(entry.context).forEach(key => stats.contextKeys.add(key));
      });
      
      stats.timeRange = {
        earliest: earliestTime.toISOString(),
        latest: latestTime.toISOString(),
        duration: latestTime - earliestTime
      };
    }
    
    stats.contextKeys = Array.from(stats.contextKeys);
    
    return stats;
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  /**
   * Create a performance timer
   * @param {string} name - Timer name
   * @returns {Function} Function to end timer
   */
  timer(name) {
    const startTime = Date.now();
    this.debug(`Timer started: ${name}`);
    
    return (result) => {
      const duration = Date.now() - startTime;
      this.debug(`Timer completed: ${name} (${duration}ms)`, { result, duration });
      return { name, duration, result };
    };
  }

  /**
   * Log function entry and exit (for debugging)
   * @param {string} functionName - Function name
   * @param {Array} args - Function arguments
   * @returns {Function} Function to log exit
   */
  logFunction(functionName, args = []) {
    this.trace(`Entering function: ${functionName}`, { args });
    
    return (result, error) => {
      if (error) {
        this.trace(`Exiting function: ${functionName} with error`, { error: error.message });
      } else {
        this.trace(`Exiting function: ${functionName}`, { result });
      }
    };
  }

  /**
   * Log async operation
   * @param {string} operationName - Operation name
   * @param {Promise} promise - Promise to track
   * @returns {Promise} Original promise
   */
  async logAsync(operationName, promise) {
    this.debug(`Starting async operation: ${operationName}`);
    const startTime = Date.now();
    
    try {
      const result = await promise;
      const duration = Date.now() - startTime;
      this.debug(`Async operation completed: ${operationName} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Async operation failed: ${operationName} (${duration}ms)`, error);
      throw error;
    }
  }

  // ================================================
  // FORMATTING HELPERS
  // ================================================

  /**
   * Format object for logging
   * @param {*} obj - Object to format
   * @param {number} depth - Maximum depth
   * @returns {string} Formatted string
   */
  formatObject(obj, depth = 3) {
    try {
      return JSON.stringify(obj, this._jsonReplacer, 2);
    } catch (error) {
      return `[Object: ${error.message}]`;
    }
  }

  /**
   * JSON replacer function to handle circular references
   * @param {string} key - Object key
   * @param {*} value - Object value
   * @returns {*} Replaced value
   */
  _jsonReplacer(key, value) {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (this.seen && this.seen.has(value)) {
        return '[Circular Reference]';
      }
      if (!this.seen) this.seen = new Set();
      this.seen.add(value);
    }
    
    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name}]`;
    }
    
    // Handle undefined
    if (value === undefined) {
      return '[undefined]';
    }
    
    return value;
  }

  // ================================================
  // EXPORT AND IMPORT
  // ================================================

  /**
   * Export log history
   * @param {Object} options - Export options
   * @returns {Object} Exportable log data
   */
  exportLogs(options = {}) {
    const history = this.getHistory(options);
    
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      context: this.context,
      stats: this.getStats(),
      logs: history,
      options
    };
  }

  /**
   * Import log history
   * @param {Object} logData - Log data to import
   * @param {Object} options - Import options
   */
  importLogs(logData, options = {}) {
    if (!logData.logs || !Array.isArray(logData.logs)) {
      throw new Error('Invalid log data format');
    }
    
    if (options.clearExisting) {
      this.clearHistory();
    }
    
    // Import logs
    logData.logs.forEach(logEntry => {
      if (this.enableHistory) {
        this.logHistory.push(logEntry);
      }
    });
    
    // Maintain history size limit
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.splice(0, this.logHistory.length - this.maxHistorySize);
    }
    
    this.info(`Imported ${logData.logs.length} log entries`);
  }

  // ================================================
  // CLEANUP
  // ================================================

  /**
   * Clean up logger resources
   */
  cleanup() {
    // Clear history
    this.clearHistory();
    
    // Clean up all children
    for (const child of this.children.values()) {
      child.cleanup();
    }
    this.children.clear();
    
    this.info('Logger cleanup completed');
  }
}

// ================================================
// GLOBAL LOGGER INSTANCE
// ================================================

// Create default logger instance
const logger = new Logger({ component: 'system' });

// Development environment setup
if (process.env.NODE_ENV === 'development') {
  logger.setLevel('debug');
  
  // Add global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logger.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', event.reason);
    });
  }
}

// ================================================
// CONVENIENCE FUNCTIONS
// ================================================

/**
 * Create a logger for a specific component
 * @param {string} component - Component name
 * @param {Object} additionalContext - Additional context
 * @returns {Logger} Component logger
 */
export function createLogger(component, additionalContext = {}) {
  return logger.createChild({ component, ...additionalContext });
}

/**
 * Create a plugin-specific logger
 * @param {string} pluginId - Plugin identifier
 * @param {Object} additionalContext - Additional context
 * @returns {Logger} Plugin logger
 */
export function createPluginLogger(pluginId, additionalContext = {}) {
  return logger.createChild({ plugin: pluginId, ...additionalContext });
}

/**
 * Set global log level
 * @param {string|number} level - Log level
 */
export function setGlobalLogLevel(level) {
  logger.setLevel(level);
}

/**
 * Get global logger stats
 * @returns {Object} Logger statistics
 */
export function getLoggerStats() {
  return logger.getStats();
}

// ================================================
// EXPORTS
// ================================================

export { 
  Logger,
  LOG_LEVELS,
  LOG_LEVEL_NAMES,
  logger
};

export default logger;
