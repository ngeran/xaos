// File Path: src/core/websocket/WebSocketService.js
// Version: 2.1.6 (Patched)
// Description: Core WebSocket service for managing connections to Rust backend
// Changes: Fixed timing configuration to match backend settings.
//          Enhanced debugging and pong detection.
//          Added detailed logging for heartbeat operations.
//          FIXED: Implemented Web Workers for reliable heartbeat in background tabs.
//          FIXED: Adjusted ping/pong intervals for better background tab stability.
//
// Key Features:
// - Automatic reconnection with exponential backoff
// - Message queuing while disconnected
// - Connection state management
// - Ping/pong heartbeat mechanism with proper timing
// - Event-based communication
// - Connection rate limiting
// - Enhanced debugging and error reporting
//
// Detail How-To Guide:
// 1. Import and use the singleton instance: import { webSocketService } from './WebSocketService'
// 2. Listen for events: webSocketService.on('connected', handler)
// 3. Send messages: webSocketService.send({type: 'MessageType', data: {...}})
// 4. Subscribe to topics: webSocketService.subscribe(['topic1', 'topic2'])
// 5. Handle disconnections with automatic retry logic
//
// Change Log:
// - 2.1.6 (2024-01-18): Implemented Web Workers for heartbeat, increased timeouts, improved background stability.
// - 2.1.5 (2024-01-17): Fixed timing configuration to match backend, enhanced pong detection.
// - 2.1.4 (2024-01-17): Fixed ping message format and enhanced debugging.
// - 2.1.3 (2024-01-17): Fixed ping message format to match backend expectations.
// - 2.1.2 (2024-01-16): Fixed environment variable handling, connection initiation, and enhanced debugging.
// - 2.1.1 (2024-01-16): Fixed connection timeout handling and improved error reporting.
// - 2.1.0 (2024-01-15): Added connection rate limiting and smarter reconnection logic.

import EventEmitter from 'eventemitter3';
import { logger } from '../utils/logger';

/**
 * WebSocket Service for managing connections to Rust backend
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing while disconnected
 * - Connection state management
 * - Event-based communication
 * - Connection rate limiting to prevent resource exhaustion
 * - Enhanced debugging capabilities with timing fixes
 * - Utilizes Web Workers for reliable heartbeat in background tabs.
 */
export class WebSocketService extends EventEmitter {
  constructor(options = {}) {
    super();

    // Check if backend is enabled with proper fallback
    this.enableBackend = import.meta.env.VITE_ENABLE_BACKEND !== 'false' && 
                         import.meta.env.VITE_ENABLE_BACKEND !== undefined;
    
    // Default configuration for the service
    const defaultOptions = {
      url: import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:3010/ws',
      reconnect: true,
      reconnectAttempts: Infinity,
      reconnectInterval: 1000,
      reconnectDecay: 1.5,
      maxReconnectInterval: 60000,
      
      // More tolerant timing for background tabs based on environment variables
      // Default to 45s ping, 60s pong timeout if not specified
      pingInterval: parseInt(import.meta.env.VITE_WS_PING_INTERVAL) || 45000, // 45 seconds (increased from 30)
      pongTimeout: parseInt(import.meta.env.VITE_WS_PONG_TIMEOUT) || 60000,  // 60 seconds (increased from 35)
      
      minReconnectDelay: 1000,
      connectionTimeout: 10000,
      debug: import.meta.env.VITE_WS_DEBUG === 'true'
    };

    this.options = { ...defaultOptions, ...options };
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.queue = [];
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.pingIntervalId = null; // Renamed to avoid conflict with `pingInterval` option
    this.pongTimeoutId = null;  // Renamed to avoid conflict with `pongTimeout` option
    this.connectionTimeout = null;
    this.lastConnectionAttempt = 0;
    this.heartbeatWorker = null; // New property for the Web Worker

    this._debug('WebSocketService initialized', {
      enableBackend: this.enableBackend,
      url: this.options.url,
      reconnect: this.options.reconnect,
      pingInterval: this.options.pingInterval,
      pongTimeout: this.options.pongTimeout
    });
  }

  // ===============================================
  // DEBUGGING UTILITIES
  // ===============================================

