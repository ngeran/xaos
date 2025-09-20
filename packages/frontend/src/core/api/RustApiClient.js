/**
 * File Path: src/core/api/RustApiClient.js
 * Version: 1.0.0
 * Description: Comprehensive API client for communicating with the Rust backend.
 *              Handles authentication, request/response processing, error handling,
 *              retry logic, and plugin-specific API extensions.
 * 
 * How to Use:
 * 1. Create instance: const client = new RustApiClient(config)
 * 2. Initialize: await client.initialize()
 * 3. Make requests: await client.get('/api/endpoint')
 * 4. Plugin integration: client.registerPluginEndpoints(pluginId, endpoints)
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with full REST API support and plugin integration
 */

import { logger } from '../utils/logger.js';

// ================================================
// API CLIENT CLASS
// ================================================

class RustApiClient {
    constructor(options = {}) {
    // Use the environment variable if available, otherwise fall back to options or default
    this.baseUrl = options.baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.headers = options.headers || {};
    
    // Authentication
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // Plugin endpoints
    this.pluginEndpoints = new Map();
    
    // Request/Response interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Connection state
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.connectionRetries = 0;
    this.maxConnectionRetries = 5;
    
    // Request queue for offline support
    this.requestQueue = [];
    this.queueEnabled = options.enableOfflineQueue ?? true;
    
    // Performance monitoring
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
    
    // Logger
    this.logger = logger.createChild({ component: 'RustApiClient' });
    
    // Setup online/offline listeners
    this.setupNetworkListeners();
    
    this.logger.info('RustApiClient created', { baseUrl: this.baseUrl });
  }

  // ================================================
  // INITIALIZATION
  // ================================================

  async initialize() {
    try {
      this.logger.info('Initializing API client...');
      
      // Test connection to backend
      await this.testConnection();
      
      // Load stored authentication
      this.loadStoredAuth();
      
      // Validate authentication if available
      if (this.authToken) {
        await this.validateAuth();
      }
      
      // Setup heartbeat
      this.setupHeartbeat();
      
      this.isInitialized = true;
      this.logger.info('API client initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize API client:', error);
      throw error;
    }
  }

  async testConnection() {
    const startTime = Date.now();
    
    try {
      // Change from '/api/health' to '/health'
      const response = await this.rawRequest('GET', '/health', null, {
        timeout: 5000,
        skipAuth: true,
        skipRetry: true
      });
      
      const responseTime = Date.now() - startTime;
      this.logger.info(`Backend connection successful (${responseTime}ms)`);
      
      return response;
    } catch (error) {
      this.logger.error('Backend connection failed:', error);
      throw new Error(`Cannot connect to backend at ${this.baseUrl}: ${error.message}`);
    }
  }
  // ================================================
  // AUTHENTICATION
  // ================================================

  async authenticate(credentials) {
    try {
      this.logger.info('Authenticating user...');
      
      const response = await this.rawRequest('POST', '/api/auth/login', credentials, {
        skipAuth: true
      });
      
      this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
      this.logger.info('Authentication successful');
      
      return response.data;
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      throw error;
    }
  }

  async refreshAuthentication() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      this.logger.debug('Refreshing authentication...');
      
      const response = await this.rawRequest('POST', '/api/auth/refresh', {
        refreshToken: this.refreshToken
      }, { skipAuth: true });
      
