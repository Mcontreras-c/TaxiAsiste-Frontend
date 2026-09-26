// Formato unico de fecha y hora para todo el panel: horas siempre en 24 h
// (18:30, nunca "6:30 p. m."). Usar estas funciones en vez de toLocale*String
// sueltos, asi el formato se cambia en un solo lugar.
//
// hourCycle 'h23' (y no hour12: false): con hour12: false algunos motores
// muestran la medianoche como "24:05".

type Fecha = string | number | Date;

const FORMATO_HORA = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const aFecha = (valor: Fecha): Date => (valor instanceof Date ? valor : new Date(valor));

const esValida = (fecha: Date) => !Number.isNaN(fecha.getTime());

/** Hora en 24 h: "18:30". Devuelve "—" si la fecha no es valida. */
export function formatoHora(valor: Fecha): string {
  const fecha = aFecha(valor);
  return esValida(fecha) ? FORMATO_HORA.format(fecha) : '—';
}

/**
 * Fecha y hora: "25-09-26, 18:30" (estilo 'short', el defecto) o
 * "25 sept 2026, 18:30" (estilo 'medium'). Devuelve "—" si no es valida.
 */
export function formatoFechaHora(valor: Fecha, estilo: 'short' | 'medium' = 'short'): string {
  const fecha = aFecha(valor);
  if (!esValida(fecha)) return '—';
  const dia = new Intl.DateTimeFormat('es-CL', { dateStyle: estilo }).format(fecha);
  return `${dia}, ${FORMATO_HORA.format(fecha)}`;
}
