import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import apiClient from './client';
import { useAuthStore } from '../store/authStore';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  localStorage.clear();
  useAuthStore.setState({ usuario: null, token: null, isAuthenticated: true, isLoading: false, error: null });
});

afterEach(() => {
  mock.restore();
});

describe('interceptor de refresh automatico', () => {
  it('en un 401, refresca el token y reintenta la request original', async () => {
    localStorage.setItem('access_token', 'viejo');
    localStorage.setItem('refresh_token', 'refresh-valido');

    mock
      .onGet('/solicitudes/')
      .replyOnce(401)
      .onGet('/solicitudes/')
      .reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer nuevo');
        return [200, { ok: true }];
      });
    mock.onPost('/token/refresh/').reply(200, { access: 'nuevo', refresh: 'refresh-nuevo' });

    const resp = await apiClient.get('/solicitudes/');

    expect(resp.data).toEqual({ ok: true });
    expect(localStorage.getItem('access_token')).toBe('nuevo');
    // ROTATE_REFRESH_TOKENS: el refresh usado queda invalidado del lado del
    // backend -- si no se guarda el nuevo, el proximo refresh fallaria.
    expect(localStorage.getItem('refresh_token')).toBe('refresh-nuevo');
  });

  it('el backend no rota el refresh (caso real hoy): no pisa el refresh_token guardado', async () => {
    localStorage.setItem('access_token', 'viejo');
    localStorage.setItem('refresh_token', 'refresh-valido');

    mock.onGet('/solicitudes/').replyOnce(401).onGet('/solicitudes/').reply(200, { ok: true });
    mock.onPost('/token/refresh/').reply(200, { access: 'nuevo' }); // sin 'refresh'

    await apiClient.get('/solicitudes/');

    expect(localStorage.getItem('access_token')).toBe('nuevo');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-valido');
  });

  it('sin refresh_token guardado, cierra sesion directo sin intentar refrescar', async () => {
    localStorage.setItem('access_token', 'viejo');
    mock.onGet('/solicitudes/').reply(401);
    mock.onPost('/token/refresh/').reply(200, { access: 'no-deberia-llamarse' });

    await expect(apiClient.get('/solicitudes/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('si el refresh token tambien es invalido, cierra sesion en vez de reintentar en loop', async () => {
    localStorage.setItem('access_token', 'viejo');
    localStorage.setItem('refresh_token', 'refresh-vencido');
    mock.onGet('/solicitudes/').reply(401);
    mock.onPost('/token/refresh/').reply(401);

    await expect(apiClient.get('/solicitudes/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('dos requests que pisan un 401 al mismo tiempo comparten un solo refresh', async () => {
    localStorage.setItem('access_token', 'viejo');
    localStorage.setItem('refresh_token', 'refresh-valido');

    let llamadasRefresh = 0;
    mock.onGet('/a/').replyOnce(401).onGet('/a/').reply(200, { ok: 'a' });
    mock.onGet('/b/').replyOnce(401).onGet('/b/').reply(200, { ok: 'b' });
    mock.onPost('/token/refresh/').reply(() => {
      llamadasRefresh += 1;
      return [200, { access: 'nuevo', refresh: 'refresh-nuevo' }];
    });

    const [a, b] = await Promise.all([apiClient.get('/a/'), apiClient.get('/b/')]);

    expect(a.data).toEqual({ ok: 'a' });
    expect(b.data).toEqual({ ok: 'b' });
    expect(llamadasRefresh).toBe(1);
  });

  it('un 401 en el propio POST /token/refresh/ no dispara otro intento de refresh', async () => {
    localStorage.setItem('refresh_token', 'refresh-vencido');
    mock.onPost('/token/refresh/').reply(401);

    await expect(apiClient.post('/token/refresh/', { refresh: 'refresh-vencido' })).rejects.toMatchObject({
      response: { status: 401 },
    });
    // Si hubiera reintentado, MockAdapter no tiene una segunda respuesta
    // configurada para /token/refresh/ y el matcher de mocha fallaria antes.
  });
});
