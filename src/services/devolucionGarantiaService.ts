import api from './api';

export interface DevolucionGarantiaItemInput {
    producto: { id: string };
    cantidad: number;
    precioUnitario?: number;
    motivoItem?: string;
}

export interface DevolucionGarantiaInput {
    tipo: 'DEVOLUCION' | 'GARANTIA';
    venta?: { id: string };
    entrega?: { id: string };
    razon: string;
    accionDinero: 'REEMBOLSO' | 'SALDO_FAVOR' | 'SIN_REEMBOLSO';
    montoDevuelto: number;
    notas?: string;
    registradoPor?: { id: string };
    items: DevolucionGarantiaItemInput[];
}

export const devolucionGarantiaService = {
    getAll: () => api.get('/devoluciones-garantias').then(r => r.data),
    getRecientes: () => api.get('/devoluciones-garantias/recientes').then(r => r.data),
    registrar: (payload: DevolucionGarantiaInput) =>
        api.post('/devoluciones-garantias', payload).then(r => r.data),
    anular: (id: string, motivo?: string) =>
        api.delete(`/devoluciones-garantias/${id}`, { params: { motivo } }).then(r => r.data),
    tieneActivaPorVenta: (ventaId: string): Promise<boolean> =>
        api.get(`/devoluciones-garantias/venta/${ventaId}/tiene-activa`).then(r => r.data),
    tieneActivaPorEntrega: (entregaId: string): Promise<boolean> =>
        api.get(`/devoluciones-garantias/entrega/${entregaId}/tiene-activa`).then(r => r.data),
};
