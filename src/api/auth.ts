import apiClient from './client';
import type { LoginResponse } from '../types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  const { data } = await apiClient.post<LoginResponse>('/login/', { username, password });
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data;
}

export async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem('refresh_token');
  // ROTATE_REFRESH_TOKENS+BLACKLIST_AFTER_ROTATION en el backend: el
  // refresh usado queda invalidado de inmediato, asi que hay que guardar
  // el nuevo que devuelve la respuesta o el proximo refresh fallaria.
  const { data } = await apiClient.post<{ access: string; refresh: string }>('/token/refresh/', { refresh });
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data.access;
}

export function logout(): void {
  // Best-effort: invalida el refresh token del lado del servidor (queda en
  // blacklist) para que no siga sirviendo si alguien lo intercepto. Si la
  // red falla, igual se cierra sesion localmente — no bloquea al usuario.
  const refresh = localStorage.getItem('refresh_token');
  if (refresh) {
    apiClient.post('/logout/', { refresh }).catch(() => {});
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
