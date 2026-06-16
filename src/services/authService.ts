import api from './api';
import type { Usuario, LoginRequest, LoginResponse, RegisterRequest } from '../types';

const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const TOKEN_EXPIRES_AT_KEY = 'tokenExpiresAt';

export const authService = {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    async register(userData: RegisterRequest): Promise<Usuario> {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    async logoutRemote(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } catch {
            // El cierre local debe continuar aunque el log remoto falle.
        }
    },

    async refreshToken(): Promise<string> {
        const response = await api.post('/auth/refresh');
        const { token, expiresInMs } = response.data;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInMs));
        return token;
    },

    getTimeToExpiry(): number {
        const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0);
        return Math.max(0, expiresAt - Date.now());
    },

    isAuthenticated(): boolean {
        const user = localStorage.getItem(USER_KEY);
        const token = localStorage.getItem(TOKEN_KEY);
        const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0);

        if (!user || !token || !expiresAt || Date.now() >= expiresAt) {
            this.logout();
            return false;
        }

        return true;
    },

    setUser(user: Usuario): void {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    setSession(session: LoginResponse): void {
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        localStorage.setItem(TOKEN_KEY, session.token);
        localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + session.expiresInMs));
    },

    getUser(): Usuario | null {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    getToken(): string | null {
        if (!this.isAuthenticated()) return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    logout(): void {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
    }
};
