import apiClient from './client';

// Link de descarga del APK (lo configura el servidor). null si aun no hay uno publicado.
export const getLinkDescargaApp = () =>
  apiClient.get<{ url: string | null }>('/descarga_app/').then(r => r.data.url);
