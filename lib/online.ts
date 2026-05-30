/**
 * Check if device is currently online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    // Server-side, assume online
    return true;
  }
  return navigator.onLine;
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus(): boolean {
  // For client-side use
  if (typeof window === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