      this.setAuthTokens(response.data.accessToken, response.data.refreshToken);
      this.logger.debug('Authentication refreshed successfully');
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh authentication:', error);
      this.clearAuth();
      throw error;
    }
  }

  async validateAuth() {
    if (!this.authToken) return false;
    
    try {
      await this.get('/api/auth/validate');
      return true;
    } catch (error) {
      this.logger.warn('Auth validation failed:', error);
      this.clearAuth();
      return false;
    }
  }

  setAuthTokens(accessToken, refreshToken) {
    this.authToken = accessToken;
    this.refreshToken = refreshToken;
    
    // Decode token to get expiry (basic JWT parsing)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      this.tokenExpiry = payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      this.logger.warn('Failed to parse token expiry:', error);
    }
    
    // Store in memory (in real app, would use secure storage)
    // localStorage.setItem('authToken', accessToken);
    // localStorage.setItem('refreshToken', refreshToken);
  }

  loadStoredAuth() {
    // In real app: this.authToken = localStorage.getItem('authToken');
    // In real app: this.refreshToken = localStorage.getItem('refreshToken');
    // For artifacts, we'll skip persistent storage
  }

  clearAuth() {
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // In real app: localStorage.removeItem('authToken');
    // In real app: localStorage.removeItem('refreshToken');
  }

  async logout() {
    try {
      if (this.authToken) {
        await this.post('/api/auth/logout');
      }
    } catch (error) {
      this.logger.warn('Logout request failed:', error);
    } finally {
      this.clearAuth();
      this.logger.info('User logged out');
    }
  }

  // ================================================
  // HTTP METHODS
  // ================================================

  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  async post(url, data = null, options = {}) {
    return this.request('POST', url, data, options);
  }

  async put(url, data = null, options = {}) {
    return this.request('PUT', url, data, options);
  }

  async patch(url, data = null, options = {}) {
    return this.request('PATCH', url, data, options);
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  // ================================================
  // REQUEST PROCESSING
  // ================================================

  async request(method, url, data = null, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check if we need to refresh auth
      if (this.authToken && this.tokenExpiry && Date.now() > this.tokenExpiry - 60000) {
        await this.refreshAuthentication();
      }
      
      const response = await this.rawRequest(method, url, data, options);
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      return response;
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      
      // Handle authentication errors
      if (error.status === 401 && !options.skipAuth) {
        try {
          await this.refreshAuthentication();
          return this.rawRequest(method, url, data, { ...options, skipRetry: true });
        } catch (refreshError) {
          this.logger.error('Auth refresh failed, clearing tokens');
          this.clearAuth();
          throw error;
        }
      }
      
      throw error;
    }
  }

  async rawRequest(method, url, data = null, options = {}) {
    const requestConfig = this.buildRequestConfig(method, url, data, options);
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      await interceptor(requestConfig);
    }
    
    // Add to queue if offline and queueing is enabled
    if (!this.isOnline && this.queueEnabled && !options.skipQueue) {
      return this.queueRequest(requestConfig);
    }
    
    let lastError;
    let attempt = 0;
    const maxAttempts = options.skipRetry ? 1 : this.retries + 1;
    
    while (attempt < maxAttempts) {
      try {
        const response = await this.executeRequest(requestConfig);
        
        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          await interceptor(response);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Don't retry certain errors
        if (error.status && (error.status < 500 || error.status === 501)) {
          break;
        }
        
        if (attempt < maxAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.debug(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
          await this.sleep(delay);
        }
      }
    }
    
    this.logger.error(`Request failed after ${attempt} attempts:`, lastError);
    throw lastError;
  }

  buildRequestConfig(method, url, data, options) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.headers,
      ...options.headers
    };
    
    // Add authentication header
    if (this.authToken && !options.skipAuth) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }
    
    // Add plugin header if specified
    if (options.pluginId) {
      headers['X-Plugin-ID'] = options.pluginId;
    }
    
    return {
      method: method.toUpperCase(),
      url: fullUrl,
      data,
      headers,
      timeout: options.timeout || this.timeout,
      signal: options.signal
    };
  }

  async executeRequest(config) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    try {
      const fetchOptions = {
        method: config.method,
        headers: config.headers,
        signal: config.signal || controller.signal
      };
      
      if (config.data && config.method !== 'GET') {
        fetchOptions.body = JSON.stringify(config.data);
      }
      
      const response = await fetch(config.url, fetchOptions);
      
      clearTimeout(timeoutId);
      
      // Parse response
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      if (!response.ok) {
        throw this.createApiError(response, responseData);
      }
      
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createApiError({ status: 408, statusText: 'Request Timeout' }, 'Request timed out');
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createApiError({ status: 0, statusText: 'Network Error' }, 'Network connection failed');
      }
      
      throw error;
    }
  }

  createApiError(response, data) {
    const error = new Error(data?.message || data || response.statusText || 'Request failed');
    error.status = response.status;
    error.statusText = response.statusText;
    error.response = { data, status: response.status, statusText: response.statusText };
    return error;
  }

  // ================================================
  // PLUGIN INTEGRATION
  // ================================================

  registerPluginEndpoints(pluginId, endpoints) {
    this.pluginEndpoints.set(pluginId, endpoints);
    this.logger.info(`Registered ${Object.keys(endpoints).length} endpoints for plugin: ${pluginId}`);
    
    // Create plugin-specific API methods
    const pluginApi = {};
    
    for (const [name, endpoint] of Object.entries(endpoints)) {
      pluginApi[name] = async (data, options = {}) => {
        return this.request(
          endpoint.method || 'GET',
          endpoint.path,
          data,
          { ...options, pluginId }
        );
      };
    }
    
    return pluginApi;
  }

  unregisterPluginEndpoints(pluginId) {
    const existed = this.pluginEndpoints.has(pluginId);
    this.pluginEndpoints.delete(pluginId);
    
    if (existed) {
      this.logger.info(`Unregistered endpoints for plugin: ${pluginId}`);
    }
    
    return existed;
  }

  // ================================================
  // INTERCEPTORS
  // ================================================

  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  // ================================================
  // OFFLINE SUPPORT
  // ================================================

  queueRequest(requestConfig) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config: requestConfig,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.logger.debug('Request queued for offline execution');
    });
  }

  async processOfflineQueue() {
    if (this.requestQueue.length === 0) return;
    
    this.logger.info(`Processing ${this.requestQueue.length} queued requests`);
    
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const queuedRequest of queue) {
      try {
        const response = await this.executeRequest(queuedRequest.config);
        queuedRequest.resolve(response);
      } catch (error) {
        queuedRequest.reject(error);
      }
    }
  }

  setupNetworkListeners() {
    const handleOnline = () => {
      this.isOnline = true;
      this.logger.info('Network connection restored');
      this.processOfflineQueue();
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      this.logger.warn('Network connection lost');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // ================================================
  // MONITORING AND METRICS
  // ================================================

  updateMetrics(success, responseTime) {
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = Date.now();
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update average response time
    const successCount = this.metrics.successfulRequests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (successCount - 1)) + responseTime) / successCount;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0,
      isOnline: this.isOnline,
      queuedRequests: this.requestQueue.length,
      isAuthenticated: !!this.authToken
    };
  }
  
  setupHeartbeat() {
    setInterval(async () => {
      if (this.isOnline && this.isInitialized) {
        try {
          // Change from '/api/health' to '/health'
          await this.get('/health', { timeout: 5000 });
          this.connectionRetries = 0;
        } catch (error) {
          this.connectionRetries++;
          
          if (this.connectionRetries >= this.maxConnectionRetries) {
            this.logger.error('Lost connection to backend');
            // Could emit event here for UI to show connection status
          }
        }
      }
    }, 30000); // 30 seconds
  }
  
  // ================================================
  // UTILITY METHODS
  // ================================================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ================================================
  // CLEANUP
  // ================================================

  async cleanup() {
    this.logger.info('Cleaning up API client...');
    
    // Clear queued requests
    this.requestQueue.forEach(req => {
      req.reject(new Error('API client shutting down'));
    });
    this.requestQueue = [];
    
    // Clear plugin endpoints
    this.pluginEndpoints.clear();
    
    // Clear interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Logout if authenticated
    if (this.authToken) {
      try {
        await this.logout();
      } catch (error) {
        this.logger.warn('Error during logout:', error);
      }
    }
    
    this.isInitialized = false;
    this.logger.info('API client cleanup completed');
  }
}

// ================================================
// EXPORTS
// ================================================

export { RustApiClient };
export default RustApiClient;
