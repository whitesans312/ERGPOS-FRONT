// ── kardexService.ts ──────────────────────────────────────────────────────────
import api from './api';

export const kardexService = {
    getKardex: (productoId: string) => api.get(`/kardex/${productoId}`).then(r => r.data),
};