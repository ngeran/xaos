// src/core/websocket/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { webSocketService } from './WebSocketService';
import { logger } from '../utils/logger';

/**
 * React hook for WebSocket integration
 * Provides connection status, message handling, and easy sending
 */
export const useWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    onMessage,
    onConnected,
    onDisconnected,
    onError,
    onConnecting
  } = options;

  const [status, setStatus] = useState(webSocketService.getStatus());
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStats, setConnectionStats] = useState({
    connectedAt: null,
    messageCount: 0,
    ping: null
  });

  const messageHandlers = useRef(new Map());
  const pingTimers = useRef({});

  // Update status when WebSocket service status changes
  useEffect(() => {
    const updateStatus = (newStatus) => {
      setStatus(newStatus);
    };

    webSocketService.on('connected', () => {
      updateStatus('connected');
      setConnectionStats(prev => ({
        ...prev,
        connectedAt: new Date(),
        messageCount: 0
      }));
      onConnected?.();
    });

    webSocketService.on('disconnected', () => {
      updateStatus('disconnected');
      onDisconnected?.();
    });

    webSocketService.on('connecting', () => {
      updateStatus('connecting');
      onConnecting?.();
    });

    webSocketService.on('error', (error) => {
      onError?.(error);
    });
    
    webSocketService.on('message', (message) => {
      setLastMessage(message);
      
      setConnectionStats(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1
      }));
      
      onMessage?.(message);
      
      // Call type-specific handlers
      if (message.type && messageHandlers.current.has(message.type)) {
        messageHandlers.current.get(message.type).forEach(handler => handler(message.payload));
      }
    });

    return () => {
      webSocketService.off('connected', updateStatus);
      webSocketService.off('disconnected', updateStatus);
      webSocketService.off('connecting', updateStatus);
      webSocketService.off('error', onError);
      webSocketService.off('message', onMessage);
    };
  }, [onConnected, onDisconnected, onError, onConnecting, onMessage]);

  // Connect on mount
  useEffect(() => {
    if (autoConnect) {
      webSocketService.connect();
    }
  }, [autoConnect]);

  /**
   * Register a handler for a specific message type
   * Returns an unsubscribe function
   */
  const onMessageType = useCallback((messageType, handler) => {
    if (!messageHandlers.current.has(messageType)) {
      messageHandlers.current.set(messageType, new Set());
    }
    messageHandlers.current.get(messageType).add(handler);

    return () => {
      if (messageHandlers.current.has(messageType)) {
        messageHandlers.current.get(messageType).delete(handler);
        if (messageHandlers.current.get(messageType).size === 0) {
          messageHandlers.current.delete(messageType);
        }
      }
    };
  }, []);

  // Send message
  const send = useCallback((message) => {
    return webSocketService.send(message);
  }, []);

  // Subscribe to topics
  const subscribe = useCallback((topics) => {
    return webSocketService.subscribe(topics);
  }, []);

  // Unsubscribe from topics
  const unsubscribe = useCallback((topics) => {
    return webSocketService.unsubscribe(topics);
  }, []);

  // Connect manually
  const connect = useCallback(() => {
    webSocketService.connect();
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Get connection status
  const getStatus = useCallback(() => {
    return webSocketService.getStatus();
  }, []);

  return {
    // State
    status,
    lastMessage,
    connectionStats,
    
    // Actions
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    getStatus,
    
    // Event handling
    onMessageType,
    
    // Service instance (for advanced use)
    service: webSocketService
  };
};
