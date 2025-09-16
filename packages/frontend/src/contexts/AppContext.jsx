/**
 * File Path: src/contexts/AppContext.jsx
 * Version: 1.0.0
 * Description: Application context for global state management across components.
 *              Provides shared state, plugin manager access, and application-wide utilities.
 * 
 * How to Use:
 * 1. Wrap your app with AppContextProvider (already done in App.jsx)
 * 2. Use useAppContext hook in any component: const { appState, updateAppState } = useAppContext()
 * 3. Access plugin manager, API client, and other global state
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with comprehensive application context
 */

// src/contexts/AppContext.jsx
import React, { createContext, useContext } from 'react';
import { useWebSocketContext } from "../core/websocket/WebSocketContext";



// ================================================
// APPLICATION CONTEXT DEFINITION
// ================================================
// Extended to include WebSocket functionality for real-time communication
// with the Rust backend. Provides global access to WebSocket status,
// connection management, and message handling throughout the application.

export const AppContext = createContext({
  // Core application properties
  pluginManager: null,
  apiClient: null,
  appState: {},
  updateAppState: () => {},
  isLoading: true,
  error: null,
  plugins: {},
  theme: 'light',
  backendAvailable: false,
  
  // WebSocket integration properties
  webSocket: {
    // Connection status
    status: 'disconnected',
    isConnected: () => false,
    
    // Message handling
    send: () => false,
    subscribe: () => false,
    unsubscribe: () => false,
    onMessageType: () => () => {},
    
    // Connection management
    connect: () => {},
    disconnect: () => {},
    
    // Statistics
    connectionStats: {
      connectedAt: null,
      messageCount: 0,
      duration: null,
      lastActivity: null
    },
    
    // Service instance (for advanced usage)
    service: null
  }
});

// ================================================
// CONTEXT HOOK
// ================================================
// Custom hook to access the application context with proper error handling

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

export default AppContext;
