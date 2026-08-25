import { beforeEach, describe, expect, it } from 'vitest';
import { useConnectionStore } from './connectionStore';

function reset() {
  useConnectionStore.setState({ fallosConsecutivos: 0, estado: 'ok' });
}

beforeEach(reset);

describe('useConnectionStore', () => {
  it('arranca en estado ok', () => {
    expect(useConnectionStore.getState().estado).toBe('ok');
    expect(useConnectionStore.getState().fallosConsecutivos).toBe(0);
  });

  it('se mantiene en ok con 1 o 2 fallos consecutivos', () => {
    const { reportarFallo } = useConnectionStore.getState();
    reportarFallo();
    reportarFallo();

    expect(useConnectionStore.getState().estado).toBe('ok');
    expect(useConnectionStore.getState().fallosConsecutivos).toBe(2);
  });

  it('pasa a inestable al llegar al 3er fallo consecutivo', () => {
    const { reportarFallo } = useConnectionStore.getState();
    reportarFallo();
    reportarFallo();
    reportarFallo();

    expect(useConnectionStore.getState().estado).toBe('inestable');
  });

  it('un exito resetea el contador y vuelve a ok', () => {
    const { reportarFallo, reportarExito } = useConnectionStore.getState();
    reportarFallo();
    reportarFallo();
    reportarFallo();

    reportarExito();

    expect(useConnectionStore.getState().estado).toBe('ok');
    expect(useConnectionStore.getState().fallosConsecutivos).toBe(0);
  });

  it('un exito aislado (sin fallos previos) no cambia nada', () => {
    useConnectionStore.getState().reportarExito();

    expect(useConnectionStore.getState()).toMatchObject({ estado: 'ok', fallosConsecutivos: 0 });
  });
});
