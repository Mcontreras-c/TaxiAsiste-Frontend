import apiClient from './client';
import type { Solicitud, EstadoSolicitud, Pasajero } from '../types';

export interface ResumenCentral {
  pendientes:  Solicitud[];
  en_curso:    Solicitud[];
  finalizadas: Solicitud[];
}

export const getSolicitudes = () =>
  apiClient.get<Solicitud[]>('/solicitudes/').then(r => r.data);

export const getResumenCentral = () =>
  apiClient.get<ResumenCentral>('/solicitudes/resumen_central/').then(r => r.data);

export const createSolicitud = (data: Partial<Solicitud>) =>
  apiClient.post<Solicitud>('/solicitudes/', data).then(r => r.data);

export const cambiarEstado = (id: number, estado: EstadoSolicitud, movil?: number, observacion?: string) =>
  apiClient.post(`/solicitudes/${id}/cambiar_estado/`, { estado, movil, observacion }).then(r => r.data);

export const buscarPasajeroPorRut = (rut: string) =>
  apiClient.get<Pasajero[]>(`/pasajeros/buscar_rut/?rut=${rut}`).then(r => r.data);
