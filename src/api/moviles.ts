import apiClient from './client';
import type { Movil } from '../types';

export const getMoviles = () =>
  apiClient.get<Movil[]>('/moviles/').then(r => r.data);

export const getMovil = (id: number) =>
  apiClient.get<Movil>(`/moviles/${id}/`).then(r => r.data);

export const createMovil = (data: Partial<Movil>) =>
  apiClient.post<Movil>('/moviles/', data).then(r => r.data);

export const updateMovil = (id: number, data: Partial<Movil>) =>
  apiClient.patch<Movil>(`/moviles/${id}/`, data).then(r => r.data);
