import { describe, expect, it } from 'vitest';
import { sugerirEmail, sugerirUsername } from './sugerirCredenciales';

describe('sugerirUsername', () => {
  it('primera inicial + apellido en minuscula', () => {
    expect(sugerirUsername('Juan', 'Soto')).toBe('jsoto');
  });

  it('quita tildes y la ñ se resuelve a n', () => {
    expect(sugerirUsername('María', 'Muñoz')).toBe('mmunoz');
  });

  it('quita espacios y caracteres raros de nombres compuestos', () => {
    expect(sugerirUsername('José María', "O'Higgins")).toBe('johiggins');
  });

  it('vacio si falta nombre o apellido', () => {
    expect(sugerirUsername('', 'Soto')).toBe('');
    expect(sugerirUsername('Juan', '')).toBe('');
  });
});

describe('sugerirEmail', () => {
  it('nombre.apellido en minuscula sin tildes', () => {
    expect(sugerirEmail('Carolina', 'Muñoz')).toBe('carolina.munoz@example.cl');
  });

  it('vacio si falta nombre o apellido', () => {
    expect(sugerirEmail('Juan', '')).toBe('');
  });
});
