import apiClient from './client';
import type { Dashboard, SolicitudPorEstado } from '../types';

export const getDashboard = () =>
  apiClient.get<Dashboard>('/reportes/dashboard/').then(r => r.data);

export const getSolicitudesPorEstado = () =>
  apiClient.get<SolicitudPorEstado[]>('/reportes/solicitudes_por_estado/').then(r => r.data);
