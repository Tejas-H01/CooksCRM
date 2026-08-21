import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

const TOKEN_KEY = 'finflow_access_token';

const AuthContext = createContext(null);

export const getRoleDefaultPath = (role) => {
  if (!role) return '/login';
  const normRole = role.toUpperCase();
  if (normRole === 'RM') return '/rm';
  if (normRole === 'BRANCH_MANAGER' || normRole === 'MANAGER') return '/manager';
  if (normRole === 'REGIONAL_HEAD' || normRole === 'REGIONAL') return '/regional';
  if (normRole === 'ADMIN') return '/admin';
  return '/admin';
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token'));
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      setAccessToken(null);
      setAuthInitializing(false);
      return;
    }

    setAccessToken(token);
    try {
      const user = await apiService.fetchMe();
      if (user && user.id) {
        setCurrentUser(user);
      } else {
        throw new Error('Invalid user payload');
      }
    } catch (err) {
      console.warn("Session restoration failed:", err.message);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      setCurrentUser(null);
      setAccessToken(null);
    } finally {
      setAuthInitializing(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Centralized 401 Unauthorized listener
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Centralized 401 Unauthorized received - clearing session");
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      setCurrentUser(null);
      setAccessToken(null);
    };

    window.addEventListener('finflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('finflow:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const cleanUser = username ? username.trim() : '';
      const data = await apiService.login(cleanUser, password);

      if (!data || !data.access_token) {
        throw new Error('Malformed server response: missing access token');
      }

      const token = data.access_token;
      setAccessToken(token);

      let user = data.user;
      if (!user) {
        // Fallback: fetch profile from /auth/me
        user = await apiService.fetchMe();
      }

      if (!user || !user.role) {
        throw new Error('Failed to retrieve user profile from backend');
      }

      setCurrentUser(user);
      return { user, token };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    setCurrentUser(null);
    setAccessToken(null);
  }, []);

  const isAuthenticated = Boolean(currentUser && accessToken);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        accessToken,
        isAuthenticated,
        authInitializing,
        isLoggingIn,
        login,
        logout,
        restoreSession,
        getRoleDefaultPath
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
