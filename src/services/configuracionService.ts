import api from './api';
import type { ConfiguracionNegocio } from '../types';

export const configuracionService = {
  getAll: () =>
    api.get<ConfiguracionNegocio[]>('/configuracion').then(r => r.data),
  saveAll: (items: ConfiguracionNegocio[]) =>
    api.put<ConfiguracionNegocio[]>('/configuracion', items).then(r => r.data),
};
