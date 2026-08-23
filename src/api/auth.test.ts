import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import apiClient from './client';
import { logout } from './auth';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  localStorage.clear();
});

afterEach(() => {
  mock.restore();
});

describe('logout', () => {
  it('invalida el refresh token en el backend (blacklist) y limpia el storage local', async () => {
    localStorage.setItem('access_token', 'access-actual');
    localStorage.setItem('refresh_token', 'refresh-actual');

    let cuerpoRecibido: unknown;
    mock.onPost('/logout/').reply((config) => {
      cuerpoRecibido = JSON.parse(config.data);
      return [205];
    });

    logout();
    await new Promise((r) => setTimeout(r, 0)); // deja que el POST fire-and-forget salga

    expect(cuerpoRecibido).toEqual({ refresh: 'refresh-actual' });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('limpia el storage local aunque el backend no responda (best-effort)', async () => {
    localStorage.setItem('access_token', 'access-actual');
    localStorage.setItem('refresh_token', 'refresh-actual');
    mock.onPost('/logout/').networkError();

    logout();
    await new Promise((r) => setTimeout(r, 0));

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('no llama al backend si no hay sesion (nada que invalidar)', async () => {
    let llamado = false;
    mock.onPost('/logout/').reply(() => {
      llamado = true;
      return [205];
    });

    logout();
    await new Promise((r) => setTimeout(r, 0));

    expect(llamado).toBe(false);
  });
});
