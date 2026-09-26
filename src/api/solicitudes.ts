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

export const createPasajero = (data: { rut: string; nombre: string; apellido: string; telefono?: string | null }) =>
  apiClient.post<Pasajero>('/pasajeros/', {
    ...data,
    fecha_registro: new Date().toISOString().slice(0, 10),
  }).then(r => r.data);

export const actualizarTelefonoPasajero = (id: number, telefono: string) =>
  apiClient.patch<Pasajero>(`/pasajeros/${id}/`, { telefono }).then(r => r.data);

// Solo un Administrador: reinicia los incumplimientos y permite pedir moviles a domicilio otra vez.
export const levantarBloqueoPasajero = (id: number) =>
  apiClient.post<Pasajero>(`/pasajeros/${id}/levantar_bloqueo/`).then(r => r.data);