  _debug(message, data = null) {
    if (this.options.debug) {
      logger.debug(`[WebSocketService] ${message}`, data);
    }
  }

  // ===============================================
  // CONNECTION MANAGEMENT
  // ===============================================

  /**
   * Connect to the WebSocket server.
   */
  connect() {
    // Don't attempt to connect if backend is disabled
    if (!this.enableBackend) {
      this._debug('Backend is disabled, skipping connection attempt');
      this.emit('disabled');
      return false;
    }

    if (this.connecting || this.connected) {
      this._debug('Already connecting or connected, skipping new connection attempt');
      return false;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;

    if (timeSinceLastAttempt < this.options.minReconnectDelay) {
      this._debug(`Rate limited. Next attempt in ${this.options.minReconnectDelay - timeSinceLastAttempt}ms`);
      return false;
    }

    this.connecting = true;
    this.emit('connecting');
    this.lastConnectionAttempt = now;
    
    this._debug(`Attempting to connect to WebSocket at ${this.options.url}`);
    
    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.addEventListener('open', this.handleOpen);
      this.ws.addEventListener('message', this.handleMessage);
      this.ws.addEventListener('close', this.handleClose);
      this.ws.addEventListener('error', this.handleError);

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          this._debug('Connection timeout reached');
          this.handleError(new Error('Connection timeout'));
          this.ws?.close(1000, 'Connection Timeout'); // Close cleanly to trigger reconnect
        }
      }, this.options.connectionTimeout);

      return true;
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      this.connecting = false;
      this.emit('error', error);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Handle successful connection event
   */
  handleOpen = () => {
    this._debug('WebSocket connection established');
    clearTimeout(this.connectionTimeout);
    this.connected = true;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.emit('connected');
    
    this.processQueue();
    this.startHeartbeat();
  };

  /**
   * Handle incoming messages with enhanced pong detection
   * FIXED: Added comprehensive pong detection for multiple message formats
   */
  handleMessage = (event) => {
    try {
      if (event.data instanceof Blob) {
        this._debug('Received binary data');
        return;
      }
      
      const message = JSON.parse(event.data);
      this.emit('message', message);
      
      // Enhanced pong detection with multiple format support
      let isPong = false;
      
      // Case 1: Direct Pong message {type: 'Pong'}
      if (message.type === 'Pong') {
        isPong = true;
        this._debug('Direct Pong message received');
      }
      // Case 2: Nested Pong message {payload: {type: 'Pong'}}
      else if (message.payload && message.payload.type === 'Pong') {
        isPong = true;
        this._debug('Nested Pong message received');
      }
      // Case 3: Data Pong message {data: {type: 'Pong'}}
      else if (message.data && message.data.type === 'Pong') {
        isPong = true;
        this._debug('Data Pong message received');
      }
      // Case 4: String message containing "Pong" (less common, but for robustness)
      else if (typeof message === 'string' && message.includes('Pong')) {
        isPong = true;
        this._debug('String Pong message received');
      }
      
      if (isPong) {
        this._debug('PONG RECEIVED - Resetting timeout', {
          message: message,
          timestamp: new Date().toISOString()
        });
        this.emit('pongReceived');
        this.resetPongTimeout();
      } else {
        this._debug('Non-Pong message received', {
          type: message.type,
          timestamp: new Date().toISOString()
        });
      }
      
      this._debug('Received message', message);
    } catch (e) {
      logger.error('Failed to parse message:', e, event.data);
    }
  };

  /**
   * Handle connection closure
   */
  handleClose = (event) => {
    this._debug(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    
    this.connected = false;
    this.connecting = false;
    this.stopHeartbeat();
    clearTimeout(this.connectionTimeout);
    
    this.emit('disconnected', event.code, event.reason);

    // Attempt to reconnect if enabled and not a clean shutdown (1000 is normal closure)
    if (this.options.reconnect && event.code !== 1000) {
      this.scheduleReconnect();
    } else if (event.code === 1000) {
      this._debug('Clean shutdown (code 1000), not reconnecting automatically');
    } else {
      this._debug('Reconnect disabled, not reconnecting');
    }
  };

  /**
   * Handle connection errors
   */
  handleError = (error) => {
    logger.error('WebSocket error:', error);
    this.emit('error', error);
    // Explicitly close if error occurs, to ensure handleClose is called
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
        this.ws.close(1011, 'Error encountered'); // 1011 is an abnormal closure
    }
  };
  
  // ===============================================
  // HEARTBEAT & PING/PONG (ENHANCED WITH DEBUGGING AND WEB WORKERS)
  // ===============================================

  /**
   * Start sending ping messages to keep the connection alive
   * Enhanced: Use Web Workers for reliable timing in background tabs.
   */
  startHeartbeat() {
    this._debug('Starting heartbeat with interval:', this.options.pingInterval);
    
    // Attempt to use Web Workers for reliable timing in background tabs
    // This helps prevent browser throttling from stopping the ping.
    if (typeof Worker !== 'undefined') {
      try {
        // Create a blob URL for the worker script
        // This allows us to define the worker inline without a separate .js file
        const workerScript = `
          self.onmessage = function(e) {
            if (e.data === 'start') {
              setInterval(() => {
                self.postMessage('ping');
              }, ${this.options.pingInterval}); // Worker uses the configured ping interval
            }
          };
        `;
        
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.heartbeatWorker = new Worker(URL.createObjectURL(blob));
        
        this.heartbeatWorker.onmessage = (e) => {
          if (e.data === 'ping') {
            this._debug('Sending ping (heartbeat) from worker');
            this.ping();
            this.startPongTimeout(); // Start pong timeout after sending ping
          }
        };
        
        this.heartbeatWorker.postMessage('start');
        this._debug('Heartbeat worker started');
        return; // Exit, as worker is handling heartbeat
      } catch (error) {
        // Fallback if worker creation fails (e.g., security policies, older browser)
        this._debug('Failed to create heartbeat worker, falling back to setInterval', error);
      }
    }
    
    // Fallback to regular setInterval if Web Workers are not available or failed
    this.pingIntervalId = setInterval(() => {
      this._debug('Sending ping (heartbeat)');
      this.ping();
      this.startPongTimeout(); // Start pong timeout after sending ping
    }, this.options.pingInterval);
    this._debug('Heartbeat started with setInterval (fallback)');
  }

  /**
   * Stop the ping interval
   */
  stopHeartbeat() {
    // Terminate Web Worker if it was used
    if (this.heartbeatWorker) {
      this.heartbeatWorker.terminate();
      this.heartbeatWorker = null;
      this._debug('Heartbeat worker terminated');
    }
    // Clear setInterval if fallback was used
    clearInterval(this.pingIntervalId);
    clearTimeout(this.pongTimeoutId);
    this._debug('Heartbeat stopped');
  }

  /**
   * Send a ping message with exact backend-compatible format
   * FIXED: Use exact message type expected by backend (Ping not ping)
   */
  ping() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const pingMessage = { type: 'Ping' };
      this._debug('Sending ping message:', pingMessage);
      this.ws.send(JSON.stringify(pingMessage));
    }
  }

  /**
   * Start a timer to check for a pong response
   * FIXED: Enhanced debugging for timeout operations
   */
  startPongTimeout() {
    clearTimeout(this.pongTimeoutId);
    this._debug('Starting pong timeout:', this.options.pongTimeout);
    this.pongTimeoutId = setTimeout(() => {
      this._debug('PONG TIMEOUT! Connection may be unstable or lost. Forcing reconnection.');
      this.emit('connectionUnstable');
      // Force a reconnection attempt by closing the connection with a specific code
      // This will trigger the handleClose and scheduleReconnect logic
      this.ws?.close(1011, 'Pong Timeout'); // 1011 is an abnormal closure code
    }, this.options.pongTimeout);
  }
  
  /**
   * Reset the pong timeout on message receipt
   */
  resetPongTimeout() {
    clearTimeout(this.pongTimeoutId);
    this._debug('Pong timeout reset');
    // Restart the timeout for the next pong expectation
    this.startPongTimeout();
  }

  // ===============================================
  // MESSAGING & QUEUE
  // ===============================================

  /**
   * Send a message to the server
   */
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._debug('Sending message', message);
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      this._debug('WebSocket not open, queuing message', message);
      this.queue.push(message);
      // Attempt to connect if not connected, to ensure queued messages are eventually sent
      this.connect(); 
      return false;
    }
  }

  /**
   * Process all messages in the queue
   */
  processQueue() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._debug(`Processing ${this.queue.length} queued messages`);
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        this.send(message); // Re-use send, which will now directly send
      }
    }
  }

  /**
   * Subscribe to one or more topics
   */
  subscribe(topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }
    const message = { type: 'Subscribe', payload: { topics } };
    this.send(message);
    this._debug(`Subscribed to topics`, topics);
  }

  /**
   * Unsubscribe from one or more topics
   */
  unsubscribe(topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }
    const message = { type: 'Unsubscribe', payload: { topics } };
    this.send(message);
    this._debug(`Unsubscribed from topics`, topics);
  }

  // ===============================================
  // RECONNECTION STRATEGY
  // ===============================================

  /**
   * Schedule a reconnection attempt with exponential backoff and jitter
   */
  scheduleReconnect() {
    if (!this.options.reconnect) {
        this._debug('Reconnect is disabled, not scheduling reconnect.');
        return;
    }

    if (this.reconnectAttempts >= this.options.reconnectAttempts) {
      this._debug('Maximum reconnect attempts reached, giving up.');
      this.emit('reconnectFailed');
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;

    // Ensure there's at least minReconnectDelay between actual connection attempts
    const minDelay = Math.max(0, this.options.minReconnectDelay - timeSinceLastAttempt);
    
    // Calculate the base delay with exponential backoff
    let delay = Math.min(
        Math.max(minDelay, this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts)),
        this.options.maxReconnectInterval
    );
    
    // Add jitter to avoid thundering herd problem
    const jitter = Math.random() * this.options.reconnectInterval;
    delay += jitter;
    
    this.reconnectAttempts++;
    this.lastConnectionAttempt = now + delay; // Update last attempt time for next calculation
    
    this._debug(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);
    
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect(); // Attempt connection after the delay
    }, delay);
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect(code = 1000, reason = 'Client initiated disconnection') {
    // Temporarily disable automatic reconnection for this deliberate disconnect
    const originalReconnectOption = this.options.reconnect;
    this.options.reconnect = false;
    
    if (this.ws) {
      this.ws.close(code, reason);
    }
    
    this.cleanup();
    this._debug('WebSocket disconnected by client');

    // Restore original reconnect option for future connections
    this.options.reconnect = originalReconnectOption;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    clearTimeout(this.connectionTimeout);
    clearTimeout(this.reconnectTimeout);
    this.stopHeartbeat(); // This will clear both interval/worker and pong timeout
    
    if (this.ws) {
      // Remove event listeners to prevent memory leaks and unintended behavior
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleError);
      
      // Ensure the socket is closed if it's still open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Cleanup'); // Use 1000 for clean closure
      }
      
      this.ws = null;
    }
    
    this.connected = false;
    this.connecting = false;
    this._debug('WebSocket resources cleaned up');
  }

  // ===============================================
  // STATUS & UTILITIES
  // ===============================================

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.enableBackend) return 'disabled';
    if (this.connected) return 'connected';
    if (this.connecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Check if connection is active
   */
  isConnected() {
    return this.connected && this.enableBackend;
  }

  /**
   * Check if backend is enabled
   */
  isBackendEnabled() {
    return this.enableBackend;
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts() {
    return this.reconnectAttempts;
  }

  /**
   * Reset reconnection attempts counter
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
    this._debug('Reconnect attempts reset');
  }

  /**
   * Get current queue length
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.queue.length,
      enableBackend: this.enableBackend,
      url: this.options.url,
      pingInterval: this.options.pingInterval,
      pongTimeout: this.options.pongTimeout,
      wsReadyState: this.ws?.readyState ?? 'N/A'
    };
  }
}

// Export a singleton instance of the service
export const webSocketService = new WebSocketService();

// Debug utility for development
if (import.meta.env.DEV) {
  window.__webSocketService = webSocketService;
  console.log('WebSocketService available as window.__webSocketService for debugging');
}
