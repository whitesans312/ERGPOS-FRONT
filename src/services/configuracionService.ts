import api from './api';
import type { ConfiguracionNegocio } from '../types';

export const configuracionService = {
  /** GET /api/configuracion — lista completa */
  getAll: () =>
    api.get<ConfiguracionNegocio[]>('/configuracion').then(r => r.data),

  /** GET /api/configuracion/agrupada — agrupado por categoría */
  getAgrupada: () =>
    api.get<Record<string, ConfiguracionNegocio[]>>('/configuracion/agrupada').then(r => r.data),

  /** GET /api/configuracion/{clave} — un parámetro */
  getByClave: (clave: string) =>
    api.get<ConfiguracionNegocio>(`/configuracion/${clave}`).then(r => r.data),

  /** POST /api/configuracion — crear parámetro nuevo */
  create: (item: ConfiguracionNegocio) =>
    api.post<ConfiguracionNegocio>('/configuracion', item).then(r => r.data),

  /** PUT /api/configuracion/{clave} — actualizar uno */
  update: (clave: string, item: ConfiguracionNegocio) =>
    api.put<ConfiguracionNegocio>(`/configuracion/${clave}`, item).then(r => r.data),

  /** DELETE /api/configuracion/{clave} — eliminar uno */
  delete: (clave: string) =>
    api.delete(`/configuracion/${clave}`),

  /** PUT /api/configuracion — guardar múltiples */
  saveAll: (items: ConfiguracionNegocio[]) =>
    api.put<ConfiguracionNegocio[]>('/configuracion', items).then(r => r.data),

  /** GET /api/configuracion/export — exportar JSON */
  exportJson: async () => {
    const data = await api.get<ConfiguracionNegocio[]>('/configuracion/export').then(r => r.data);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ergpos-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** POST /api/configuracion/import — importar desde JSON */
  importJson: (items: ConfiguracionNegocio[]) =>
    api.post<ConfiguracionNegocio[]>('/configuracion/import', items).then(r => r.data),

  /** GET /api/configuracion/plantillas/{tipo} — preview de una plantilla */
  getPlantilla: (tipo: string) =>
    api.get<ConfiguracionNegocio[]>(`/configuracion/plantillas/${tipo}`).then(r => r.data),

  /** POST /api/configuracion/plantillas/{tipo}/aplicar — aplicar plantilla */
  aplicarPlantilla: (tipo: string) =>
    api.post<ConfiguracionNegocio[]>(`/configuracion/plantillas/${tipo}/aplicar`).then(r => r.data),
};
