/**
 * File Path: src/plugins/AppLayout/components/WebSocketStatus.jsx
 * Version: 2.3.7 (patched for background stability)
 * Description: Modern, sophisticated WebSocket connection status component
 *              with enhanced debugging, compact dropdown for better space utilization,
 *              and improved visual hierarchy.
 *
 * Key Features:
 * - Modern card-based design with glassmorphism effects
 * - REDESIGNED: Dropdown width and height fully driven by grid item content
 * - REDESIGNED: Eliminated scrollbars with strict text wrapping and overflow control
 * - Clean connection metrics display with debugging info
 * - Smooth animations and micro-interactions
 * - Theme-aware styling for Dark, Light, and Yellow themes
 * - Real-time connection duration and status indicators
 * - Fully automatic connection management (no manual controls)
 * - Improved readability and modern typography
 * - Enhanced debugging and connection diagnostics with timing fixes
 * - FIXED: Added visibility change detection to handle browser tab backgrounding.
 *
 * Updates in v2.3.7:
 * - Implemented a `visibilitychange` event listener to detect when the tab becomes active.
 *   If the tab becomes visible and the WebSocket is disconnected or in error state,
 *   it will attempt to reconnect proactively.
 * - All changes from v2.3.6 are maintained.
 * - FIXED: Corrected syntax error in debug section to resolve "Unexpected token" error.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { webSocketService } from '../../../core/websocket/WebSocketService';
import { logger } from '../../../core/utils/logger';
import './WebSocketStatus.css';

// ================================================
// UTILITY FUNCTIONS
// ================================================

const formatDuration = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// ================================================
// WEBSOCKET STATUS COMPONENT
// ================================================

const WebSocketStatus = ({ onMessage, debug = false }) => {
  // State management
  const [status, setStatus] = useState('disconnected');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [connectedIP, setConnectedIP] = useState('N/A');
  const [connectedAt, setConnectedAt] = useState(null);
  const [connectionDuration, setConnectionDuration] = useState('00:00:00');
  const [activeConnections, setActiveConnections] = useState('N/A');
  const [lastActivity, setLastActivity] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [serviceInfo, setServiceInfo] = useState({
    queueLength: 0,
    wsUrl: (import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:3001/ws').replace('ws://', '').replace('wss://', ''),
    reconnectAttempts: 0
  });

  const dropdownRef = useRef(null);
  const enableBackend = import.meta.env.VITE_ENABLE_BACKEND !== 'false' && 
                       import.meta.env.VITE_ENABLE_BACKEND !== undefined;

  // ================================================
  // WEBSOCKET SERVICE EVENT HANDLERS
  // ================================================

  const handleConnecting = useCallback(() => {
    setStatus('connecting');
    logger.debug('WebSocket connecting...');
  }, []);

  const handleConnected = useCallback(() => {
    setStatus('connected');
    setConnectedAt(new Date());
    setLastActivity(new Date());
    logger.info('WebSocket connected successfully');
    
    logger.debug('WebSocket connected - timing details', {
      pingInterval: webSocketService.options.pingInterval,
      pongTimeout: webSocketService.options.pongTimeout,
      timestamp: new Date().toISOString()
    });
    
    // Request connection info after a short delay to ensure backend is ready
    setTimeout(() => {
      logger.debug('Sending connection info requests');
      webSocketService.send({ type: 'REQUEST_CONNECTION_INFO' });
      webSocketService.send({ type: 'REQUEST_ACTIVE_CONNECTIONS' });
    }, 1000);
  }, []);

  const handleDisconnected = useCallback((code, reason) => {
    setStatus('disconnected');
    setConnectedIP('N/A');
    setConnectedAt(null);
    setConnectionDuration('00:00:00');
    setActiveConnections('N/A');
    setLastActivity(null);
    logger.warn(`WebSocket disconnected. Code: ${code}, Reason: ${reason}`);
  }, []);

  const handleError = useCallback((error) => {
    setStatus('error');
    logger.error('WebSocket connection error:', error);
  }, []);

  const handleDisabled = useCallback(() => {
    setStatus('disabled');
    logger.info('WebSocket backend disabled');
  }, []);

  const handleMessage = useCallback((message) => {
    setLastActivity(new Date());
    
    logger.debug('WebSocket message received', {
      type: message.type,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(message).length
    });
    
    if (message.type === 'CONNECTION_INFO') {
      setConnectedIP(message.ip || message.payload?.ip || 'Unknown');
      if (message.connectedAt || message.payload?.connectedAt) {
        setConnectedAt(new Date(message.connectedAt || message.payload.connectedAt));
      }
      logger.debug('Connection info received', message);
    } else if (message.type === 'ACTIVE_CONNECTIONS') {
      const count = message.payload?.count || 'N/A';
      setActiveConnections(count);
      logger.debug('Active connections received', { count });
    } else if (message.type === 'Pong') {
      logger.debug('Pong message received - connection healthy');
    }
    
    if (onMessage && typeof onMessage === 'function') {
      onMessage(message);
    }
  }, [onMessage]);

  const handleReconnectFailed = useCallback(() => {
    setStatus('error');
    logger.error('WebSocket reconnect failed after maximum attempts');
  }, []);

  const handleConnectionUnstable = useCallback(() => {
    logger.warn('WebSocket connection detected as unstable');
  }, []);

  const handlePongReceived = useCallback(() => {
    logger.debug('Pong received - connection healthy');
    setLastActivity(new Date());
  }, []);

  // ================================================
  // LIFECYCLE MANAGEMENT
  // ================================================

  useEffect(() => {
    logger.debug('WebSocketStatus component mounted', {
      enableBackend,
      envUrl: import.meta.env.VITE_WS_URL,
      envEnableBackend: import.meta.env.VITE_ENABLE_BACKEND
    });

    const currentStatus = webSocketService.getStatus();
    setStatus(currentStatus);
    setServiceInfo(prev => ({
      ...prev,
      reconnectAttempts: webSocketService.getReconnectAttempts(),
      queueLength: webSocketService.getQueueLength()
    }));
    
    if (enableBackend) {
      // Register all WebSocketService event listeners
      webSocketService.on('connecting', handleConnecting);
      webSocketService.on('connected', handleConnected);
      webSocketService.on('disconnected', handleDisconnected);
      webSocketService.on('error', handleError);
      webSocketService.on('message', handleMessage);
      webSocketService.on('reconnectFailed', handleReconnectFailed);
      webSocketService.on('disabled', handleDisabled);
      webSocketService.on('connectionUnstable', handleConnectionUnstable);
      webSocketService.on('pongReceived', handlePongReceived);

      // Attempt initial connection if not already connecting/connected
      if (currentStatus === 'disconnected') {
        logger.info('Attempting initial WebSocket connection...');
        const connectionStarted = webSocketService.connect();
        if (!connectionStarted) {
          logger.warn('WebSocket connection could not be started');
        }
      }
    }

    // Cleanup function for event listeners
    return () => {
      if (enableBackend) {
        webSocketService.off('connecting', handleConnecting);
        webSocketService.off('connected', handleConnected);
        webSocketService.off('disconnected', handleDisconnected);
        webSocketService.off('error', handleError);
        webSocketService.off('message', handleMessage);
        webSocketService.off('reconnectFailed', handleReconnectFailed);
        webSocketService.off('disabled', handleDisabled);
        webSocketService.off('connectionUnstable', handleConnectionUnstable);
        webSocketService.off('pongReceived', handlePongReceived);
      }
    };
  }, [enableBackend, handleConnecting, handleConnected, handleDisconnected, handleError, handleMessage, handleReconnectFailed, handleDisabled, handleConnectionUnstable, handlePongReceived]);

  // FIXED: Visibility change detection for background tabs
  // This hook listens for when the browser tab becomes visible again.
  // If the WebSocket was disconnected or in an error state while in the background,
  // it will proactively attempt to reconnect to restore the connection.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.info('Tab became visible. Current WebSocket status:', webSocketService.getStatus());
        // If disconnected or in an error state, try to reconnect
        if (webSocketService.getStatus() === 'disconnected' || webSocketService.getStatus() === 'error') {
          logger.info('Tab became visible, attempting reconnect for WebSocketService');
          webSocketService.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Connection duration updater
  useEffect(() => {
    let intervalId;
    if (status === 'connected' && connectedAt) {
      intervalId = setInterval(() => {
        const now = new Date();
        const durationSeconds = Math.floor((now.getTime() - connectedAt.getTime()) / 1000);
        setConnectionDuration(formatDuration(durationSeconds));
      }, 1000);
    } else {
      setConnectionDuration('00:00:00');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, connectedAt]);

  // Update service info periodically
  useEffect(() => {
    let intervalId;
    if (enableBackend) {
      intervalId = setInterval(() => {
        setServiceInfo(prev => ({
          ...prev,
          reconnectAttempts: webSocketService.getReconnectAttempts(),
          queueLength: webSocketService.getQueueLength()
        }));
      }, 2000); // Update every 2 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [enableBackend]);

  // Debug info collection
  useEffect(() => {
    if (debug) {
      const intervalId = setInterval(() => {
        setDebugInfo({
          readyState: webSocketService.ws?.readyState,
          url: webSocketService.options.url,
          reconnect: webSocketService.options.reconnect,
          enableBackend: webSocketService.enableBackend,
          connected: webSocketService.connected,
          connecting: webSocketService.connecting,
          pingInterval: webSocketService.options.pingInterval,
          pongTimeout: webSocketService.options.pongTimeout,
          timestamp: new Date().toISOString()
        });
      }, 1000); // Update debug info every second

      return () => clearInterval(intervalId);
    }
  }, [debug]);

  // ================================================
  // EVENT HANDLERS
  // ================================================

  const handleButtonClick = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);

  const handleReconnectClick = useCallback(() => {
    // Only allow manual reconnect if currently in an error or disconnected state
    if (status === 'error' || status === 'disconnected') {
      logger.info('Manual reconnect requested');
      webSocketService.connect();
    }
  }, [status]);

  // ================================================
  // RENDER HELPERS
  // ================================================

  const getStatusConfig = () => {
    const configs = {
      disabled: {
        title: 'Backend WebSocket disabled',
        label: 'Disabled',
        statusClass: 'ws-status-disabled',
        indicatorClass: 'disabled',
        icon: '🔴'
      },
      connecting: {
        title: 'Connecting to WebSocket...',
        label: 'Connecting',
        statusClass: 'ws-status-connecting',
        indicatorClass: 'connecting',
        icon: '🟡'
      },
      connected: {
        title: 'Connected to WebSocket',
        label: 'Connected',
        statusClass: 'ws-status-connected',
        indicatorClass: 'connected',
        icon: '🟢'
      },
      disconnected: {
        title: 'WebSocket disconnected',
        label: 'Disconnected',
        statusClass: 'ws-status-disconnected',
        indicatorClass: 'disconnected',
        icon: '🔴'
      },
      error: {
        title: 'WebSocket connection error',
        label: 'Error',
        statusClass: 'ws-status-error',
        indicatorClass: 'error',
        icon: '🔴'
      }
    };

    return configs[status] || configs.disabled;
  };

  const StatusIcon = () => (
    <svg className="ws-icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 16.5a5 5 0 0 1 7 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13a10 10 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 9.5a16 16 0 0 1 21 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Compact metric card component with dynamic width
  const MetricCard = ({ icon, label, value, className = "" }) => (
    <div className="ws-metric-card group">
      <div className="ws-metric-left">
        <div className="ws-metric-icon">
          {icon}
        </div>
        <div className="ws-metric-label">
          {label}
        </div>
      </div>
      <div className={`ws-metric-value ${className}`}>
        {value}
      </div>
    </div>
  );

  const currentConfig = getStatusConfig();

  return (
    <div className="websocket-status-dropdown-container" ref={dropdownRef}>
      <button
        className={`websocket-status-btn ${currentConfig.statusClass}`}
        onClick={handleButtonClick}
        aria-label="WebSocket Status"
        title={currentConfig.title}
        // Disable button if already connecting to prevent multiple connection attempts
        disabled={status === 'connecting'} 
      >
        <StatusIcon />
      </button>

      {/* Dropdown with content-driven sizing */}
      <div className={`websocket-status-dropdown ${isDropdownOpen ? 'open' : ''}`}>
        {/* Compact header */}
        <div className="ws-dropdown-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <StatusIcon />
              <span className="font-semibold">WebSocket Monitor</span>
            </div>
            <div className={`ws-status-indicator ${currentConfig.indicatorClass}`}>
              {currentConfig.icon} {currentConfig.label}
            </div>
          </div>
        </div>

        {/* Connection Metrics */}
        {status !== 'disabled' && (
          <div className="ws-content-wrapper">
            <div className="ws-metrics-section">
              <h3 className="ws-section-title">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Connection
              </h3>
              
              {/* Metrics grid with dynamic width */}
              <div className="ws-metrics-grid">
                <MetricCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6"/>
                      <path d="m21 12-6 0m-6 0-6 0"/>
                    </svg>
                  }
                  label="Server IP"
                  value={connectedIP}
                  className="ip-address"
                />

                <MetricCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  }
                  label="Uptime"
                  value={connectionDuration}
                  className="duration"
                />

                <MetricCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  }
                  label="Clients"
                  value={activeConnections}
                />

                <MetricCard
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12h18l-3-3m0 6l3-3"/>
                    </svg>
                  }
                  label="Reconnects"
                  value={serviceInfo.reconnectAttempts}
                />
              </div>

              {/* Last activity display */}
              {lastActivity && status === 'connected' && (
                <div className="ws-last-activity group">
                  <div className="ws-metric-left">
                    <div className="ws-metric-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <div className="ws-metric-label">Last Activity</div>
                  </div>
                  <div className="ws-metric-value">
                    {lastActivity.toLocaleTimeString('en-US', { hour12: false })}
                  </div>
                </div>
              )}

              {/* Reconnect button */}
              {(status === 'error' || status === 'disconnected') && (
                <div className="mt-1 flex justify-center">
                  <button
                    onClick={handleReconnectClick}
                    className="ws-reconnect-btn"
                  >
                    <svg className="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M8 16H3v5"/>
                    </svg>
                    Reconnect
                  </button>
                </div>
              )}
            </div>

            {/* Service Information Section */}
            {enableBackend && (
              <div className="ws-service-section">
                <h3 className="ws-section-title">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                  Service
                </h3>
                <div className="ws-service-info-grid">
                  <div className="ws-service-info-item">
                    <span className="ws-service-info-label">Status</span>
                    <span className="ws-service-info-value">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </div>
                  <div className="ws-service-info-item">
                    <span className="ws-service-info-label">Queue</span>
                    <span className="ws-service-info-value">{serviceInfo.queueLength} items</span>
                  </div>
                  <div className="ws-service-info-item">
                    <span className="ws-service-info-label">URL</span>
                    <span className="ws-service-info-value ws-url-value">
                      {serviceInfo.wsUrl}
                    </span>
                  </div>
                  {debug && (
                    <>
                      <div className="ws-service-info-item">
                        <span className="ws-service-info-label">Ping</span>
                        <span className="ws-service-info-value">{webSocketService.options.pingInterval}ms</span>
                      </div>
                      <div className="ws-service-info-item">
                        <span className="ws-service-info-label">Timeout</span>
                        <span className="ws-service-info-value">{webSocketService.options.pongTimeout}ms</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Debug Information */}
            {debug && (
              <div className="ws-service-section ws-debug-section">
                <h3 className="ws-section-title">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Debug
                </h3>
                <div className="ws-debug-info">
                  <div className="ws-debug-item">
                    <span>ReadyState</span>
                    <span>{debugInfo.readyState}</span>
                  </div>
                  <div className="ws-debug-item">
                    <span>Connected</span>
                    <span>{debugInfo.connected?.toString()}</span>
                  </div>
                  <div className="ws-debug-item">
                    <span>Connecting</span>
                    <span>{debugInfo.connecting?.toString()}</span>
                  </div>
                  <div className="ws-debug-item">
                    <span>Reconnect</span>
                    <span>{debugInfo.reconnect?.toString()}</span>
                  </div>
                  <div className="ws-debug-item">
                    <span>Backend</span>
                    <span>{debugInfo.enableBackend?.toString()}</span>
                  </div>
                  <div className="ws-debug-item">
                    <span>Updated</span>
                    <span>{debugInfo.timestamp?.split('T')[1]?.split('.')[0]}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!enableBackend && (
          <div className="ws-empty-state">
            <div className="ws-empty-state-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ws-empty-state-content">
              <h3 className="ws-empty-state-title">WebSocket Disabled</h3>
              <p className="ws-empty-state-text">
                Backend WebSocket service is disabled.
              </p>
              <div className="mt-1 px-2 py-0.5 bg-white/5 rounded-lg text-xs text-gray-500 font-mono">
                VITE_ENABLE_BACKEND: {String(import.meta.env.VITE_ENABLE_BACKEND)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketStatus;
