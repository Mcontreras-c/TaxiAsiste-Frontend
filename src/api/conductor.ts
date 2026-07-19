import apiClient from './client';
import type { Socio, Movil, Solicitud, Cuota } from '../types';

export interface PerfilConductor {
  socio: Socio;
  movil: Movil | null;
  solicitudes_hoy: Solicitud[];
  cuotas: Cuota[];
  fecha: string;
}

export const getPerfilConductor = () =>
  apiClient.get<PerfilConductor>('/usuarios/perfil_conductor/').then(r => r.data);
