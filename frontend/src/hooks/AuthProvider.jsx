import { useState } from 'react';
import { AuthContext } from './authContext';
import api from '../services/api';

const getStoredValue = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

const clearStoredAuth = () => {
  ['accessToken', 'refreshToken', 'user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const readStoredUser = () => {
  try {
    const storedUser = getStoredValue('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const readInitialUser = () => {
  const accessToken = getStoredValue('accessToken');
  const refreshToken = getStoredValue('refreshToken');

  if (!accessToken || !refreshToken) {
    clearStoredAuth();
    return null;
  }

  return readStoredUser();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readInitialUser);
  const loading = false;

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    clearStoredAuth();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = getStoredValue('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
