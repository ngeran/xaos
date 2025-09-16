// src/core/websocket/useWebSocketStatus.js
import { useState, useEffect } from 'react';
import { useWebSocketContext } from './WebSocketContext';
import { logger } from '../utils/logger';

/**
 * Specialized hook for header WebSocket status display
 * Provides enhanced status information and connection metrics
 */
export const useWebSocketStatus = () => {
  const { status, connectionStats, service } = useWebSocketContext();
  const [enhancedStatus, setEnhancedStatus] = useState(status);
  const [lastActivity, setLastActivity] = useState(null);
  const [isUnstable, setIsUnstable] = useState(false);

  useEffect(() => {
    setEnhancedStatus(status);
    
    // Reset unstable state when connection is established
    if (status === 'connected') {
      setIsUnstable(false);
      setLastActivity(new Date());
    }
  }, [status]);

  // Listen for connection instability (pong timeouts)
  useEffect(() => {
    const handleUnstable = () => {
      setIsUnstable(true);
      logger.warn('WebSocket connection detected as unstable');
    };

    const handlePong = () => {
      setIsUnstable(false);
      setLastActivity(new Date());
    };

    service.on('connectionUnstable', handleUnstable);
    service.on('pongReceived', handlePong);

    return () => {
      service.off('connectionUnstable', handleUnstable);
      service.off('pongReceived', handlePong);
    };
  }, [service]);

  // Calculate connection duration
  const getConnectionDuration = () => {
    if (!connectionStats.connectedAt) return null;
    
    const now = new Date();
    const diff = now - connectionStats.connectedAt;
    
    // Format duration as HH:MM:SS
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate time since last activity
  const getTimeSinceLastActivity = () => {
    if (!lastActivity) return null;
    
    const now = new Date();
    const diff = Math.floor((now - lastActivity) / 1000); // in seconds
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Get status for display with additional context
  const getDisplayStatus = () => {
    if (isUnstable && enhancedStatus === 'connected') {
      return 'unstable';
    }
    return enhancedStatus;
  };

  return {
    status: getDisplayStatus(),
    connectionStats: {
      ...connectionStats,
      duration: getConnectionDuration(),
      lastActivity: getTimeSinceLastActivity(),
      messageCount: connectionStats.messageCount
    },
    isUnstable,
    reconnect: service.connect,
    disconnect: service.disconnect
  };
};
