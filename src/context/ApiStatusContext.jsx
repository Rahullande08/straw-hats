import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient.js';

const ApiStatusContext = createContext({
  isOnline: true,
  appMode: 'api',
  lastError: null,
  bannerVisible: false,
  dismissBanner: () => {},
  retryConnection: () => {}
});

export function ApiStatusProvider({ children }) {
  const appMode = (import.meta.env.VITE_APP_MODE || (import.meta.env.VITE_DEMO_MODE === 'true' ? 'demo' : 'api')).toLowerCase();
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = apiClient.onConnectionChange(({ isOnline: online, error }) => {
      setIsOnline(online);
      setLastError(error);
      if (!online && appMode === 'api') {
        setBannerVisible(true);
      } else {
        setBannerVisible(false);
      }
    });

    return () => unsubscribe();
  }, [appMode]);

  const retryConnection = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setIsOnline(true);
        setLastError(null);
        setBannerVisible(false);
      }
    } catch (err) {
      setIsOnline(false);
      setLastError(err);
      setBannerVisible(true);
    }
  };

  const dismissBanner = () => {
    setBannerVisible(false);
  };

  return (
    <ApiStatusContext.Provider
      value={{
        isOnline,
        appMode,
        lastError,
        bannerVisible,
        dismissBanner,
        retryConnection
      }}
    >
      {/* Global Connection Warning Banner when API is disconnected in API Mode */}
      {bannerVisible && appMode === 'api' && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-50 bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2.5 text-xs font-mono flex items-center justify-between shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-white">GATEWAY API UNREACHABLE:</span>
            <span>
              {lastError?.message || 'Failed to connect to backend on :3001. Actions cannot be verified.'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={retryConnection}
              className="px-2.5 py-1 bg-red-800/80 hover:bg-red-700 text-white rounded transition-colors text-[11px]"
            >
              Retry Connection
            </button>
            <button
              onClick={dismissBanner}
              className="text-red-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </aside>
      )}
      {children}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  return useContext(ApiStatusContext);
}

