import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

const getStoredValue = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

const getStorageForKey = (key) => {
    if (localStorage.getItem(key) !== null) return localStorage;
    if (sessionStorage.getItem(key) !== null) return sessionStorage;
    return localStorage;
};

const clearAuthStorage = () => {
    ['accessToken', 'refreshToken', 'user'].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    delete api.defaults.headers.common.Authorization;
};

// Request interceptor for adding JWT tokens
api.interceptors.request.use(
    (config) => {
        const token = getStoredValue('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling refresh tokens
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshRequest) {
            originalRequest._retry = true;
            try {
                const refreshToken = getStoredValue('refreshToken');
                if (!refreshToken) {
                    clearAuthStorage();
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(error);
                }

                const tokenStorage = getStorageForKey('refreshToken');
                const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
                tokenStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                    tokenStorage.setItem('refreshToken', data.refreshToken);
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Clear tokens and redirect to login if refresh fails
                clearAuthStorage();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
