import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Movil } from '../types';

const COLOR_ESTADO: Record<string, string> = {
  DISPONIBLE: '#16a34a',   // verde
  EN_SERVICIO: '#2563eb',  // azul
  BLOQUEADO: '#dc2626',    // rojo
  INACTIVO: '#9ca3af',     // gris
};

const ETIQUETA_ESTADO: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_SERVICIO: 'En servicio',
  BLOQUEADO: 'Bloqueado',
  INACTIVO: 'Inactivo',
};

// Icono de auto vista-superior en SVG, coloreado por estado y rotado segun heading.
// Se genera como divIcon (no marker.png) para poder rotar solo el vehiculo sin
// afectar el punto de anclaje del marcador.
function iconoVehiculo(estado: string, heading: number | null | undefined) {
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
  return L.divIcon({
    html: svg,
    className: 'marcador-vehiculo',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

// Centro por defecto: Santiago de Chile. Ajustar a la comuna real del sindicato.
const CENTRO_DEFECTO: [number, number] = [-33.4489, -70.6693];

interface MovilConUbicacion extends Movil {
  lat: number;
  lng: number;
  heading?: number | null;
}

interface MapaDespachoProps {
  moviles: MovilConUbicacion[];
  altura?: string;
}

export default function MapaDespacho({ moviles, altura = '500px' }: MapaDespachoProps) {
  return (
    // "isolate" crea un contexto de apilamiento propio: Leaflet usa z-index
    // internos altos (hasta 1000 para controles) que de otro modo se escapan
    // por encima de modales con z-index menor en el resto de la pagina.
    <div className="relative isolate rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={CENTRO_DEFECTO}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{ width: '100%', height: altura }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {moviles.map((m) => (
          <Marker key={m.id_movil} position={[m.lat, m.lng]} icon={iconoVehiculo(m.estado_operativo, m.heading)}>
            <Popup>
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
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leyenda */}
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
    </div>
  );
}
