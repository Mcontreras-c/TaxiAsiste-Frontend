import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { obtenerPermiso, olvidarPermiso, permisoVigente, registrarSolicitante } from './confirmacion';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
const post = vi.mocked(axios.post);

afterEach(() => {
  olvidarPermiso();
  registrarSolicitante(null);
  post.mockReset();
});

describe('confirmacion con contraseña', () => {
  it('canjea la clave por un permiso y lo reutiliza mientras vale', async () => {
    const pedir = vi.fn().mockResolvedValue('secreta');
    registrarSolicitante(pedir);
    post.mockResolvedValue({ data: { token: 'tok', expira_en: 120 } });

    expect(await obtenerPermiso()).toBe('tok');
    expect(await obtenerPermiso()).toBe('tok');

    expect(pedir).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(permisoVigente()).toBe('tok');
  });

  it('si la persona cancela, no hay permiso', async () => {
    registrarSolicitante(vi.fn().mockResolvedValue(null));
    expect(await obtenerPermiso()).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('con clave incorrecta vuelve a pedirla mostrando el error del servidor', async () => {
    const pedir = vi.fn().mockResolvedValueOnce('mala').mockResolvedValueOnce('buena');
    registrarSolicitante(pedir);
    post
      .mockRejectedValueOnce({ response: { data: { detail: 'Contraseña incorrecta.' } } })
      .mockResolvedValueOnce({ data: { token: 'tok2', expira_en: 120 } });

    expect(await obtenerPermiso()).toBe('tok2');
    expect(pedir).toHaveBeenNthCalledWith(2, 'Contraseña incorrecta.');
  });

  it('varias acciones a la vez comparten un solo dialogo', async () => {
    const pedir = vi.fn().mockResolvedValue('secreta');
    registrarSolicitante(pedir);
    post.mockResolvedValue({ data: { token: 'tok', expira_en: 120 } });

    const [a, b] = await Promise.all([obtenerPermiso(), obtenerPermiso()]);

    expect(a).toBe('tok');
    expect(b).toBe('tok');
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('sin dialogo registrado no hay permiso', async () => {
    expect(await obtenerPermiso()).toBeNull();
  });
});
