/**
 * File Path: src/App.jsx
 * Version: 1.1.0
 * Description: Main application component that initializes and manages the plugin system.
 *              Handles plugin loading, provides global context, integrates with Rust backend,
 *              and manages application-wide state and error boundaries.
 *              Now includes WebSocket integration for real-time communication and
 *              centralized configuration management.
 *
 * How to Use:
 * 1. This is the root component of your React application
 * 2. Automatically initializes the plugin system on mount
 * 3. Loads core plugins including AppLayout
 * 4. Provides plugin context to the entire application tree
 * 5. Handles global error boundaries and loading states
 * 6. Integrates WebSocket connection to Rust backend
 * 7. Configuration is managed through src/config/index.js
 * 8. Routing is handled within the Content component
 *
 * How to Add a New Page:
 * 1. Create page component in src/pages/ (e.g., src/pages/NewPage.jsx)
 * 2. Import it in src/plugins/AppLayout/components/Content.jsx
 * 3. Add route in Content.jsx: <Route path="/your-path" element={<NewPage />} />
 * 4. Page will be available at http://localhost:5173/your-path
 *
 * Example Pages:
 * - Home: http://localhost:5173/
 * - Backup: http://localhost:5173/operations/backups
 * - Restore: http://localhost:5173/operations/restores
 *
 * Change Log:
 * v1.1.0 (2025-09-14): Added routing documentation and examples
 * v1.0.9 - Integrated centralized configuration management via config module
 * v1.0.8 - Added WebSocket integration for real-time communication with Rust backend
 * v1.0.7 - Extracted main content to separate Content component for better organization
 * v1.0.6 - Restored toggle functionality for sidebar, header, and footer with conditional rendering
 * v1.0.5 - Fixed AppLayoutPlugin import to use index.jsx, reverted toggle functionality
 * v1.0.4 - Fixed JSX syntax error in AppErrorBoundary (typo in button closing tag)
 * v1.0.3 - Added isRestarting state to prevent infinite render loops during plugin cleanup
 * v1.0.2 - Fixed TypeError in AppErrorBoundary by adding null check for errorInfo.componentStack
 * v1.0.1 - Moved AppContext to separate file for better Fast Refresh compatibility
 * v1.0.0 - Initial implementation with complete plugin system integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PluginManager } from './core/plugin-system/PluginManager.js';
import { PluginContextReact as PluginContext } from './core/plugin-system/PluginContext.jsx';
import { RustApiClient } from './core/api/RustApiClient.js';
import { logger } from './core/utils/logger.js';
import { PLUGIN_STATES, PLUGIN_TYPES } from './core/plugin-system/PluginTypes.js';

// Import configuration
import config from './config';

// Import context from separate file
import { AppContext, useAppContext } from './contexts/AppContext.jsx';

// Import WebSocket provider
import { WebSocketProvider } from './core/websocket/WebSocketContext';

// Import core plugins
import { AppLayoutPlugin } from './plugins/AppLayout/index.jsx';

// Import Content component (handles routing internally)
import Content from './plugins/AppLayout/components/Content.jsx';

// Global styles (would be imported from your CSS files)
import './App.css';

// ================================================
// ERROR BOUNDARY COMPONENT             
// ================================================

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error
    logger.error('App Error Boundary caught error:', error, errorInfo);

    // Report to plugin system if available
    if (this.props.pluginManager) {
      this.props.pluginManager.reportError?.(error, 'app-error-boundary');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary">
          <div className="app-error-boundary__content">
            <h1>Something went wrong</h1>
            <p>The application encountered an unexpected error.</p>

            {config.app.isDevelopment && (
              <details className="app-error-boundary__details">
                <summary>Error Details (Development Only)</summary>
                <pre className="app-error-boundary__stack">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo?.componentStack || 'No component stack available'}
                </pre>
              </details>
            )}

            <div className="app-error-boundary__actions">
              <button
                onClick={() => window.location.reload()}
                className="app-error-boundary__reload"
              >
                Reload Application
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="app-error-boundary__retry"
              >                         
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ================================================
// MAIN APPLICATION COMPONENT
// ================================================

function App() {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [pluginManager, setPluginManager] = useState(null);
  const [apiClient, setApiClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initializationStep, setInitializationStep] = useState('Starting...');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false); // Added to prevent render loops during cleanup

  // Application state - initialized with config defaults
  const [appState, setAppState] = useState({
    user: null,
    preferences: {},
    theme: config.ui.defaultTheme,
    layout: {
      sidebarOpen: config.ui.defaultLayout.sidebarOpen,
      sidebarCollapsed: config.ui.defaultLayout.sidebarCollapsed,
      isSidebarEnabled: true, // Controls sidebar rendering
      isHeaderEnabled: config.ui.defaultLayout.headerEnabled,
      isFooterEnabled: config.ui.defaultLayout.footerEnabled
    },
    notifications: [],
    online: navigator.onLine
  });

  // Plugin states
  const [plugins, setPlugins] = useState({});
  const [corePluginsLoaded, setCorePluginsLoaded] = useState(false);

  // ================================================
  // INITIALIZATION
  // ================================================

  const initializeApplication = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);                   

      logger.info('Initializing application...');

      // Step 1: Initialize API Client (optional - only if backend is enabled)
      // Configuration is loaded from centralized config module
      const enableBackend = config.api.enableBackend;

      if (enableBackend) {
        setInitializationStep('Connecting to backend...');
        try {
          const rustApi = new RustApiClient({
            baseUrl: config.api.baseUrl,
            timeout: config.api.timeout,
            retries: config.api.retries
          });

          await rustApi.initialize();
          setApiClient(rustApi);
          setBackendAvailable(true);
          logger.info('API client initialized successfully with URL:', config.api.baseUrl);
        } catch (apiError) {
          logger.warn('Backend connection failed, continuing in offline mode:', apiError);
          setBackendAvailable(false);
        }
      } else {
        logger.info('Backend disabled by configuration');
      }

      // Step 2: Initialize Plugin Manager
      setInitializationStep('Initializing plugin system...');
      const manager = PluginManager.getInstance();
      setPluginManager(manager);

      if (enableBackend && manager && apiClient) {
        manager.setApiClient(apiClient);
      }

      // Step 3: Register and load core plugins (only if plugins are enabled)
      if (config.features.enablePlugins) {
        setInitializationStep('Loading core plugins...');
        await manager.registerPlugin(
          AppLayoutPlugin.manifest,
          AppLayoutPlugin.factory
        );

        const appLayoutInstance = await manager.loadPlugin('app-layout', {
          appState,
          backendAvailable,
          config: config.ui // Pass UI config to layout plugin
        });

        // Update plugins state
        setPlugins({
          'app-layout': {
            id: 'app-layout',
            instance: appLayoutInstance,
            loadedAt: new Date().toISOString(),
            state: PLUGIN_STATES.LOADED,
            type: PLUGIN_TYPES.LAYOUT,
            backendAvailable
          }
        });

        setCorePluginsLoaded(true);
      } else {
        logger.info('Plugin system disabled by configuration');
        setCorePluginsLoaded(true); // Still set to true to allow app to render
      }

      setIsLoading(false);

      logger.info('Application initialization completed');

    } catch (error) {
      logger.error('Application initialization failed:', error);
      setError({
        message: 'Failed to initialize application',
        details: error.message,
        error
      });
      setIsLoading(false);
    }
  }, []);

  // Initial mount
  useEffect(() => {
    initializeApplication();

    // Handle online/offline status
    const handleOnline = () => setAppState(prev => ({ ...prev, online: true }));
    const handleOffline = () => setAppState(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initializeApplication]);

  // Plugin event handling
  useEffect(() => {
    if (!pluginManager || !config.features.enablePlugins) return;

    const handlePluginLoaded = (event) => {
      if (isRestarting) return; // Skip updates during restart to prevent render loops
      setPlugins(prev => ({
        ...prev,
        [event.pluginId]: {
          id: event.pluginId,
          instance: event.instance,
          loadedAt: new Date().toISOString(),
          state: 'loaded',              
          type: event.manifest?.type,
          backendAvailable
        }
      }));
    };

    const handlePluginUnloaded = (event) => {
      if (isRestarting) return; // Skip updates during restart to prevent render loops
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
  }, [pluginManager, backendAvailable, isRestarting]);

  // ================================================
  // STATE UPDATES
  // ================================================

  const updateAppState = useCallback((updates) => {
    setAppState(prev => ({
      ...prev,
      ...typeof updates === 'function' ? updates(prev) : updates
    }));
  }, []);

  // ================================================
  // CONTEXT VALUE
  // ================================================

  const contextValue = {
    pluginManager,
    apiClient,
    appState,
    updateAppState,
    isLoading,
    error,
    plugins,
    theme: appState.theme,
    backendAvailable,
    config // Include config in context for child components
  };

  // ================================================
  // RENDER HELPERS
  // ================================================

  const renderLoadingScreen = () => (   
    <div className="app-loading">
      <div className="app-loading__content">
        <div className="app-loading__spinner" />
        <p>Loading: {initializationStep}</p>
      </div>
    </div>
  );

  const renderErrorScreen = () => (
    <div className="app-error">
      <div className="app-error__content">
        <h1>Application Error</h1>
        <p>{error.message}</p>

        {config.app.isDevelopment && error.details && (
          <details className="app-error__details">
            <summary>Technical Details</summary>
            <pre className="app-error__stack">{error.details}</pre>
            <pre className="app-error__full">{JSON.stringify(error, null, 2)}</pre>
          </details>
        )}

        <div className="app-error__actions">
          <button
            onClick={initializeApplication}
            className="app-error__retry"
          >
            Retry Initialization
          </button>

          <button
            onClick={() => window.location.reload()}
            className="app-error__reload"
          >
            Reload Page
          </button>

          {/* Option to continue without backend */}
          {error.details?.includes('backend') && (
            <button
              onClick={() => {
                // Force offline mode and retry
                setBackendAvailable(false);
                setError(null);
                initializeApplication();
              }}
              className="app-error__offline"
            >
              Continue Without Backend
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderApplication = () => {     
    // Check if plugins are enabled
    if (!config.features.enablePlugins) {
      return (
        <div className="app-no-plugins">
          <h1>Plugin System Disabled</h1>
          <p>The application is running without the plugin system.</p>
          {/* You could render a basic UI here */}
        </div>
      );
    }

    const AppLayoutComponent = plugins['app-layout']?.instance?.component;

    if (!AppLayoutComponent) {
      return (
        <div className="app-fallback">
          <h1>Application Layout Not Available</h1>
          <p>The core layout plugin failed to load.</p>
        </div>
      );
    }

    return (
      <AppLayoutComponent
        config={appState.preferences?.layout || {}}
        context={{
          pluginManager,
          apiClient,
          appState,
          updateAppState,
          plugins,
          backendAvailable
        }}
      >
        {/* 
          Content component handles all routing internally
          See: src/plugins/AppLayout/components/Content.jsx
          Add new routes there following the pattern:
          <Route path="/your-path" element={<YourComponent />} />
        */}
        <Content
          plugins={plugins}
          backendAvailable={backendAvailable}
          appState={appState}
          onToggleBackend={() => {
            setBackendAvailable(!backendAvailable);
            console.log('Backend available:', !backendAvailable);
          }}
          onRestartPlugins={() => {
            setIsRestarting(true);
            setIsLoading(true);
            setPlugins({});
            pluginManager?.cleanup()
              .then(() => initializeApplication())
              .catch(err => setError(err))
              .finally(() => {
                setIsRestarting(false);
                setIsLoading(false);
              });
          }}
          onLogState={(type) => {
            if (type === 'appState') {
              console.log('App State:', appState);
            } else if (type === 'plugins') {
              console.log('Plugins:', plugins);
            }
          }}
        />
      </AppLayoutComponent>
    );
  };

  // ================================================
  // MAIN RENDER
  // ================================================

  // Conditionally wrap with WebSocketProvider based on config
  const appContent = (
    <AppContext.Provider value={contextValue}>
      <div
        className="app"
        data-theme={appState.theme}
        data-online={appState.online}
        data-loading={isLoading}
        data-backend={backendAvailable ? 'connected' : 'offline'}
      >
        {isLoading && renderLoadingScreen()}
        {error && !isLoading && renderErrorScreen()}
        {!isLoading && !error && corePluginsLoaded && renderApplication()}

        {/* Offline indicator */}
        {!appState.online && (
          <div className="app-offline-indicator">
            <span>You are offline</span>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );

  return (
    <AppErrorBoundary pluginManager={pluginManager}>
      {config.features.enableWebSocket ? (
        <WebSocketProvider>
          {appContent}
        </WebSocketProvider>
      ) : (
        appContent
      )}
    </AppErrorBoundary>
  );
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

// Simple debounce utility
function debounce(func, wait) {
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

// ================================================
// EXPORTS
// ================================================

export default App;
