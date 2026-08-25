import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUbicacionesMoviles } from './useUbicacionesMoviles';
import { getUbicaciones } from '../api/moviles';
import { useConnectionStore } from '../store/connectionStore';

vi.mock('../api/moviles', () => ({ getUbicaciones: vi.fn() }));

const getUbicacionesMock = vi.mocked(getUbicaciones);

function ubicacion(movil: number, lat = -33.45) {
  return {
    id_ubicacion: movil,
    movil,
    patente: `AA${movil}`,
    socio_nombre: 'Juan Perez',
    lat,
    lng: -70.66,
    heading: 90,
    velocidad_kmh: 20,
    actualizado_en: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  getUbicacionesMock.mockReset();
  useConnectionStore.setState({ fallosConsecutivos: 0, estado: 'ok' });
});

afterEach(() => {
  vi.useRealTimers();
});

// Con fake timers, waitFor() no sirve (su polling interno depende de
// timers reales) -- se flushean microtareas a mano avanzando el reloj
// falso 0ms, que alcanza para resolver la promesa ya pendiente de consultar().
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('useUbicacionesMoviles', () => {
  it('consulta al montar y arma el mapa {id_movil -> ultima posicion}', async () => {
    getUbicacionesMock.mockResolvedValue([ubicacion(1), ubicacion(2)]);

    const { result } = renderHook(() => useUbicacionesMoviles());
    await flush();

    expect(result.current).toEqual({
      1: { id_movil: 1, lat: -33.45, lng: -70.66, heading: 90, velocidad_kmh: 20 },
      2: { id_movil: 2, lat: -33.45, lng: -70.66, heading: 90, velocidad_kmh: 20 },
    });
    expect(getUbicacionesMock).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar cada 4 segundos', async () => {
    getUbicacionesMock.mockResolvedValue([ubicacion(1)]);
    renderHook(() => useUbicacionesMoviles());
    await flush();
    expect(getUbicacionesMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(getUbicacionesMock).toHaveBeenCalledTimes(2);
  });

  it('reporta exito a connectionStore en cada ciclo bueno', async () => {
    getUbicacionesMock.mockResolvedValue([ubicacion(1)]);
    useConnectionStore.setState({ fallosConsecutivos: 2, estado: 'ok' });

    renderHook(() => useUbicacionesMoviles());
    await flush();

    expect(useConnectionStore.getState().fallosConsecutivos).toBe(0);
  });

  it('si falla un ciclo, mantiene las posiciones ya conocidas y reporta el fallo', async () => {
    getUbicacionesMock.mockResolvedValueOnce([ubicacion(1)]);
    getUbicacionesMock.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useUbicacionesMoviles());
    await flush();
    expect(result.current[1]).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(result.current[1]).toBeDefined(); // no se borro por el fallo
    expect(useConnectionStore.getState().fallosConsecutivos).toBe(1);
  });
});
