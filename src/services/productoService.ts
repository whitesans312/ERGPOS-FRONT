import api from './api';
import type { Producto } from '../types';

export const productoService = {
    async getProductos(): Promise<Producto[]> {
        const response = await api.get('/productos');
        return response.data;
    },

    async getProductosActivos(): Promise<Producto[]> {
        const response = await api.get('/productos/activos');
        return response.data;
    },

    async getProductoById(id: string): Promise<Producto> {
        const response = await api.get(`/productos/${id}`);
        return response.data;
    },

    // ✅ NUEVO — productos con stock ≤ stockMinimo
    async getProductosConStockBajo(): Promise<Producto[]> {
        const response = await api.get('/productos/stock-bajo');
        return response.data;
    },

    // ✅ NUEVO — búsqueda por nombre o código
    async buscarProductos(q: string): Promise<Producto[]> {
        const response = await api.get(`/productos/buscar?q=${encodeURIComponent(q)}`);
        return response.data;
    },

    async crearProducto(productoData: Partial<Producto>): Promise<Producto> {
        const response = await api.post('/productos', productoData);
        return response.data;
    },

    async updateProducto(id: string, productoData: Partial<Producto>): Promise<Producto> {
        const response = await api.put(`/productos/${id}`, productoData);
        return response.data;
    },

    async desactivarProducto(id: string): Promise<void> {
        await api.delete(`/productos/${id}`);
    },

    async setProductoActivo(id: string, activo: boolean): Promise<Producto> {
        const response = await api.patch(`/productos/${id}/activar?activo=${activo}`);
        return response.data;
    }
};