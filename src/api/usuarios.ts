import apiClient from './client';
import type { Rol } from '../config/permisos';

export interface UsuarioCuenta {
  id_usuario: number;
  username: string;
  email: string;
  rol: { id_rol: number; nombre_rol: Rol };
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export const getUsuarios = () =>
  apiClient.get<UsuarioCuenta[]>('/usuarios/').then(r => r.data);

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  apiClient
    .post<{ detail: string }>('/usuarios/cambiar_password/', {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    })
    .then(r => r.data);

export const resetearPassword = (idUsuario: number, passwordNueva: string) =>
  apiClient
    .post<{ detail: string }>(`/usuarios/${idUsuario}/resetear_password/`, {
      password_nueva: passwordNueva,
    })
    .then(r => r.data);
