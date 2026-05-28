import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const expiresAt = Number(localStorage.getItem('tokenExpiresAt') || 0);

    if (token && expiresAt && Date.now() < expiresAt) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('tokenExpiresAt');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
