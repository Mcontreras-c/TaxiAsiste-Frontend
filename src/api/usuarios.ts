import apiClient from './client';
import type { Rol } from '../config/permisos';

export interface RolCuenta {
  id_rol: number;
  nombre_rol: Rol | 'Paletero';
  descripcion: string | null;
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
  /** Obligatorio: es el único canal por el que se entrega la contraseña (generada por el servidor). */
  email: string;
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

export interface EditarUsuarioPayload {
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
}

export const updateUsuario = (id: number, data: EditarUsuarioPayload) =>
  apiClient.patch<UsuarioCuenta>(`/usuarios/${id}/`, data).then(r => r.data);

export const olvidePassword = (email: string) =>
  apiClient.post<{ detail: string }>('/usuarios/olvide_password/', { email }).then(r => r.data);

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

// Genera una clave nueva y se la manda por correo al usuario (nunca vuelve en la respuesta).
export const reenviarCredenciales = (idUsuario: number) =>
  apiClient.post<{ detail: string }>(`/usuarios/${idUsuario}/reenviar_credenciales/`).then(r => r.data);

// Perfil de la propia cuenta (GET/PATCH /usuarios/mi_perfil/). El servidor solo
// deja cambiar correo (con la clave actual) y telefono.
export interface PerfilUsuario {
  id_usuario: number;
  username: string;
  rol: string;
  nombre: string | null;
  apellido: string | null;
  nombre_completo: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  es_socio: boolean;
}

export const getMiPerfil = () =>
  apiClient.get<PerfilUsuario>('/usuarios/mi_perfil/').then(r => r.data);

export const actualizarMiPerfil = (data: { email?: string; telefono?: string | null; password_actual?: string }) =>
  apiClient.patch<PerfilUsuario>('/usuarios/mi_perfil/', data).then(r => r.data);
