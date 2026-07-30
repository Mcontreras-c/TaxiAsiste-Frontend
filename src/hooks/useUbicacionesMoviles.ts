import { useEffect, useRef, useState } from 'react';

export interface UbicacionMovil {
  id_movil: number;
  patente: string;
  estado_operativo: string;
  lat: number;
  lng: number;
  heading: number | null;
  velocidad_kmh: number | null;
}

function wsUrl(): string {
  const httpBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
  const host = httpBase.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
  return `${host}/ws/despacho/`;
}

// Mantiene un mapa {id_movil -> ultima posicion} actualizado en tiempo real
// via WebSocket (ver taxiasiste/moviles/consumers.py del backend).
export function useUbicacionesMoviles() {
  const [ubicaciones, setUbicaciones] = useState<Record<number, UbicacionMovil>>({});
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cerrado = false;
    let socket: WebSocket;

    function conectar() {
      socket = new WebSocket(wsUrl());
      socketRef.current = socket;

      socket.onmessage = (event) => {
        const data: UbicacionMovil = JSON.parse(event.data);
        setUbicaciones((prev) => ({ ...prev, [data.id_movil]: data }));
      };

      socket.onclose = () => {
        if (!cerrado) setTimeout(conectar, 3000);
      };
    }

    conectar();
    return () => {
      cerrado = true;
      socketRef.current?.close();
    };
  }, []);

  return ubicaciones;
}
