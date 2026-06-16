import axios from 'axios';

/** Umbral en ms: si el token expira en menos de este tiempo, se renueva automáticamente */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

/** Flag para evitar múltiples refreshes simultáneos */
let _refreshingPromise: Promise<boolean> | null = null;

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
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
    async (response) => {
        // Renovar token proactivamente si está próximo a expirar
        const expiresAt = Number(localStorage.getItem('tokenExpiresAt') || 0);
        const token = localStorage.getItem('token');
        if (token && expiresAt > 0) {
            const remaining = expiresAt - Date.now();
            if (remaining > 0 && remaining < REFRESH_THRESHOLD_MS) {
                // Solo un refresh a la vez
                if (!_refreshingPromise) {
                    _refreshingPromise = api
                        .post('/auth/refresh')
                        .then((r) => {
                            const { token: newToken, expiresInMs } = r.data;
                            localStorage.setItem('token', newToken);
                            localStorage.setItem('tokenExpiresAt', String(Date.now() + expiresInMs));
                            // Actualizar el user si viene en la respuesta
                            if (r.data.user) {
                                localStorage.setItem('user', JSON.stringify(r.data.user));
                            }
                            return true;
                        })
                        .catch(() => false)
                        .finally(() => { _refreshingPromise = null; });
                }
                // No esperamos el refresh para no bloquear la respuesta actual
            }
        }
        return response;
    },
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
