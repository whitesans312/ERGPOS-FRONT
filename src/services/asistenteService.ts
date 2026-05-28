import api from './api';

export type FuenteAsistente = 'INTERNO' | 'GROQ' | 'FALLBACK' | 'ERROR';

export interface AsistenteRespuesta {
    respuesta: string;
    fuente: FuenteAsistente;
}

export const asistenteService = {
    preguntar: async (pregunta: string): Promise<AsistenteRespuesta> => {
        const response = await api.post<AsistenteRespuesta>('/asistente/chat', { pregunta });
        return response.data;
    },
};
