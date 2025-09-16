
import { useState, useCallback } from 'react';
 
export const useGenericWorkflow = (initialState = {}) => {
  const [state, setState] = useState({
    isRunning: false,
    isComplete: false,
    hasError: false,
    result: null,
    error: null,
    progress: [],
    ...initialState
  });
 
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
 
  const reset = useCallback(() => {
    setState({
      isRunning: false,
      isComplete: false,
      hasError: false,
      result: null,
      error: null,
      progress: []
    });
  }, []);
 
  const addProgress = useCallback((message) => {
    setState(prev => ({
      ...prev,
      progress: [...prev.progress, { message, timestamp: new Date().toISOString() }]
    }));
  }, []);
 
  return {
    state,
    updateState,
    reset,
    addProgress
  };
};
