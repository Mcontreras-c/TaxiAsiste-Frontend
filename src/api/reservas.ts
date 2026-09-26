import apiClient from './client';

export type EstadoReserva =
  | 'PROGRAMADA' | 'ASIGNADA' | 'EN_CAMINO' | 'COMPLETADA' | 'CANCELADA' | 'INCUMPLIDA' | 'PASAJERO_AUSENTE';

// Lo calcula el servidor al leer: SIN_CONDUCTOR (nadie la tomo y ya falta poco) o
// NO_CONFIRMADA (el conductor no pulso "Voy en camino" a tiempo).
export type AlertaReserva = 'SIN_CONDUCTOR' | 'NO_CONFIRMADA' | null;

// Reflejo de ReservaSerializer (ver docs/API_RESERVAS.md en el backend). Las horas
// llegan en UTC con 'Z'; se muestran siempre con formatoHora / formatoFechaHora (24 h).
export interface Reserva {
  id_reserva: number;
  folio: string;
  estado: EstadoReserva;
  origen: string;
  destino: string;
  fecha_hora_recogida: string;
  duracion_estimada_s: number;
  distancia_estimada_m: number;
  tarifa_estimada: number;
  salida_base_maxima: string;
  libre_desde: string;
  alerta: AlertaReserva;
  pasajero: number | null;
  pasajero_nombre: string | null;
  pasajero_telefono: string | null;
  movil: number | null;
  movil_patente: string | null;
  conductor_nombre: string | null;
  observaciones: string | null;
}

export interface NuevaReserva {
  origen: string;
  fecha_hora_recogida: string; // ISO (toISOString)
  pasajero?: number | null;
  observaciones?: string | null;
}

// Vigentes: PROGRAMADA (sin conductor), ASIGNADA y EN_CAMINO.
export const getReservas = () =>
  apiClient.get<Reserva[]>('/reservas/').then(r => r.data);

export const crearReserva = (data: NuevaReserva) =>
  apiClient.post<Reserva>('/reservas/', data).then(r => r.data);

export const cancelarReserva = (id: number, motivo?: string) =>
  apiClient.post<Reserva>(`/reservas/${id}/cancelar/`, { motivo }).then(r => r.data);

// Central le quita la reserva al conductor y queda disponible para otros.
// incumplio=true la registra como incumplimiento del conductor (no llego / no confirmo).
export const liberarReserva = (id: number, incumplio: boolean, motivo?: string) =>
  apiClient.post<Reserva>(`/reservas/${id}/liberar/`, { incumplio, motivo }).then(r => r.data);
