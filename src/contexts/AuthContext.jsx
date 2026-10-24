import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { getAccessToken } from '../services/apiClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize user session from localStorage cache
  const [user, setUser] = useState(() => {
    try {
      return authService.getCurrentUser();
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Validate active session against backend on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authService
        .fetchCurrentUser()
        .then((fetchedUser) => {
          if (fetchedUser) {
            setUser(fetchedUser);
          }
        })
        .catch(() => {
          // Token invalid or expired
          authService.logout();
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, []);

  // Listen to 401 unauthorized events dispatched by apiClient
  useEffect(() => {
    const handleUnauthorized = () => {
      authService.logout();
      setUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('smartcare:unauthorized', handleUnauthorized);
      return () => {
        window.removeEventListener('smartcare:unauthorized', handleUnauthorized);
      };
    }
  }, []);

  const login = useCallback(async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const loggedInUser = await authService.login(email, password, rememberMe);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const newUser = await authService.register(userData);
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return null;
    const updatedUser = await authService.updateProfile(user.id, updates);
    setUser(updatedUser);
    return updatedUser;
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getRememberedEmail: authService.getRememberedEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth } from '../hooks/useAuth';
