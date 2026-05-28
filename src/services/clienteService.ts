import api from './api';
import type { Cliente, ClientePerfil } from '../types';

export const clienteService = {

    getClientes: async (): Promise<Cliente[]> => {
        const res = await api.get('/clientes');
        return res.data;
    },

    getClientesActivos: async (): Promise<Cliente[]> => {
        const res = await api.get('/clientes/activos');
        return res.data;
    },

    buscarClientes: async (q: string): Promise<Cliente[]> => {
        const res = await api.get('/clientes/buscar', { params: { q } });
        return res.data;
    },

    getClienteById: async (id: string): Promise<Cliente> => {
        const res = await api.get(`/clientes/${id}`);
        return res.data;
    },

    getPerfilCliente: async (id: string): Promise<ClientePerfil> => {
        const res = await api.get(`/clientes/${id}/perfil`);
        return res.data;
    },

    crearCliente: async (cliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cliente> => {
        const res = await api.post('/clientes', cliente);
        return res.data;
    },

    updateCliente: async (id: string, cliente: Partial<Cliente>): Promise<Cliente> => {
        const res = await api.put(`/clientes/${id}`, cliente);
        return res.data;
    },

    desactivarCliente: async (id: string): Promise<void> => {
        await api.delete(`/clientes/${id}`);
    },

    setClienteActivo: async (id: string, activo: boolean): Promise<Cliente> => {
        const res = await api.patch(`/clientes/${id}/activar`, null, { params: { activo } });
        return res.data;
    },
};
