import { useEffect, useState } from 'react';
import { getUbicaciones } from '../api/moviles';

export interface UbicacionMovil {
  id_movil: number;
  lat: number;
  lng: number;
  heading: number | null;
  velocidad_kmh: number | null;
}

const INTERVALO_MS = 4000;

// Polling REST puro (sin WebSockets — ver decision de arquitectura del
// equipo): consulta GET /api/ubicaciones/ cada INTERVALO_MS y mantiene un
// mapa {id_movil -> ultima posicion conocida}. El backend ya filtra ahi
// solo los moviles que reportaron GPS en los ultimos 45s (SEGUNDOS_ONLINE).
export function useUbicacionesMoviles() {
  const [ubicaciones, setUbicaciones] = useState<Record<number, UbicacionMovil>>({});

  useEffect(() => {
    let cancelado = false;

    async function consultar() {
      try {
        const datos = await getUbicaciones();
        if (cancelado) return;
        const mapa: Record<number, UbicacionMovil> = {};
        for (const u of datos) {
          mapa[u.movil] = {
            id_movil: u.movil,
            lat: u.lat,
            lng: u.lng,
            heading: u.heading,
            velocidad_kmh: u.velocidad_kmh,
          };
        }
        setUbicaciones(mapa);
      } catch {
        // Si falla un ciclo de polling (red inestable), se reintenta en el
        // siguiente intervalo sin limpiar las posiciones ya conocidas.
      }
    }

    consultar();
    const id = setInterval(consultar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  return ubicaciones;
}
