import apiClient from './client';
import type { Solicitud, EstadoSolicitud } from '../types';

export const getSolicitudes = () =>
  apiClient.get<Solicitud[]>('/solicitudes/').then(r => r.data);

export const createSolicitud = (data: Partial<Solicitud>) =>
  apiClient.post<Solicitud>('/solicitudes/', data).then(r => r.data);

export const cambiarEstado = (id: number, estado: EstadoSolicitud, movil?: number) =>
  apiClient.post(`/solicitudes/${id}/cambiar_estado/`, { estado, movil }).then(r => r.data);
