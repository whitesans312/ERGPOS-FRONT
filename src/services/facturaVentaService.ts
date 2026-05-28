// ── facturaVentaService.ts ────────────────────────────────────────────────────
import api from './api';

export const facturaVentaService = {
    getFacturas: () => api.get('/facturas-venta').then(r => r.data),
    getById: (id: string) => api.get(`/facturas-venta/${id}`).then(r => r.data),
    getByVentaId: (ventaId: string) => api.get(`/facturas-venta/venta/${ventaId}`).then(r => r.data),
    generar: (ventaId: string, usuarioId: string) =>
        api.post(`/facturas-venta/generar/${ventaId}`, null, { params: { usuarioId } }).then(r => r.data),
};