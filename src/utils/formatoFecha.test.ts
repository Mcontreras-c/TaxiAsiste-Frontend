import { describe, expect, it } from 'vitest';
import { formatoFechaHora, formatoHora } from './formatoFecha';

// Fechas locales (sin 'Z') para que el resultado no dependa de la zona horaria de quien corre el test.
describe('formatoHora', () => {
  it('muestra la tarde en 24 h', () => {
    expect(formatoHora(new Date(2026, 8, 25, 18, 30))).toBe('18:30');
  });

  it('muestra la manana con cero a la izquierda', () => {
    expect(formatoHora(new Date(2026, 8, 25, 7, 5))).toBe('07:05');
  });

  it('muestra la medianoche como 00:05, no 24:05', () => {
    expect(formatoHora(new Date(2026, 8, 25, 0, 5))).toBe('00:05');
  });

  it('nunca incluye a. m. / p. m.', () => {
    expect(formatoHora(new Date(2026, 8, 25, 22, 54))).not.toMatch(/[ap]\.?\s?m/i);
  });

  it('acepta un texto ISO', () => {
    expect(formatoHora(new Date(2026, 8, 25, 9, 15).toISOString())).toBe('09:15');
  });

  it('devuelve un guion si la fecha no es valida', () => {
    expect(formatoHora('no-es-fecha')).toBe('—');
  });
});

describe('formatoFechaHora', () => {
  it('une la fecha con la hora en 24 h', () => {
    const texto = formatoFechaHora(new Date(2026, 8, 25, 21, 40));
    expect(texto).toMatch(/, 21:40$/);
    expect(texto).not.toMatch(/[ap]\.?\s?m/i);
  });

  it('estilo medium tambien usa 24 h', () => {
    expect(formatoFechaHora(new Date(2026, 8, 25, 13, 0), 'medium')).toMatch(/, 13:00$/);
  });

  it('devuelve un guion si la fecha no es valida', () => {
    expect(formatoFechaHora('nada')).toBe('—');
  });
});
