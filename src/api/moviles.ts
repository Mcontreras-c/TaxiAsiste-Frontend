import apiClient from './client';
import type { FilaBase, Movil } from '../types';

export const getMoviles = () =>
  apiClient.get<Movil[]>('/moviles/').then(r => r.data);

export const getFilaBase = () =>
  apiClient.get<FilaBase[]>('/fila-base/').then(r => r.data);

export const getMovil = (id: number) =>
  apiClient.get<Movil>(`/moviles/${id}/`).then(r => r.data);

export const createMovil = (data: Partial<Movil>) =>
  apiClient.post<Movil>('/moviles/', data).then(r => r.data);

export const updateMovil = (id: number, data: Partial<Movil>) =>
  apiClient.patch<Movil>(`/moviles/${id}/`, data).then(r => r.data);

export interface UbicacionApi {
  id_ubicacion: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  lat: number;
  lng: number;
  heading: number | null;
  velocidad_kmh: number | null;
  actualizado_en: string;
}

// Solo devuelve moviles que reportaron GPS en los ultimos 45s (ver
// SEGUNDOS_ONLINE en el backend) — usado para polling de posiciones en vivo.
export const getUbicaciones = () =>
  apiClient.get<UbicacionApi[]>('/ubicaciones/').then(r => r.data);
