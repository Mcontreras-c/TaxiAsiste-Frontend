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
