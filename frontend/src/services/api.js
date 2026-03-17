import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SESSION_USER_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
let refreshSessionPromise = null;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const getStorageForKey = (key) => {
    if (localStorage.getItem(key) !== null) return localStorage;
    if (sessionStorage.getItem(key) !== null) return sessionStorage;
    return null;
};

const getStoredValue = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

const getTokenStorage = () => (
    getStorageForKey(REFRESH_TOKEN_KEY)
    || getStorageForKey(ACCESS_TOKEN_KEY)
    || getStorageForKey(SESSION_USER_KEY)
    || localStorage
);

const getSessionUser = () => {
    try {
        const value = getStoredValue(SESSION_USER_KEY);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
};

const clearAuthStorage = () => {
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_USER_KEY].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    delete api.defaults.headers.common.Authorization;
};

const persistRotatedSession = ({ accessToken, refreshToken, user }) => {
    const selectedStorage = getTokenStorage();
    const alternateStorage = selectedStorage === localStorage ? sessionStorage : localStorage;

    alternateStorage.removeItem(ACCESS_TOKEN_KEY);
    alternateStorage.removeItem(REFRESH_TOKEN_KEY);

    selectedStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    selectedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    if (user) {
        selectedStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    }
};

const redirectToLogin = () => {
    clearAuthStorage();
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

const appendOperatorId = (config, user) => {
    const method = String(config.method || 'get').toLowerCase();
    if (!user?.id || !['post', 'put', 'patch', 'delete'].includes(method)) {
        return;
    }

    if (config.data instanceof FormData) {
        if (!config.data.has('operator_id')) {
            config.data.append('operator_id', user.id);
        }
        return;
    }

    if (typeof config.data === 'object' && config.data !== null) {
        config.data.operator_id = user.id;
        return;
    }

    if (!config.data) {
        config.data = { operator_id: user.id };
    }
};

const executeRefreshSession = async () => {
    const refreshToken = getStoredValue(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        throw new Error('Missing refresh token');
    }

    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    if (!data?.accessToken || !data?.refreshToken) {
        throw new Error('Invalid refresh response');
    }

    persistRotatedSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user || null,
    });

    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
    return data;
};

const refreshSessionOnce = async () => {
    if (!refreshSessionPromise) {
        refreshSessionPromise = executeRefreshSession().finally(() => {
            refreshSessionPromise = null;
        });
    }

    return refreshSessionPromise;
};

api.interceptors.request.use(
    (config) => {
        const token = getStoredValue(ACCESS_TOKEN_KEY);
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        appendOperatorId(config, getSessionUser());
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');
        const isLoginRequest = originalRequest?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshRequest && !isLoginRequest) {
            originalRequest._retry = true;

            try {
                const data = await refreshSessionOnce();
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                redirectToLogin();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
