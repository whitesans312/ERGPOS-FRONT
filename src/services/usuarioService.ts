import api from './api';
import type { Usuario } from '../types';

export const usuarioService = {
    async crearUsuario(usuarioData: {
        nombre: string;
        email: string;
        password: string;
        rolId: string;
        telefono?: string;
    }): Promise<Usuario> {
        const response = await api.post('/usuarios', {
            nombre: usuarioData.nombre,
            email: usuarioData.email,
            password: usuarioData.password,
            telefono: usuarioData.telefono,
            rol: { id: usuarioData.rolId }
        });
        return response.data;
    },

    async getUsuarios(): Promise<Usuario[]> {
        const response = await api.get('/usuarios');
        return response.data;
    },

    async getUsuarioById(id: string): Promise<Usuario> {
        const response = await api.get(`/usuarios/${id}`);
        return response.data;
    },

    async getTecnicos(): Promise<Usuario[]> {
        const response = await api.get('/usuarios/tecnicos');
        return response.data;
    },

    async updateUsuario(id: string, usuarioData: Partial<Usuario> & { password?: string }): Promise<Usuario> {
        const response = await api.put(`/usuarios/${id}`, usuarioData);
        return response.data;
    },

    async desactivarUsuario(id: string): Promise<void> {
        await api.delete(`/usuarios/${id}`);
    },

    async setUsuarioActivo(id: string, activo: boolean): Promise<Usuario> {
        const response = await api.patch(`/usuarios/${id}/activar?activo=${activo}`);
        return response.data;
    },

    async buscarPorEmail(email: string): Promise<Usuario> {
        const response = await api.get(`/usuarios/email/${email}`);
        return response.data;
    }
};