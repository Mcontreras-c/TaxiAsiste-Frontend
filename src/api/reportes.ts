import apiClient from './client';
import type { Dashboard, SolicitudPorEstado, ResumenTesorero } from '../types';

export const getDashboard = () =>
  apiClient.get<Dashboard>('/reportes/dashboard/').then(r => r.data);

export const getSolicitudesPorEstado = () =>
  apiClient.get<SolicitudPorEstado[]>('/reportes/solicitudes_por_estado/').then(r => r.data);

export const getResumenTesorero = (periodo?: string) =>
  apiClient.get<ResumenTesorero>('/reportes/resumen_tesorero/', { params: periodo ? { periodo } : {} }).then(r => r.data);

export const cerrarPeriodo = () =>
  apiClient.post<{ cuotas_vencidas: number; socios_bloqueados: number; fecha: string }>('/reportes/cerrar_periodo/').then(r => r.data);
