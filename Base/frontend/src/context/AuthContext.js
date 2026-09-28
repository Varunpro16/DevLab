import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('devlab_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('devlab_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = localStorage.getItem('devlab_token');
    if (!existingToken) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => {
        setUser(data.user || data);
        localStorage.setItem('devlab_user', JSON.stringify(data.user || data));
      })
      .catch(() => {
        localStorage.removeItem('devlab_token');
        localStorage.removeItem('devlab_refresh_token');
        localStorage.removeItem('devlab_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = (data) => {
    localStorage.setItem('devlab_token', data.token);
    localStorage.setItem('devlab_refresh_token', data.refresh_token);
    localStorage.setItem('devlab_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    persistSession(data);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await authApi.register(name, email, password);
    persistSession(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('devlab_refresh_token');
    try {
      await authApi.logout(refreshToken);
    } catch (e) {
      // ignore network errors on logout
    }
    localStorage.removeItem('devlab_token');
    localStorage.removeItem('devlab_refresh_token');
    localStorage.removeItem('devlab_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
