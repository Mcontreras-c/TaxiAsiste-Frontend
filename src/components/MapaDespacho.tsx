import { useEffect, useRef, useState } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import type { Movil } from '../types';

export interface PuntoRuta {
  lat: number;
  lng: number;
  label: string;
}

export interface RutaGeoJSON {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat], formato GeoJSON estandar (OSRM/Directions)
}

const COLOR_ESTADO: Record<string, string> = {
  DISPONIBLE: '#16a34a',   // verde
  EN_SERVICIO: '#2563eb',  // azul — conductor asignado, en camino a buscar al pasajero
  EN_VIAJE: '#9333ea',     // morado — pasajero a bordo, viaje en curso
  BLOQUEADO: '#dc2626',    // rojo
  INACTIVO: '#9ca3af',     // gris
};

const ETIQUETA_ESTADO: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_SERVICIO: 'En servicio',
  EN_VIAJE: 'En viaje',
  BLOQUEADO: 'Bloqueado',
  INACTIVO: 'Inactivo',
};

// Icono de auto vista-superior en SVG, coloreado por estado y rotado segun heading.
// La rotacion queda "horneada" dentro del propio SVG (transform en el <g>), asi
// Google Maps solo necesita mostrar una imagen estatica por marcador — no hace
// falta ninguna API de rotacion de iconos.
function iconoVehiculoUrl(estado: string, heading: number | null | undefined) {
  const color = COLOR_ESTADO[estado] ?? COLOR_ESTADO.INACTIVO;
  const rotacion = heading ?? 0;
  const svg = `
    <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
      <circle cx="19" cy="19" r="18" fill="${color}" fill-opacity="0.16"/>
      <g transform="rotate(${rotacion} 19 19)">
        <ellipse cx="19" cy="30.5" rx="3.6" ry="1.6" fill="#000" fill-opacity="0.18"/>
        <path d="M19 6.2
                 C13.6 6.2 11 9 10.6 13.5
                 L9.8 24.5
                 C9.6 27.6 11.6 29.6 14.4 29.9
                 L14.4 27.4 C14.4 26.6 15 26 15.8 26
                 L22.2 26 C23 26 23.6 26.6 23.6 27.4
                 L23.6 29.9
                 C26.4 29.6 28.4 27.6 28.2 24.5
                 L27.4 13.5
                 C27 9 24.4 6.2 19 6.2 Z"
              fill="${color}" stroke="white" stroke-width="1.4"/>
        <path d="M13.2 13.8 C13.6 11 15.2 9.2 19 9.2 C22.8 9.2 24.4 11 24.8 13.8
                 C25 15.3 24 16 22.6 16 L15.4 16 C14 16 13 15.3 13.2 13.8 Z"
              fill="white" fill-opacity="0.92"/>
        <rect x="9.6" y="17.4" width="2.6" height="5.2" rx="1.2" fill="white" fill-opacity="0.85"/>
        <rect x="25.8" y="17.4" width="2.6" height="5.2" rx="1.2" fill="white" fill-opacity="0.85"/>
        <circle cx="15" cy="9.6" r="1.3" fill="#fff7d6"/>
        <circle cx="23" cy="9.6" r="1.3" fill="#fff7d6"/>
        <rect x="12.5" y="27" width="4" height="1.6" rx="0.8" fill="#7f1d1d"/>
        <rect x="21.5" y="27" width="4" height="1.6" rx="0.8" fill="#7f1d1d"/>
      </g>
      <circle cx="19" cy="19" r="18" fill="none" stroke="white" stroke-width="1.2" stroke-opacity="0.6"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function iconoPuntoUrl(color: string) {
  const svg = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" fill="${color}" stroke="white" stroke-width="2.4"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Centro por defecto: Santiago de Chile. Ajustar a la comuna real del sindicato.
const CENTRO_DEFECTO = { lat: -33.4489, lng: -70.6693 };

// Estilo "night mode" -- oculta POIs/labels secundarios (compiten con los
// marcadores) y pinta el resto en tonos azul-grisaceo oscuro, para el panel
// tipo "centro de comando" de Solicitudes.
const ESTILO_MAPA_OSCURO: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f1729' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1729' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c8aa5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1c2b45' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22314f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c6c8a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3e63' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#26375a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#141e33' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1220' }] },
];

const LIBRARIES: ('places')[] = [];

interface MovilConUbicacion extends Movil {
  lat: number;
  lng: number;
  heading?: number | null;
}

interface MapaDespachoProps {
  moviles: MovilConUbicacion[];
  altura?: string;
  /** Origen/destino de la solicitud EN_CURSO seleccionada, ya geocodificados. */
  origenDestino?: { origen: PuntoRuta; destino: PuntoRuta } | null;
  /** Ruta (GeoJSON LineString, coordenadas [lng, lat]) entre origen y destino. */
  ruta?: RutaGeoJSON | null;
  /** Estilo "night mode" + oculta el legend interno (la pagina renderiza el suyo). */
  oscuro?: boolean;
  /** Rutas alternativas del cotizador: la activa se pinta fuerte, las demas tenues (clic para elegir). */
  rutasAlternativas?: RutaGeoJSON[];
  rutaActiva?: number;
  onSeleccionarRuta?: (indice: number) => void;
}

export default function MapaDespacho({ moviles, altura = '500px', origenDestino, ruta, oscuro = false, rutasAlternativas, rutaActiva = 0, onSeleccionarRuta }: MapaDespachoProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-taxiasiste',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [activo, setActivo] = useState<number | 'origen' | 'destino' | null>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);

  // Al cotizar, encuadra el mapa para que se vean todas las rutas.
  useEffect(() => {
    if (!rutasAlternativas?.length || !mapaRef.current) return;
    const limites = new google.maps.LatLngBounds();
    rutasAlternativas.forEach(r => r.coordinates.forEach(([lng, lat]) => limites.extend({ lat, lng })));
    mapaRef.current.fitBounds(limites, 80);
  }, [rutasAlternativas]);

  // Google Maps usa [lat, lng]; GeoJSON/Directions entrega [lng, lat] — hay que invertir.
  const posicionesRuta = ruta
    ? ruta.coordinates.map(([lng, lat]) => ({ lat, lng }))
    : [];

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No se pudo cargar Google Maps. Revisa que la clave de API (VITE_GOOGLE_MAPS_API_KEY) esté configurada.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-gray-200 flex items-center justify-center text-sm text-gray-400" style={{ height: altura }}>
        Cargando mapa...
      </div>
    );
  }

  return (
    <div
      className={oscuro ? 'relative isolate overflow-hidden' : 'relative isolate rounded-xl overflow-hidden border border-gray-200 shadow-sm'}
      style={{ height: '100%' }}
    >
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: altura }}
        center={CENTRO_DEFECTO}
        zoom={13}
        onLoad={(m) => { mapaRef.current = m; }}
        onUnmount={() => { mapaRef.current = null; }}
        options={{
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          cameraControl: false,          styles: oscuro ? ESTILO_MAPA_OSCURO : undefined,
        }}
      >
        {moviles.map((m) => (
          <MarkerF
            key={m.id_movil}
            position={{ lat: m.lat, lng: m.lng }}
            icon={{
              url: iconoVehiculoUrl(m.estado_operativo, m.heading),
              scaledSize: new google.maps.Size(38, 38),
              anchor: new google.maps.Point(19, 19),
            }}
            onClick={() => setActivo(m.id_movil)}
          >
            {activo === m.id_movil && (
              <InfoWindowF onCloseClick={() => setActivo(null)}>
                <div className="text-sm min-w-[140px]">
                  <p className="font-semibold text-gray-800">{m.patente}</p>
                  <p className="text-gray-500">{m.socio_nombre}</p>
                  <span
                    className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: COLOR_ESTADO[m.estado_operativo] ?? COLOR_ESTADO.INACTIVO }}
                  >
                    {ETIQUETA_ESTADO[m.estado_operativo] ?? m.estado_operativo}
                  </span>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        ))}

        {posicionesRuta.length > 0 && (
          <PolylineF path={posicionesRuta} options={{ strokeColor: '#7e22ce', strokeWeight: 4, strokeOpacity: 0.75 }} />
        )}

        {rutasAlternativas?.map((r, i) => i === rutaActiva ? null : (
          <PolylineF
            key={`alt-${i}`}
            path={r.coordinates.map(([lng, lat]) => ({ lat, lng }))}
            options={{ strokeColor: '#94a3b8', strokeWeight: 5, strokeOpacity: 0.7, clickable: true }}
            onClick={() => onSeleccionarRuta?.(i)}
          />
        ))}
        {rutasAlternativas?.[rutaActiva] && (
          <PolylineF
            path={rutasAlternativas[rutaActiva].coordinates.map(([lng, lat]) => ({ lat, lng }))}
            options={{ strokeColor: '#facc15', strokeWeight: 6, strokeOpacity: 0.95, zIndex: 5 }}
          />
        )}

        {origenDestino && (
          <>
            <MarkerF
              position={{ lat: origenDestino.origen.lat, lng: origenDestino.origen.lng }}
              icon={{ url: iconoPuntoUrl('#16a34a'), scaledSize: new google.maps.Size(18, 18), anchor: new google.maps.Point(9, 9) }}
              onClick={() => setActivo('origen')}
            >
              {activo === 'origen' && (
                <InfoWindowF onCloseClick={() => setActivo(null)}>
                  <span className="text-sm">Origen: {origenDestino.origen.label}</span>
                </InfoWindowF>
              )}
            </MarkerF>
            <MarkerF
              position={{ lat: origenDestino.destino.lat, lng: origenDestino.destino.lng }}
              icon={{ url: iconoPuntoUrl('#c2410c'), scaledSize: new google.maps.Size(18, 18), anchor: new google.maps.Point(9, 9) }}
              onClick={() => setActivo('destino')}
            >
              {activo === 'destino' && (
                <InfoWindowF onCloseClick={() => setActivo(null)}>
                  <span className="text-sm">Destino: {origenDestino.destino.label}</span>
                </InfoWindowF>
              )}
            </MarkerF>
          </>
        )}
      </GoogleMap>

      {/* Leyenda -- en modo oscuro la pagina renderiza su propia leyenda flotante
          (esta se superpondria con la fila de solicitudes que tambien va abajo). */}
      {!oscuro && (
        <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
          {Object.entries(ETIQUETA_ESTADO).map(([estado, etiqueta]) => (
            <div key={estado} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: COLOR_ESTADO[estado] }}
              />
              <span className="text-gray-600">{etiqueta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
