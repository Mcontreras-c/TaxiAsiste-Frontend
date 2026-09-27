import apiClient from './client';
import type { Socio } from '../types';

export const getSocios = () =>
  apiClient.get<Socio[]>('/socios/').then(r => r.data);

export const getSocio = (id: number) =>
  apiClient.get<Socio>(`/socios/${id}/`).then(r => r.data);

export const createSocio = (data: Partial<Socio>) =>
  apiClient.post<Socio>('/socios/', data).then(r => r.data);

export const updateSocio = (id: number, data: Partial<Socio>) =>
  apiClient.patch<Socio>(`/socios/${id}/`, data).then(r => r.data);

export const desbloquearSocio = (idSocio: number) =>
  apiClient.post<{ message: string; estado_socio: string }>(`/socios/${idSocio}/desbloquear/`).then(r => r.data);

export const bloquearSocio = (idSocio: number, motivo: string, tipoBloqueo?: string) =>
  apiClient.post<{ message: string; estado_socio: string }>(
    `/socios/${idSocio}/bloquear/`, { motivo, tipo_bloqueo: tipoBloqueo },
  ).then(r => r.data);

// Baja = socio, cuenta y movil INACTIVOS y fuera de la fila (nunca se borra). Solo Administrador.
export const darDeBajaSocio = (idSocio: number) =>
  apiClient.post<Socio>(`/socios/${idSocio}/dar_de_baja/`).then(r => r.data);

export const reactivarSocio = (idSocio: number) =>
  apiClient.post<Socio>(`/socios/${idSocio}/reactivar/`).then(r => r.data);
