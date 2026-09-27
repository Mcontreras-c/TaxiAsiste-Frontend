import { useEffect, useRef } from 'react';

const EVENTOS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Llama a onCerrar tras `minutos` sin actividad del usuario (mouse, teclado, toque).
 * Sirve para no dejar abierta una sesion de administracion en un equipo sin vigilar.
 */
export function useCierreInactividad(activo: boolean, minutos: number, onCerrar: () => void) {
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    if (!activo) return;
    const iniciar = () => setTimeout(() => cerrar.current(), minutos * 60_000);
    let timer = iniciar();
    const reiniciar = () => {
      clearTimeout(timer);
      timer = iniciar();
    };
    EVENTOS.forEach(e => window.addEventListener(e, reiniciar, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTOS.forEach(e => window.removeEventListener(e, reiniciar));
    };
  }, [activo, minutos]);
}
