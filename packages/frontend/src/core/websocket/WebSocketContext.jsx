// src/core/websocket/WebSocketContext.jsx
import React, { createContext, useContext, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { logger } from '../utils/logger';

const WebSocketContext = createContext(null);

/**
 * WebSocket Context Provider
 * Makes WebSocket functionality available throughout the app
 */
export const WebSocketProvider = ({ 
  children, 
  options = {} 
}) => {
  const webSocket = useWebSocket({
    autoConnect: true,
    onConnected: () => {
      logger.info('WebSocket connected globally');
      // Subscribe to default topics if needed
      // webSocket.subscribe(['navigation', 'filesystem']);
    },
    onDisconnected: () => {
      logger.info('WebSocket disconnected globally');
    },
    onError: (error) => {
      logger.error('WebSocket error globally:', error);
    },
    ...options
  });

  // Debug logging
  useEffect(() => {
    logger.debug('WebSocket status changed:', webSocket.status);
  }, [webSocket.status]);

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access WebSocket context
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
};

export default WebSocketContext;
