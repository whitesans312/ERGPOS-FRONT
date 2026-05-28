// ── movimientoInventarioService.ts ────────────────────────────────────────────
import api from './api';
import type { MovimientoInventario } from '../types';

export const movimientoInventarioService = {

    // proveedor ahora es FK → se manda como { id } en lugar de string
    registrarEntrada: async (data: {
        productoId: string;
        cantidad: number;
        proveedorId?: string;   // antes era string nombre, ahora es UUID
        observacion?: string;
        usuarioId?: string;
    }): Promise<MovimientoInventario> => {
        const response = await api.post('/movimientos-inventario/entrada', {
            producto: { id: data.productoId },
            tipo: 'ENTRADA',
            cantidad: data.cantidad,
            proveedor: data.proveedorId ? { id: data.proveedorId } : null,
            observacion: data.observacion,
            usuario: data.usuarioId ? { id: data.usuarioId } : null,
        });
        return response.data;
    },

    registrarSalida: async (data: {
        productoId: string;
        cantidad: number;
        observacion?: string;
        usuarioId?: string;
    }): Promise<MovimientoInventario> => {
        const response = await api.post('/movimientos-inventario/salida', {
            producto: { id: data.productoId },
            tipo: 'SALIDA',
            cantidad: data.cantidad,
            observacion: data.observacion,
            usuario: data.usuarioId ? { id: data.usuarioId } : null,
        });
        return response.data;
    },

    getMovimientos: async (): Promise<MovimientoInventario[]> => {
        const response = await api.get('/movimientos-inventario');
        return response.data;
    },

    getMovimientosRecientes: async (): Promise<MovimientoInventario[]> => {
        const response = await api.get('/movimientos-inventario/recientes');
        return response.data;
    },
};