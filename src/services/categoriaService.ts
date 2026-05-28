import api from './api';
import type { Categoria } from '../types';

export const categoriaService = {
    /** Lista categorías activas (para dropdowns de productos) */
    async getCategorias(): Promise<Categoria[]> {
        const response = await api.get('/categorias');
        return response.data;
    },

    /** Lista TODAS las categorías incluyendo inactivas (para el panel de gestión) */
    async getTodasCategorias(): Promise<Categoria[]> {
        const response = await api.get('/categorias/todas');
        return response.data;
    },

    async crearCategoria(nombre: string, descripcion?: string): Promise<Categoria> {
        const response = await api.post('/categorias', { nombre, descripcion });
        return response.data;
    },

    async actualizarCategoria(id: string, nombre: string, descripcion?: string): Promise<Categoria> {
        const response = await api.put(`/categorias/${id}`, { nombre, descripcion });
        return response.data;
    },

    async toggleActivo(id: string, activo: boolean): Promise<Categoria> {
        const response = await api.patch(`/categorias/${id}/activo?activo=${activo}`);
        return response.data;
    },

    async eliminarCategoria(id: string): Promise<void> {
        await api.delete(`/categorias/${id}`);
    },
};
