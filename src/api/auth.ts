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
  const { data } = await apiClient.post<{ access: string }>('/token/refresh/', { refresh });
  localStorage.setItem('access_token', data.access);
  return data.access;
}

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
