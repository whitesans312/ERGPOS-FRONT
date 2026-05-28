// ── ventaService.ts ───────────────────────────────────────────────────────────
import api from './api';
import type { Venta } from '../types';

export interface CrearVentaRequest {
    clienteNombre: string;
    clienteTelefono?: string;
    cliente?: { id: string };
    vendedor?: { id: string };
    estado?: string;
    items: {
        producto: { id: string };
        cantidad: number;
        precioUnitario: number;
    }[];
}

export interface ResumenVentas {
    totalVentas: number;
    completadas: number;
    canceladas: number;
    ingresoTotal: number;
    ingresosHoy: number;
    ingresosMes: number;
}

export const ventaService = {

    getVentas: (): Promise<Venta[]> =>
        api.get('/ventas').then(r => r.data),

    getById: (id: string): Promise<Venta> =>
        api.get(`/ventas/${id}`).then(r => r.data),

    getRecientes: (): Promise<Venta[]> =>
        api.get('/ventas/recientes').then(r => r.data),

    getResumen: (): Promise<ResumenVentas> =>
        api.get('/ventas/resumen').then(r => r.data),

    crear: (venta: CrearVentaRequest): Promise<Venta> =>
        api.post('/ventas', venta).then(r => r.data),

    // Cancelar venta — devuelve stock automáticamente en el backend
    cancelar: (id: string): Promise<Venta> =>
        api.delete(`/ventas/${id}`).then(r => r.data),
};