import apiClient from './client';
import type { Rol } from '../config/permisos';

export interface RolCuenta {
  id_rol: number;
  nombre_rol: Rol | 'Paletero';
  descripcion: string;
  activo: number;
}

export interface UsuarioCuenta {
  id_usuario: number;
  username: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  nombre_completo: string;
  rol: { id_rol: number; nombre_rol: Rol | 'Paletero' };
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export interface NuevoUsuarioPayload {
  id_rol: number;
  username: string;
  password: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  /** Solo para rol Conductor: vincula el usuario a un socio sin usuario todavía. */
  id_socio?: number;
}

export const getRoles = () =>
  apiClient.get<RolCuenta[]>('/roles/').then(r => r.data);

export const getUsuarios = () =>
  apiClient.get<UsuarioCuenta[]>('/usuarios/').then(r => r.data);

export const crearUsuario = (data: NuevoUsuarioPayload) =>
  apiClient.post<UsuarioCuenta>('/usuarios/', data).then(r => r.data);

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
