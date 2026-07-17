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
