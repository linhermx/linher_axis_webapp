import { useEffect, useState } from 'react';
import { AuthContext } from './authContext';
import api from '../services/api';

const getStoredValue = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);
const getStorageForKey = (key) => {
  if (localStorage.getItem(key) !== null) return localStorage;
  if (sessionStorage.getItem(key) !== null) return sessionStorage;
  return localStorage;
};

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const accessToken = getStoredValue('accessToken');
      const refreshToken = getStoredValue('refreshToken');

      if (!accessToken || !refreshToken) {
        clearStoredAuth();
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        const storage = getStorageForKey('accessToken');
        storage.setItem('user', JSON.stringify(data.user));

        if (isMounted) {
          setUser(data.user);
        }
      } catch {
        clearStoredAuth();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    clearStoredAuth();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }

    const meResponse = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(meResponse.data.user));
    setUser(meResponse.data.user);
    return meResponse.data.user;
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
