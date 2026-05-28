// ── entregaService.ts ─────────────────────────────────────────────────────────
import api from './api';
import type { OrdenServicio } from '../types';

export const entregaService = {

    // ── Consultas ─────────────────────────────────────────────────────────────

    getEntregas: (): Promise<OrdenServicio[]> =>
        api.get('/entregas').then(r => r.data),

    getById: (id: string): Promise<OrdenServicio> =>
        api.get(`/entregas/${id}`).then(r => r.data),

    getByEstado: (estado: string): Promise<OrdenServicio[]> =>
        api.get(`/entregas/estado/${estado}`).then(r => r.data),

    getByTecnico: (tecnicoId: string): Promise<OrdenServicio[]> =>
        api.get(`/entregas/tecnico/${tecnicoId}`).then(r => r.data),

    getPagoPendiente: (): Promise<OrdenServicio[]> =>
        api.get('/entregas/pago-pendiente').then(r => r.data),

    getPorConfirmar: (): Promise<OrdenServicio[]> =>
        api.get('/entregas/por-confirmar').then(r => r.data),

    getResumen: (): Promise<Record<string, number>> =>
        api.get('/entregas/resumen').then(r => r.data),

    getContadores: (): Promise<{ porConfirmar: number; pagoPendiente: number }> =>
        api.get('/entregas/contadores').then(r => r.data),

    // ── Crear / Editar ────────────────────────────────────────────────────────

    crear: (entrega: Partial<OrdenServicio>): Promise<OrdenServicio> =>
        api.post('/entregas', entrega).then(r => r.data),

    update: (id: string, entrega: Partial<OrdenServicio>): Promise<OrdenServicio> =>
        api.put(`/entregas/${id}`, entrega).then(r => r.data),

    // ── Cambio de estado ──────────────────────────────────────────────────────

    cambiarEstado: (id: string, estado: string, notas?: string): Promise<OrdenServicio> =>
        api.patch(`/entregas/${id}/estado`, null, { params: { estado, notas } }).then(r => r.data),

    // Admin confirma el servicio → mueve inventario y pasa a FINALIZADO
    confirmarServicio: (id: string, adminId?: string): Promise<OrdenServicio> =>
        api.post(`/entregas/${id}/confirmar`, null, { params: { adminId } }).then(r => r.data),

    cancelar: (id: string): Promise<void> =>
        api.delete(`/entregas/${id}`).then(r => r.data),

    // ── Pagos ─────────────────────────────────────────────────────────────────

    registrarPago: (
        id: string,
        monto: number,
        notas?: string,
        usuarioId?: string
    ): Promise<OrdenServicio> =>
        api.post(`/entregas/${id}/pagos`, null, {
            params: { monto, notas, usuarioId }
        }).then(r => r.data),

    configurarAnticipo: (id: string, porcentaje: number): Promise<OrdenServicio> =>
        api.patch(`/entregas/${id}/anticipo`, null, { params: { porcentaje } }).then(r => r.data),
};
