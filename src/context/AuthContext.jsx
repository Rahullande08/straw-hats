import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: 'usr_elena_vance',
    name: 'Elena Vance',
    email: 'elena.vance@sovereign-vault.internal',
    role: 'Sovereign Account',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2D3f8-QvkKo7Iep79rwSRjqJSxlO1LNDFKOeQWUFCr2X0OcRZKqHzk3eutzQTCES5Fg0_FRJBYKHObO5NAT5D_0RSxNR71xMq8_Y2AMHIbV6b9dXMb3LSv2sKjoM2T5CkSfz1DCVRccy77T8Smg6vzxMkKM9qxEX5GPor0vGul7__cKEKdJNrFR4Wyig0VbRRc4h1deGJ_keampTAhyAKvCpYZB75WJZlI2lP0qHIcYtSQIyAiTXdww',
    isAuthenticated: true,
    terminalVersion: 'Node v2.4 Live',
    compliance: 'PCI-DSS 4.0 Attested'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Attempt session restoration on mount
    authService.getSession()
      .then(res => {
        if (res && res.user) {
          setUser(res.user);
          setIsAuthenticated(Boolean(res.user.isAuthenticated ?? true));
        }
      })
      .catch(() => {
        // In demo mode or offline, keep default sovereign demo session
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (passphrase, rememberTerminal = true, email = null) => {
    setIsLoading(true);
    try {
      const res = await authService.login(passphrase, rememberTerminal, email);
      if (res && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        return res;
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const res = await authService.register(userData);
      if (res && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res && res.data) {
        setUser(res.data);
      }
    } catch {
      // keep existing user
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

