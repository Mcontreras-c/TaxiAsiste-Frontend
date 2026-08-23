import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type ConfigConReintento = AxiosRequestConfig & { _reintentado?: boolean };

// Varias requests pueden pisar un 401 al mismo tiempo (ej. el polling de
// solicitudes + moviles + ubicaciones) -- se comparte una sola promesa de
// refresh en vuelo para no disparar POST /token/refresh/ por triplicado.
let refrescando: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as ConfigConReintento | undefined;
    const esRefresh = original?.url?.includes('/token/refresh/');

    if (
      error.response?.status === 401 &&
      original &&
      !esRefresh &&
      !original._reintentado &&
      localStorage.getItem('refresh_token')
    ) {
      original._reintentado = true;
      try {
        const { refreshToken } = await import('./auth');
        refrescando ??= refreshToken().finally(() => {
          refrescando = null;
        });
        const nuevoAccess = await refrescando;
        original.headers = { ...original.headers, Authorization: `Bearer ${nuevoAccess}` };
        return apiClient(original);
      } catch {
        // El refresh token tambien vencio o es invalido -- cae al 401 de
        // abajo, que cierra la sesion local (ver logout()).
      }
    }

    // esRefresh: un 401 del propio POST /token/refresh/ ya se maneja en el
    // catch de arriba (cae aca solo para propagar el error) -- sin este
    // guard, cerraria sesion una segunda vez de forma redundante para la
    // misma sesion vencida.
    if (error.response?.status === 401 && !esRefresh) {
      // Sesion invalida sin posibilidad de refresh (token vencido sin
      // refresh_token util, o se inicio sesion en otro dispositivo):
      // cerramos sesion local para volver al login en vez de mostrar
      // errores sueltos.
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
