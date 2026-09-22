import apiClient from './client';

export interface EventoAgenda {
  id_evento_agenda: number;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  lugar: string | null;
  usuario_creador: number | null;
  usuario_creador_nombre: string | null;
  fecha_creacion: string;
}

export interface EventoAgendaInput {
  titulo: string;
  descripcion?: string | null;
  fecha_hora: string;
  lugar?: string | null;
}

export const getEventosAgenda = () =>
  apiClient.get<EventoAgenda[]>('/eventos-agenda/').then(r => r.data);

export const createEventoAgenda = (data: EventoAgendaInput) =>
  apiClient.post<EventoAgenda>('/eventos-agenda/', data).then(r => r.data);

export const updateEventoAgenda = (id: number, data: EventoAgendaInput) =>
  apiClient.patch<EventoAgenda>(`/eventos-agenda/${id}/`, data).then(r => r.data);

export const deleteEventoAgenda = (id: number) =>
  apiClient.delete(`/eventos-agenda/${id}/`);

export interface DocumentoAgenda {
  id_documento: number;
  nombre: string;
  archivo: string;
  categoria: string | null;
  usuario_subio: number | null;
  usuario_subio_nombre: string | null;
  fecha_subida: string;
  tamano_bytes: number | null;
}

export const getDocumentosAgenda = () =>
  apiClient.get<DocumentoAgenda[]>('/documentos-agenda/').then(r => r.data);

export const subirDocumentoAgenda = (nombre: string, archivo: File, categoria?: string) => {
  const form = new FormData();
  form.append('nombre', nombre);
  form.append('archivo', archivo);
  if (categoria) form.append('categoria', categoria);
  return apiClient
    .post<DocumentoAgenda>('/documentos-agenda/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(r => r.data);
};

export const deleteDocumentoAgenda = (id: number) =>
  apiClient.delete(`/documentos-agenda/${id}/`);
