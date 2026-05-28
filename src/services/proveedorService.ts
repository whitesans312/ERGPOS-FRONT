// ── proveedorService.ts ───────────────────────────────────────────────────────
import api from './api';
import type { Proveedor } from '../types';

export const proveedorService = {
    getProveedores: () => api.get('/proveedores').then(r => r.data),
    getProveedoresActivos: () => api.get('/proveedores/activos').then(r => r.data),
    buscar: (q: string) => api.get('/proveedores/buscar', { params: { q } }).then(r => r.data),
    getById: (id: string) => api.get(`/proveedores/${id}`).then(r => r.data),
    crear: (p: Omit<Proveedor, 'id'>) => api.post('/proveedores', p).then(r => r.data),
    update: (id: string, p: Partial<Proveedor>) => api.put(`/proveedores/${id}`, p).then(r => r.data),
    desactivar: (id: string) => api.delete(`/proveedores/${id}`),
    setActivo: (id: string, activo: boolean) =>
        api.patch(`/proveedores/${id}/activar`, null, { params: { activo } }).then(r => r.data),
};