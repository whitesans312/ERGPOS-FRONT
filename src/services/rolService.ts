import api from './api';
import type { Rol } from '../types';

export const rolService = {
    async getRoles(): Promise<Rol[]> {
        const response = await api.get('/roles');
        return response.data;
    },

    async getRolById(id: string): Promise<Rol> {
        const response = await api.get(`/roles/${id}`);
        return response.data;
    }
};