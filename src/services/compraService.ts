// ── compraService.ts ──────────────────────────────────────────────────────────
import api from './api';
import type { Compra } from '../types';

export const compraService = {
    getCompras: () => api.get('/compras').then(r => r.data),
    getRecientes: () => api.get('/compras/recientes').then(r => r.data),
    getById: (id: string) => api.get(`/compras/${id}`).then(r => r.data),
    crear: (c: Partial<Compra>) => api.post('/compras', c).then(r => r.data),
    confirmar: (id: string, usuarioId: string) =>
        api.patch(`/compras/${id}/confirmar`, null, { params: { usuarioId } }).then(r => r.data),
    cancelar: (id: string) => api.patch(`/compras/${id}/cancelar`).then(r => r.data),
};