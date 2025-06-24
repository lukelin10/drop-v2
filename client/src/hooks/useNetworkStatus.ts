/**
 * Network Status Hook
 * 
 * Provides network connectivity monitoring and graceful degradation features.
 * Handles offline/online states and provides user feedback for network issues.
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  lastOnlineTime: Date | null;
  offlineDuration: number; // in milliseconds
}

interface UseNetworkStatusReturn extends NetworkStatus {
  retry: () => void;
  isRetrying: boolean;
  canRetry: boolean;
}

/**
 * Hook to monitor network connectivity and provide degradation features
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnlineTime: navigator.onLine ? new Date() : null,
    offlineDuration: 0
  });
  
  const [isRetrying, setIsRetrying] = useState(false);
  const [offlineStartTime, setOfflineStartTime] = useState<Date | null>(null);

  // Update network status
  const updateNetworkStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    const now = new Date();
    
    setNetworkStatus(prev => {
      let newStatus = { ...prev, isOnline };
      
      if (isOnline && !prev.isOnline) {
        // Just came back online
        newStatus.lastOnlineTime = now;
        newStatus.offlineDuration = offlineStartTime ? 
          now.getTime() - offlineStartTime.getTime() : 0;
      }
      
      return newStatus;
    });

    if (!isOnline && !offlineStartTime) {
      setOfflineStartTime(now);
    } else if (isOnline && offlineStartTime) {
      setOfflineStartTime(null);
    }
  }, [offlineStartTime]);

  // Check connection speed
  const checkConnectionSpeed = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const startTime = Date.now();
      
      // Use a small image to test connection speed
      const response = await fetch('/favicon.ico', { 
        cache: 'no-cache',
        method: 'HEAD'
      });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Consider connection slow if it takes more than 2 seconds
      const isSlowConnection = loadTime > 2000;
      
      setNetworkStatus(prev => ({
        ...prev,
        isSlowConnection
      }));
      
    } catch (error) {
      // If the request fails, we might be offline
      setNetworkStatus(prev => ({
        ...prev,
        isSlowConnection: true
      }));
    }
  }, []);

  // Get connection type if available
  const getConnectionType = useCallback(() => {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
  }, []);

  // Manual retry function
  const retry = useCallback(async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    
    try {
      // Wait a moment to avoid immediate retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update network status
      updateNetworkStatus();
      
      // Check connection speed
      await checkConnectionSpeed();
      
    } catch (error) {
      console.error('Network retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, updateNetworkStatus, checkConnectionSpeed]);

  // Set up event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Back online');
      updateNetworkStatus();
      checkConnectionSpeed();
    };

    const handleOffline = () => {
      console.log('Network: Gone offline');
      updateNetworkStatus();
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection type check
    setNetworkStatus(prev => ({
      ...prev,
      connectionType: getConnectionType()
    }));

    // Initial speed check
    checkConnectionSpeed();

    // Periodic connection quality check (every 30 seconds)
    const speedCheckInterval = setInterval(checkConnectionSpeed, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(speedCheckInterval);
    };
  }, [updateNetworkStatus, checkConnectionSpeed, getConnectionType]);

  // Update offline duration periodically
  useEffect(() => {
    if (!networkStatus.isOnline && offlineStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        setNetworkStatus(prev => ({
          ...prev,
          offlineDuration: now.getTime() - offlineStartTime.getTime()
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [networkStatus.isOnline, offlineStartTime]);

  return {
    ...networkStatus,
    retry,
    isRetrying,
    canRetry: !networkStatus.isOnline || networkStatus.isSlowConnection
  };
}

/**
 * Hook for API requests with network awareness
 */
export function useNetworkAwareRequest() {
  const networkStatus = useNetworkStatus();

  const makeRequest = useCallback(async (
    requestFn: () => Promise<any>,
    options: {
      retries?: number;
      retryDelay?: number;
      timeoutMs?: number;
      onNetworkError?: (error: Error) => void;
    } = {}
  ) => {
    const {
      retries = 2,
      retryDelay = 1000,
      timeoutMs = 30000,
      onNetworkError
    } = options;

    // Check if we're offline
    if (!networkStatus.isOnline) {
      const error = new Error('No internet connection. Please check your connection and try again.');
      onNetworkError?.(error);
      throw error;
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout to the request
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout. Please check your connection and try again.'));
          }, timeoutMs);
        });

        const result = await Promise.race([
          requestFn(),
          timeoutPromise
        ]);

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Check if error is network-related
        const isNetworkError = 
          error instanceof TypeError ||
          (error as Error).message.includes('fetch') ||
          (error as Error).message.includes('network') ||
          (error as Error).message.includes('timeout');

        if (isNetworkError) {
          onNetworkError?.(error as Error);
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Check if we went offline during retry
        if (!navigator.onLine) {
          const offlineError = new Error('Connection lost during retry. Please check your internet connection.');
          onNetworkError?.(offlineError);
          throw offlineError;
        }
      }
    }

    throw lastError!;
  }, [networkStatus]);

  return {
    makeRequest,
    isOnline: networkStatus.isOnline,
    isSlowConnection: networkStatus.isSlowConnection,
    retry: networkStatus.retry
  };
} 