import apiClient from './client';

export interface GeocodResultado {
  lat: number;
  lng: number;
  direccion_formateada: string;
}

export interface RutaResultado {
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
  distancia_m: number;
  duracion_s: number;
}

export const geocodificar = (direccion: string) =>
  apiClient.get<GeocodResultado>('/geocodificar/', { params: { direccion } }).then(r => r.data);

export const obtenerRuta = (
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number },
) =>
  apiClient.get<RutaResultado>('/ruta/', {
    params: {
      origen_lat: origen.lat, origen_lng: origen.lng,
      destino_lat: destino.lat, destino_lng: destino.lng,
    },
  }).then(r => r.data);

export interface TarifaEstimada {
  distancia_m: number;
  duracion_s: number;
  tarifa_estimada: number;
  bajada_de_bandera: number;
}

// Traslado siempre al mismo hospital (destino fijo de TaxiAsiste) -- por eso
// solo pide el origen, a diferencia de obtenerRuta.
export const estimarTarifa = (origen: { lat: number; lng: number }) =>
  apiClient.get<TarifaEstimada>('/estimar_tarifa/', {
    params: { origen_lat: origen.lat, origen_lng: origen.lng },
  }).then(r => r.data);

export interface RutaCotizada {
  resumen: string;
  distancia_m: number;
  duracion_s: number;
  tarifa_estimada: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
}

export interface PuntoCotizado {
  lat: number;
  lng: number;
  direccion: string | null;
}

export interface Cotizacion {
  origen: PuntoCotizado;
  destino: PuntoCotizado;
  rutas: RutaCotizada[];
  bajada_de_bandera: number;
}

export type OrigenCotizacion =
  | { tipo: 'hospital' }
  | { tipo: 'gps'; lat: number; lng: number }
  | { tipo: 'texto'; texto: string };

// Sin origen explicito el backend parte desde el hospital.
export const cotizarTarifa = (origen: OrigenCotizacion, destinoTexto: string) =>
  apiClient.get<Cotizacion>('/cotizar_tarifa/', {
    params: {
      destino_texto: destinoTexto,
      ...(origen.tipo === 'gps' ? { origen_lat: origen.lat, origen_lng: origen.lng } : {}),
      ...(origen.tipo === 'texto' ? { origen_texto: origen.texto } : {}),
    },
  }).then(r => r.data);
