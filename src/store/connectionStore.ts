import { create } from 'zustand';

// Cuantos fallos consecutivos de polling (de cualquier fuente: solicitudes,
// moviles, ubicaciones) hacen falta antes de mostrar el aviso — evita que un
// unico timeout aislado dispare el badge por una falla puntual de red.
const UMBRAL_FALLOS = 3;

interface ConnectionState {
  fallosConsecutivos: number;
  estado: 'ok' | 'inestable';
  reportarExito: () => void;
  reportarFallo: () => void;
}

// Store compartido: cualquier poller de la app (solicitudes/moviles/fila,
// ubicaciones GPS) reporta aqui sus exitos/fallos, y la barra superior
// (Layout.tsx) muestra un badge discreto cuando la conexion se ve inestable.
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  fallosConsecutivos: 0,
  estado: 'ok',

  reportarExito: () => {
    if (get().fallosConsecutivos !== 0 || get().estado !== 'ok') {
      set({ fallosConsecutivos: 0, estado: 'ok' });
    }
  },

  reportarFallo: () => {
    const fallos = get().fallosConsecutivos + 1;
    set({
      fallosConsecutivos: fallos,
      estado: fallos >= UMBRAL_FALLOS ? 'inestable' : get().estado,
    });
  },
}));
