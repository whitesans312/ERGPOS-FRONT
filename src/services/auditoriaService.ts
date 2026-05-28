import api from './api';

export interface AuditoriaEntry {
  id: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  accion: string;
  modulo: string;
  entidadId: string | null;
  detalle: string | null;
  fecha: string;
}

export interface DashboardResumen {
  alertas: {
    ordenesCompletadasSinConfirmar: number;
    ordenesPagoPendiente: number;
    ordenesFinalizadasConDeuda: number;
    productosStockBajo: number;
  };
  kpis: {
    ventasHoy: number;
    totalVentasHoy: number;
  };
  ultimasAcciones: AuditoriaEntry[];
}

export const auditoriaService = {
  getResumen: (): Promise<DashboardResumen> =>
    api.get('/dashboard/resumen').then(r => r.data),

  getAuditoria: (params?: {
    limit?: number;
    modulo?: string;
    usuarioId?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<AuditoriaEntry[]> =>
    api.get('/auditoria', { params }).then(r => r.data),
};
