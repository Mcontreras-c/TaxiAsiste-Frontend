import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress,
  Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, InputAdornment, Avatar, ToggleButton, ToggleButtonGroup, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  PhoneCall, Plus, RefreshCw, X, ChevronRight, ChevronLeft,
  Clock, Car, XCircle, History, PhoneMissed, MapPin, Navigation,
  User, MessageSquare, Cross, Users, Calculator, CalendarClock, ShieldAlert,
} from 'lucide-react';
import {
  getResumenCentral, getSolicitudes, createSolicitud,
  cambiarEstado, buscarPasajeroPorRut, createPasajero, actualizarTelefonoPasajero, levantarBloqueoPasajero, type ResumenCentral,
} from '../api/solicitudes';
import { getMoviles, getFilaBase } from '../api/moviles';
import { geocodificar, obtenerRuta, estimarTarifa, type TarifaEstimada } from '../api/mapas';
import MapaDespacho from '../components/MapaDespacho';
import type { PuntoRuta, RutaGeoJSON } from '../components/MapaDespacho';
import { useUbicacionesMoviles } from '../hooks/useUbicacionesMoviles';
import { useConnectionStore } from '../store/connectionStore';
import type { Solicitud, EstadoSolicitud, Movil, Pasajero, FilaBase } from '../types';
import { colors } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';
import ClimaWidget from '../components/ClimaWidget';
import CotizadorTarifa, { type EstadoCotizacion } from '../components/CotizadorTarifa';
import RegistroIncumplimientos from '../components/RegistroIncumplimientos';
import type { Cotizacion } from '../api/mapas';
import { getReservas, crearReserva, cancelarReserva, liberarReserva, type Reserva } from '../api/reservas';
import { useAuthStore } from '../store/authStore';

import { formatoHora, formatoFechaHora } from '../utils/formatoFecha';
const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDIENTE:  { bg: '#fdece2', fg: '#c2410c' },
  ASIGNADO:   { bg: '#e8ecf9', fg: '#3355a8' },
  EN_CURSO:   { bg: '#f3e8fd', fg: '#7e22ce' },
  COMPLETADO: { bg: '#e4f3ec', fg: '#2f7d5b' },
  CANCELADO:  { bg: '#f1efe9', fg: '#8a8071' },
};

const CANALES = ['TELEFONO', 'PRESENCIAL'] as const;

type Tone = { fg: string; bg: string; grad: string };

const TONES: Record<string, Tone> = {
  blue:   { fg: '#3355a8', bg: '#e8ecf9', grad: 'linear-gradient(135deg,#7d95d8,#3355a8)' },
  violet: { fg: '#7e22ce', bg: '#f3e8fd', grad: 'linear-gradient(135deg,#c084f5,#7e22ce)' },
  orange: { fg: '#c2410c', bg: '#fdece2', grad: 'linear-gradient(135deg,#f5a06b,#c2410c)' },
};

// Vidrio oscuro flotante sobre el mapa -- usado por HeroStat y los paneles
// de fila virtual / actividad reciente dentro del panel "centro de comando".
const glassSx = {
  bgcolor: 'rgba(15,23,42,.72)',
  border: '1px solid rgba(255,255,255,.1)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 8px 24px rgba(0,0,0,.35)',
};

function HeroStat({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: Tone }) {
  return (
    <Card sx={{ ...glassSx, borderRadius: 3, position: 'relative', overflow: 'hidden', flex: '0 0 auto', pointerEvents: 'auto' }}>
      <CardContent sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.25, p: '10px 14px !important' }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: 2.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tone.grad, color: '#fff', boxShadow: `0 4px 12px ${tone.fg}40`,
        }}>
          {icon}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
          <Typography sx={{ fontSize: 19, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', lineHeight: 1, color: '#fff' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// TaxiAsiste solo hace traslados a este hospital -- el backend fuerza este
// mismo valor en Solicitud.save() sin importar lo que se envie, asi que el
// formulario ni siquiera pide destino: solo confirma que siempre es este.
const DESTINO_HOSPITAL = 'Hospital Félix Bulnes, Cerro Navia';

interface FormData {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  origen: string;
  canal_entrada: string;
  observaciones: string;
  pasajero_id: number | null;
}

const EMPTY_FORM: FormData = {
  rut: '', nombre: '', apellido: '', telefono: '', origen: '', canal_entrada: 'TELEFONO',
  observaciones: '', pasajero_id: null,
};

// Reserva: fecha + hora en 24 h con selectores propios (un <input type="datetime-local">
// mostraria am/pm segun el idioma del navegador).
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const aFechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Propuesta inicial: dentro de 2 horas, redondeada a los 5 minutos.
function reservaInicial() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return { fecha: aFechaLocal(d), hora: String(d.getHours()).padStart(2, '0'), min: String(d.getMinutes()).padStart(2, '0') };
}

interface AccionModal {
  solicitud: Solicitud;
  tipo: 'cambiar' | 'cancelar' | 'sin_contacto';
}

function EstadoChip({ estado }: { estado: string }) {
  const s = ESTADO_STYLE[estado] ?? ESTADO_STYLE.CANCELADO;
  return (
    <Chip
      label={estado}
      size="small"
      sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700, fontSize: 10.5 }}
    />
  );
}

function ColumnHeader({ icon, bg = 'rgba(255,255,255,.1)', title, count }: { icon: React.ReactNode; bg?: string; title: string; count: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: 1.75, flexShrink: 0, bgcolor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{title}</Typography>
      <Box sx={{ ml: 'auto' }}>{count}</Box>
    </Box>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)', textAlign: 'center', py: 2 }}>
      {text}
    </Typography>
  );
}

function SolicitudCard({
  sol, onAccion, onVerRuta, cargandoRuta,
}: {
  sol: Solicitud;
  onAccion: (a: AccionModal) => void;
  onVerRuta?: (sol: Solicitud) => void;
  cargandoRuta?: boolean;
}) {
  return (
    <Card sx={{ ...glassSx, borderRadius: 3, flex: '0 0 220px', scrollSnapAlign: 'start' }}>
      <CardContent sx={{ p: '9px 11px !important', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 10.5, color: 'rgba(255,255,255,.5)' }}>
            {sol.folio}
          </Typography>
          <EstadoChip estado={sol.estado} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <MapPin size={12} color="rgba(255,255,255,.45)" style={{ flexShrink: 0 }} />
          <Box sx={{ fontWeight: 600, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sol.origen}
          </Box>
        </Box>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start',
          bgcolor: 'rgba(192,57,43,.22)', color: '#f5a3a3', borderRadius: 10, px: 1, py: 0.2,
        }}>
          <Cross size={10} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>Hospital Félix Bulnes</Typography>
        </Box>
        {sol.movil_patente && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Car size={11} color="rgba(255,255,255,.45)" />
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>
              Móvil: <strong>{sol.movil_patente}</strong>
            </Typography>
          </Box>
        )}
        {sol.pasajero_nombre && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.15 }}>
            <InitialsAvatar nombre={sol.pasajero_nombre} size={19} />
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>{sol.pasajero_nombre}</Typography>
          </Box>
        )}
        <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)' }}>
          {formatoHora(sol.fecha_hora)}
        </Typography>
        {sol.estado !== 'COMPLETADO' && sol.estado !== 'CANCELADO' && (
          <Box sx={{ display: 'flex', gap: 0.5, pt: 0.25 }}>
            <Button
              size="small"
              onClick={() => onAccion({ solicitud: sol, tipo: 'cambiar' })}
              sx={{
                flex: 1, fontSize: 11, py: 0.5, color: colors.ink,
                background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
                '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
              }}
            >
              Avanzar
            </Button>
            {sol.estado === 'EN_CURSO' && onVerRuta && (
              <IconButton size="small" title="Ver ruta en el mapa" onClick={() => onVerRuta(sol)} disabled={cargandoRuta} sx={{ color: '#7e22ce' }}>
                <Navigation size={16} />
              </IconButton>
            )}
            <IconButton size="small" title="Sin contacto" onClick={() => onAccion({ solicitud: sol, tipo: 'sin_contacto' })} sx={{ color: '#c2410c' }}>
              <PhoneMissed size={16} />
            </IconButton>
            <IconButton size="small" title="Cancelar" onClick={() => onAccion({ solicitud: sol, tipo: 'cancelar' })} sx={{ color: '#c0392b' }}>
              <XCircle size={16} />
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ReservaCard({ reserva, onCancelar, onLiberar }: {
  reserva: Reserva; onCancelar: (r: Reserva) => void; onLiberar: (r: Reserva) => void;
}) {
  const sinConductor = reserva.estado === 'PROGRAMADA';
  const recogida = new Date(reserva.fecha_hora_recogida);
  const hoy = aFechaLocal(new Date()) === aFechaLocal(recogida);
  // La alerta la calcula el servidor: en rojo para que Central actue (asignarla por
  // telefono si nadie la tomo, o llamar al conductor que no salio).
  const urgente = reserva.alerta !== null;
  const chip = reserva.alerta === 'NO_CONFIRMADA'
    ? { label: 'NO CONFIRMÓ SALIDA', bg: '#fbe9e9', fg: '#c0392b' }
    : sinConductor
      ? { label: 'SIN CONDUCTOR', bg: urgente ? '#fbe9e9' : '#fdece2', fg: urgente ? '#c0392b' : '#c2410c' }
      : { label: reserva.estado === 'EN_CAMINO' ? 'EN CAMINO' : 'ASIGNADA', bg: '#e8ecf9', fg: '#3355a8' };

  return (
    <Card sx={{ ...glassSx, borderRadius: 3, flex: '0 0 220px', scrollSnapAlign: 'start', ...(urgente ? { borderColor: '#c0392b' } : {}) }}>
      <CardContent sx={{ p: '9px 11px !important', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 10.5, color: 'rgba(255,255,255,.5)' }}>
            {reserva.folio}
          </Typography>
          <Chip label={chip.label} size="small" sx={{ bgcolor: chip.bg, color: chip.fg, fontWeight: 700, fontSize: 10.5 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Roboto Mono, monospace', lineHeight: 1.1 }}>
            {formatoHora(reserva.fecha_hora_recogida)}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
            {hoy ? 'hoy' : 'mañana'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <MapPin size={12} color="rgba(255,255,255,.45)" style={{ flexShrink: 0 }} />
          <Box sx={{ fontWeight: 600, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reserva.origen}
          </Box>
        </Box>
        {reserva.movil_patente && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Car size={11} color="rgba(255,255,255,.45)" />
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>
              <strong>{reserva.movil_patente}</strong> · {reserva.conductor_nombre}
            </Typography>
          </Box>
        )}
        {reserva.pasajero_nombre && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <InitialsAvatar nombre={reserva.pasajero_nombre} size={19} />
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>{reserva.pasajero_nombre}</Typography>
          </Box>
        )}
        <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)' }}>
          ~${reserva.tarifa_estimada.toLocaleString('es-CL')} · sale de la base a las {formatoHora(reserva.salida_base_maxima)}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, pt: 0.25 }}>
          {reserva.movil_patente && (
            <Button size="small" onClick={() => onLiberar(reserva)} sx={{ fontSize: 11, color: '#f5a06b', minWidth: 0, px: 1 }}>
              Quitar conductor
            </Button>
          )}
          {reserva.estado !== 'EN_CAMINO' && (
            <IconButton size="small" title="Cancelar reserva" onClick={() => onCancelar(reserva)} sx={{ color: '#c0392b' }}>
              <XCircle size={16} />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Franja con scroll horizontal + flechas -- las flechas solo se muestran si
// realmente hay contenido oculto a ese lado (se recalcula en cada scroll y
// cuando cambia la cantidad de tarjetas).
function FilaHorizontal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const actualizar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    actualizar();
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(actualizar);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const desplazar = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });

  return (
    <Box sx={{ position: 'relative' }}>
      {puedeIzq && (
        <IconButton
          size="small" onClick={() => desplazar(-1)}
          sx={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 3, ...glassSx, color: '#fff', width: 26, height: 26 }}
        >
          <ChevronLeft size={15} />
        </IconButton>
      )}
      <Box
        ref={ref} onScroll={actualizar}
        sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, scrollSnapType: 'x proximity' }}
      >
        {children}
      </Box>
      {puedeDer && (
        <IconButton
          size="small" onClick={() => desplazar(1)}
          sx={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 3, ...glassSx, color: '#fff', width: 26, height: 26 }}
        >
          <ChevronRight size={15} />
        </IconButton>
      )}
    </Box>
  );
}

export default function SolicitudesCentralPage() {
  const [resumen, setResumen]       = useState<ResumenCentral | null>(null);
  const [historial, setHistorial]   = useState<Solicitud[]>([]);
  const [moviles, setMoviles]       = useState<Movil[]>([]);
  const [filaBase, setFilaBase]     = useState<FilaBase[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [accion, setAccion]         = useState<AccionModal | null>(null);
  const [movilId, setMovilId]       = useState('');
  const [buscandoRut, setBuscandoRut] = useState(false);
  const [pasajeroEncontrado, setPasajeroEncontrado] = useState<Pasajero | null>(null);

  // Reservas (viajes programados): se cargan junto con el resto; si el backend
  // aun no las tiene, la pantalla sigue funcionando sin ellas.
  const [reservas, setReservas]   = useState<Reserva[]>([]);
  const [modoReserva, setModoReserva] = useState(false);
  const [reservaFecha, setReservaFecha] = useState(reservaInicial().fecha);
  const [reservaHora, setReservaHora]   = useState(reservaInicial().hora);
  const [reservaMin, setReservaMin]     = useState(reservaInicial().min);
  const [liberando, setLiberando]       = useState<Reserva | null>(null);
  const [verIncumplimientos, setVerIncumplimientos] = useState(false);
  const [liberarIncumplio, setLiberarIncumplio] = useState(false);
  const [liberarMotivo, setLiberarMotivo] = useState('');
  const esAdmin = useAuthStore(s => s.usuario?.rol) === 'Administrador';

  // Geocoding en vivo del origen en el formulario de nueva solicitud (el
  // destino ya no se geocodifica aca: siempre es el mismo hospital).
  const [geocodOrigen, setGeocodOrigen] = useState<{ lat: number; lng: number; direccion_formateada: string } | null>(null);
  const [buscandoOrigen, setBuscandoOrigen] = useState(false);
  const [errorGeocodOrigen, setErrorGeocodOrigen] = useState<string | null>(null);

  // Tarifa estimada (taximetro) para el origen recien geocodificado -- solo
  // informativa, para que Central pueda responder "¿cuánto sale aprox?".
  const [tarifaEstimada, setTarifaEstimada] = useState<TarifaEstimada | null>(null);
  const [calculandoTarifa, setCalculandoTarifa] = useState(false);

  // Ruta trazada en el mapa principal para una solicitud EN_CURSO seleccionada.
  const [rutaSeleccionada, setRutaSeleccionada] = useState<{
    origenDestino: { origen: PuntoRuta; destino: PuntoRuta };
    ruta: RutaGeoJSON;
  } | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  // Posiciones GPS por polling (GET /api/ubicaciones/ cada 4s — ver
  // useUbicacionesMoviles). No trae estado_operativo: ese dato se refresca
  // aparte junto con el resto de "moviles" (ver refrescoSilencioso abajo).
  const ubicacionesEnVivo = useUbicacionesMoviles();

  // Solo los DISPONIBLE se ofrecen para asignar a una solicitud; el mapa en
  // cambio muestra todos los estados (para reflejar en vivo cuando un
  // conductor se desconecta y su movil pasa a INACTIVO).
  const movilesDisponibles = moviles.filter(m => m.estado_operativo === 'DISPONIBLE');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, m, f, rv] = await Promise.all([
        getResumenCentral(), getMoviles(), getFilaBase(), getReservas().catch(() => [] as Reserva[]),
      ]);
      setReservas(rv);
      setResumen(r);
      setMoviles(m);
      setFilaBase(f.sort((a, b) => a.posicion - b.posicion));
      useConnectionStore.getState().reportarExito();
    } catch {
      setError('No se pudo cargar las solicitudes.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Polling silencioso (sin spinner) de moviles/solicitudes/fila, para que
  // estado_operativo y las columnas se mantengan al dia sin recargar la
  // pagina — misma cadencia que el polling de ubicaciones (arquitectura
  // 100% REST, sin WebSockets).
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [r, m, f, rv] = await Promise.all([
        getResumenCentral(), getMoviles(), getFilaBase(), getReservas().catch(() => [] as Reserva[]),
      ]);
      setReservas(rv);
        setResumen(r);
        setMoviles(m);
        setFilaBase(f.sort((a, b) => a.posicion - b.posicion));
        useConnectionStore.getState().reportarExito();
      } catch {
        // se reintenta en el siguiente ciclo
        useConnectionStore.getState().reportarFallo();
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const loadHistorial = async () => {
    const all = await getSolicitudes();
    setHistorial(all);
    setShowHistorial(true);
  };

  const handleRutBlur = async () => {
    if (!form.rut) { setPasajeroEncontrado(null); return; }
    setBuscandoRut(true);
    try {
      const res = await buscarPasajeroPorRut(form.rut);
      if (res.length > 0) {
        setPasajeroEncontrado(res[0]);
        setForm(f => ({
          ...f, pasajero_id: res[0].id_pasajero, nombre: res[0].nombre, apellido: res[0].apellido,
          telefono: res[0].telefono ?? '',
        }));
      } else {
        setPasajeroEncontrado(null);
        setForm(f => ({ ...f, pasajero_id: null, nombre: '', apellido: '', telefono: '' }));
      }
    } finally { setBuscandoRut(false); }
  };

  const handleOrigenBlur = async () => {
    if (!form.origen) {
      setGeocodOrigen(null); setErrorGeocodOrigen(null); setTarifaEstimada(null);
      return;
    }
    setBuscandoOrigen(true); setErrorGeocodOrigen(null); setTarifaEstimada(null);
    try {
      const geocod = await geocodificar(form.origen);
      setGeocodOrigen(geocod);
      setCalculandoTarifa(true);
      try {
        setTarifaEstimada(await estimarTarifa({ lat: geocod.lat, lng: geocod.lng }));
      } catch {
        setTarifaEstimada(null);
      } finally { setCalculandoTarifa(false); }
    } catch {
      setGeocodOrigen(null);
      setErrorGeocodOrigen('No se pudo ubicar esta dirección — se registrará solo como texto.');
    } finally { setBuscandoOrigen(false); }
  };

  const handleVerRuta = async (sol: Solicitud) => {
    setCargandoRuta(true);
    try {
      const [origen, destino] = await Promise.all([geocodificar(sol.origen), geocodificar(sol.destino)]);
      const rutaCalculada = await obtenerRuta(origen, destino);
      setRutaSeleccionada({
        origenDestino: {
          origen: { lat: origen.lat, lng: origen.lng, label: sol.origen },
          destino: { lat: destino.lat, lng: destino.lng, label: sol.destino },
        },
        ruta: rutaCalculada.geometry,
      });
    } catch {
      alert('No se pudo trazar la ruta para esta solicitud (direcciones no ubicables o servicio no disponible).');
    } finally { setCargandoRuta(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origen) { setFormError('La dirección de recogida es obligatoria.'); return; }
    if (form.rut && !pasajeroEncontrado && (!form.nombre || !form.apellido)) {
      setFormError('Este RUT no está registrado — completa nombre y apellido para registrarlo.');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      let pasajeroId = form.pasajero_id;
      if (!pasajeroId && form.rut) {
        const nuevo = await createPasajero({
          rut: form.rut, nombre: form.nombre, apellido: form.apellido,
          telefono: form.telefono || null,
        });
        pasajeroId = nuevo.id_pasajero;
      } else if (pasajeroId && !pasajeroEncontrado?.telefono && form.telefono) {
        // El pasajero ya existia pero no tenia telefono registrado -- lo completamos.
        await actualizarTelefonoPasajero(pasajeroId, form.telefono);
      }
      if (modoReserva) {
        // La hora se elige en hora local; el servidor la recibe en UTC.
        const recogida = new Date(`${reservaFecha}T${reservaHora}:${reservaMin}:00`);
        if (Number.isNaN(recogida.getTime())) { setFormError('Indica la fecha y la hora de recogida.'); setSaving(false); return; }
        await crearReserva({
          origen: form.origen,
          fecha_hora_recogida: recogida.toISOString(),
          pasajero: pasajeroId ?? null,
          observaciones: form.observaciones || null,
        });
      } else {
        await createSolicitud({
          origen: form.origen,
          canal_entrada: form.canal_entrada as any,
          observaciones: form.observaciones || null,
          pasajero: pasajeroId ?? null,
        });
      }
      setForm(EMPTY_FORM); setPasajeroEncontrado(null);
      setGeocodOrigen(null);
      setErrorGeocodOrigen(null);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? (modoReserva ? 'Error al crear la reserva.' : 'Error al crear la solicitud.'));
    } finally { setSaving(false); }
  };

  const handleCancelarReserva = async (r: Reserva) => {
    const conductor = r.movil_patente ? ` El conductor ${r.movil_patente} será liberado.` : '';
    if (!window.confirm(`¿Cancelar la reserva ${r.folio} de las ${formatoHora(r.fecha_hora_recogida)}?${conductor}`)) return;
    try {
      await cancelarReserva(r.id_reserva);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? 'No se pudo cancelar la reserva.');
    }
  };

  const handleLiberar = async () => {
    if (!liberando) return;
    setSaving(true);
    try {
      await liberarReserva(liberando.id_reserva, liberarIncumplio, liberarMotivo.trim() || undefined);
      setLiberando(null); setLiberarIncumplio(false); setLiberarMotivo('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? 'No se pudo quitar el conductor de la reserva.');
    } finally { setSaving(false); }
  };

  const handleLevantarBloqueo = async () => {
    if (!pasajeroEncontrado) return;
    try {
      const p = await levantarBloqueoPasajero(pasajeroEncontrado.id_pasajero);
      setPasajeroEncontrado(p);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'No se pudo levantar el bloqueo.');
    }
  };

  const handleAccion = async () => {
    if (!accion) return;
    setSaving(true);
    try {
      if (accion.tipo === 'sin_contacto') {
        await cambiarEstado(accion.solicitud.id_solicitud, 'CANCELADO', undefined, 'SIN_CONTACTO');
      } else if (accion.tipo === 'cancelar') {
        await cambiarEstado(accion.solicitud.id_solicitud, 'CANCELADO');
      } else {
        const sig = { PENDIENTE: 'ASIGNADO', ASIGNADO: 'EN_CURSO', EN_CURSO: 'COMPLETADO' } as Record<string, EstadoSolicitud>;
        const nuevoEstado = sig[accion.solicitud.estado];
        if (!nuevoEstado) return;
        await cambiarEstado(accion.solicitud.id_solicitud, nuevoEstado,
          nuevoEstado === 'ASIGNADO' && movilId ? Number(movilId) : undefined);
      }
      setAccion(null); setMovilId('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? 'Error al cambiar estado.');
    } finally { setSaving(false); }
  };

  const SIG_ESTADO: Record<string, string> = {
    PENDIENTE: 'ASIGNADO', ASIGNADO: 'EN_CURSO', EN_CURSO: 'COMPLETADO',
  };

  // Cotizador de tarifa (panel flotante sobre el mapa).
  const [cotizadorAbierto, setCotizadorAbierto] = useState(false);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [rutaCotizada, setRutaCotizada] = useState(0);
  const alCambiarCotizacion = (e: EstadoCotizacion | null) => {
    setCotizacion(e?.cotizacion ?? null);
    setRutaCotizada(e?.activa ?? 0);
  };

  const countPill = (n: number, bg: string, fg: string) => (
    <Chip label={n} size="small" sx={{ bgcolor: bg, color: fg, fontWeight: 700, height: 20, fontSize: 11 }} />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 56px)' }}>
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : resumen && (
        <>
        <Box sx={{
          position: 'relative', overflow: 'hidden',
          flex: 1, minHeight: 480, bgcolor: '#0b1220',
        }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <MapaDespacho
              oscuro
              altura="100%"
              moviles={moviles
                .filter(m => ubicacionesEnVivo[m.id_movil])
                .map(m => {
                  const u = ubicacionesEnVivo[m.id_movil];
                  return { ...m, lat: u.lat, lng: u.lng, heading: u.heading };
                })}
              origenDestino={cotizacion
                ? {
                    origen: { lat: cotizacion.origen.lat, lng: cotizacion.origen.lng, label: cotizacion.origen.direccion ?? 'Origen' },
                    destino: { lat: cotizacion.destino.lat, lng: cotizacion.destino.lng, label: cotizacion.destino.direccion ?? 'Destino' },
                  }
                : rutaSeleccionada?.origenDestino ?? null}
              ruta={cotizacion ? null : rutaSeleccionada?.ruta ?? null}
              rutasAlternativas={cotizacion?.rutas.map(r => r.geometry)}
              rutaActiva={rutaCotizada}
              onSeleccionarRuta={setRutaCotizada}
            />
          </Box>

          {/* Degradado sutil en los bordes -- ayuda a que las tarjetas
              flotantes se lean bien encima del mapa sin tapar todo. */}
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(0,0,0,.4) 0%, transparent 22%, transparent 68%, rgba(0,0,0,.5) 100%)',
          }} />

          {/* Cabecera flotante: titulo + acciones dentro del mapa (sin marco claro). */}
          <Box sx={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 0.75, ...glassSx, borderRadius: 10,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PhoneCall size={22} color="#fff" />
          <Typography variant="h1" sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Solicitudes</Typography>
          {resumen && countPill(resumen.pendientes.length + resumen.en_curso.length, 'rgba(255,255,255,.14)', '#fff')}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} sx={{ color: '#fff' }} title="Actualizar">
            <RefreshCw size={16} />
          </IconButton>
          <IconButton onClick={() => setVerIncumplimientos(true)} sx={{ color: '#fff' }} title="Registro de incumplimientos">
            <ShieldAlert size={16} />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<Calculator size={15} />}
            onClick={() => setCotizadorAbierto(v => !v)}
            sx={{ color: '#fff', borderColor: cotizadorAbierto ? colors.accent500 : 'rgba(255,255,255,.3)' }}
          >
            Cotizar tarifa
          </Button>
          <Button
            variant="outlined"
            startIcon={<History size={15} />}
            onClick={() => loadHistorial()}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
          >
            Historial
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setShowForm(true); setForm(EMPTY_FORM); setPasajeroEncontrado(null); setFormError(null);
              setModoReserva(false);
              { const ini = reservaInicial(); setReservaFecha(ini.fecha); setReservaHora(ini.hora); setReservaMin(ini.min); }
              setGeocodOrigen(null); setErrorGeocodOrigen(null);
            }}
            sx={{
              color: colors.ink,
              background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
              boxShadow: '0 4px 10px rgba(245,166,35,.25)',
              '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
            }}
          >
            Nueva solicitud
          </Button>
        </Box>
          </Box>

          {rutaSeleccionada && (
            <Button
              size="small" onClick={() => setRutaSeleccionada(null)}
              sx={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 3, fontSize: 11, ...glassSx, color: '#fff' }}
            >
              Ocultar ruta
            </Button>
          )}

          {/* Arriba a la izquierda: estadisticas rapidas.
              pointerEvents 'none' en el contenedor + 'auto' en cada tarjeta:
              asi el espacio vacio entre/alrededor de las tarjetas deja pasar
              el clic/scroll al mapa (drag para mover, rueda para zoom) en
              vez de que la caja invisible del contenedor se lo trague. */}
          {cotizadorAbierto && (
            <Box sx={{ position: 'absolute', top: 72, left: 16, bottom: 16, zIndex: 4, pointerEvents: 'none' }}>
              <CotizadorTarifa
                cotizacion={cotizacion} activa={rutaCotizada} onActiva={setRutaCotizada}
                onCambio={alCambiarCotizacion}
                onCerrar={() => setCotizadorAbierto(false)}
              />
            </Box>
          )}

          <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: cotizadorAbierto ? 'none' : 'flex', gap: 1, flexWrap: 'wrap', maxWidth: 260, pointerEvents: 'none' }}>
            <HeroStat title="Móviles en línea" value={Object.keys(ubicacionesEnVivo).length} icon={<Car size={17} />} tone={TONES.blue} />
            <HeroStat title="En curso" value={resumen.en_curso.length} icon={<Navigation size={17} />} tone={TONES.violet} />
            <HeroStat title="Pendientes" value={resumen.pendientes.length} icon={<Clock size={17} />} tone={TONES.orange} />
          </Box>

          {/* Arriba a la derecha: fila virtual + actividad reciente + clima */}
          <Box sx={{
            position: 'absolute', top: 16, right: 16, bottom: 16, zIndex: 2, width: 272,
            display: 'flex', flexDirection: 'column', gap: 1.25, overflowY: 'auto', pr: 0.5,
            pointerEvents: 'none',
          }}>
            {/* Fila virtual — la membresia sale SIEMPRE de filaBase (backend
                filtra a EN_ESPERA por defecto: ver FilaBaseViewSet.get_queryset),
                nunca de si el movil reporta GPS. Antes esto se armaba filtrando
                por ubicacionesEnVivo, asi que un movil que se retiraba de la
                fila (estado -> RETIRADO) seguia apareciendo aca mientras el
                celular siguiera mandando ubicacion -- la fila y el GPS son
                cosas independientes. El GPS ahora solo decora la fila (punto
                verde = en linea), no decide quien aparece. */}
            <Card sx={{ ...glassSx, borderRadius: 4, flexShrink: 0, pointerEvents: 'auto' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Users size={15} color="rgba(255,255,255,.7)" />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'rgba(255,255,255,.7)' }}>
                    Fila virtual
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {filaBase.length === 0
                    ? <EmptyHint text="Sin conductores en la fila" />
                    : filaBase.map(f => {
                        const enLinea = !!ubicacionesEnVivo[f.movil];
                        return (
                          <Box key={f.id_fila} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Avatar sx={{
                              width: 24, height: 24, fontSize: 11.5, fontWeight: 700, color: colors.ink,
                              background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`,
                            }}>
                              {f.posicion}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
                                {f.patente}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.socio_nombre}
                              </Typography>
                            </Box>
                            <Chip
                              label={enLinea ? 'DISPONIBLE' : 'SIN GPS'}
                              size="small"
                              sx={{
                                flexShrink: 0, fontSize: 9.5, fontWeight: 700,
                                bgcolor: enLinea ? 'rgba(47,158,94,.22)' : 'rgba(255,255,255,.08)',
                                color: enLinea ? '#4ade80' : 'rgba(255,255,255,.5)',
                              }}
                            />
                          </Box>
                        );
                      })
                  }
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ pointerEvents: 'auto', flexShrink: 0 }}><ClimaWidget oscuro /></Box>
          </Box>
        </Box>

          {/* Solicitudes pendientes y en curso: fuera del mapa, en su propia
              franja oscura debajo, para que no tapen el mapa ni sus controles. */}
          <Box sx={{ bgcolor: '#0b1220', p: 2, display: 'flex', flexDirection: 'column', gap: 1.75, flexShrink: 0 }}>
            <Box>
              <ColumnHeader
                icon={<Clock size={13} color="#f5a06b" />}
                bg="rgba(194,65,12,.28)"
                title="Solicitudes pendientes"
                count={countPill(resumen.pendientes.length, 'rgba(194,65,12,.28)', '#f5a06b')}
              />
              <FilaHorizontal>
                {resumen.pendientes.length === 0
                  ? <EmptyHint text="Sin pendientes" />
                  : resumen.pendientes.map(s => (
                      <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                    ))
                }
              </FilaHorizontal>
            </Box>

            <Box>
              <ColumnHeader
                icon={<Car size={13} color="#7d95d8" />}
                bg="rgba(51,85,168,.28)"
                title="Solicitudes en curso"
                count={countPill(resumen.en_curso.length, 'rgba(51,85,168,.28)', '#7d95d8')}
              />
              <FilaHorizontal>
                {resumen.en_curso.length === 0
                  ? <EmptyHint text="Sin viajes en curso" />
                  : resumen.en_curso.map(s => (
                      <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} onVerRuta={handleVerRuta} cargandoRuta={cargandoRuta} />
                    ))
                }
              </FilaHorizontal>
            </Box>

            <Box>
              <ColumnHeader
                icon={<CalendarClock size={13} color="#6fd0b0" />}
                bg="rgba(47,158,120,.28)"
                title="Reservas programadas"
                count={reservas.some(r => r.alerta)
                  ? countPill(reservas.filter(r => r.alerta).length, 'rgba(192,57,43,.35)', '#ff8a8a')
                  : countPill(reservas.length, 'rgba(47,158,120,.28)', '#6fd0b0')}
              />
              <FilaHorizontal>
                {reservas.length === 0
                  ? <EmptyHint text="Sin reservas programadas" />
                  : reservas.map(r => (
                      <ReservaCard key={r.id_reserva} reserva={r} onCancelar={handleCancelarReserva} onLiberar={setLiberando} />
                    ))
                }
              </FilaHorizontal>
            </Box>
          </Box>
        </>
      )}

      <RegistroIncumplimientos open={verIncumplimientos} onClose={() => setVerIncumplimientos(false)} />

      {/* Modal quitar conductor de una reserva */}
      <Dialog open={!!liberando} onClose={() => setLiberando(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Quitar conductor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {liberando && (
            <Typography sx={{ fontSize: 13.5 }}>
              La reserva {liberando.folio} de las {formatoHora(liberando.fecha_hora_recogida)} volverá a quedar disponible
              para que otro conductor la tome. Conductor actual: <strong>{liberando.movil_patente}</strong> ({liberando.conductor_nombre}).
            </Typography>
          )}
          <FormControlLabel
            control={<Checkbox checked={liberarIncumplio} onChange={e => setLiberarIncumplio(e.target.checked)} />}
            label="Registrar como incumplimiento del conductor (no llegó o no confirmó)"
            slotProps={{ typography: { sx: { fontSize: 13 } } }}
          />
          <TextField size="small" fullWidth label="Motivo (opcional)" value={liberarMotivo} onChange={e => setLiberarMotivo(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLiberando(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleLiberar} disabled={saving}
            sx={{ color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})` }}>
            {saving ? 'Guardando...' : 'Quitar conductor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal nueva solicitud */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2.5, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
            }}>
              <Plus size={18} color={colors.ink} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>{modoReserva ? 'Nueva reserva' : 'Nueva solicitud'}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Traslado a Hospital Félix Bulnes</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setShowForm(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, pt: 0 }}>
            <ToggleButtonGroup
              exclusive fullWidth size="small" value={modoReserva ? 'reserva' : 'ahora'}
              onChange={(_, v: 'ahora' | 'reserva' | null) => { if (v) setModoReserva(v === 'reserva'); }}
              sx={{
                '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, py: 0.6 },
                '& .Mui-selected': { bgcolor: `${colors.accent500} !important`, color: `${colors.ink} !important`, fontWeight: 700 },
              }}
            >
              <ToggleButton value="ahora">Ahora</ToggleButton>
              <ToggleButton value="reserva"><CalendarClock size={14} style={{ marginRight: 6 }} />Reservar para más tarde</ToggleButton>
            </ToggleButtonGroup>

            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 1 }}>
                Datos del pasajero
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25 }}>
                <TextField
                  size="small" label="RUT del pasajero" placeholder="12345678-9" sx={{ flex: 1.1 }}
                  value={form.rut}
                  onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                  onBlur={handleRutBlur}
                  slotProps={{ input: { startAdornment: (
                    <InputAdornment position="start"><User size={15} color="#a89f8f" /></InputAdornment>
                  ) } }}
                />
                <TextField
                  size="small" label="Nombre" sx={{ flex: 1 }}
                  value={form.nombre}
                  disabled={!!pasajeroEncontrado}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
                <TextField
                  size="small" label="Apellido" sx={{ flex: 1 }}
                  value={form.apellido}
                  disabled={!!pasajeroEncontrado}
                  onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                />
              </Box>
              <TextField
                fullWidth size="small" label="Teléfono de contacto" placeholder="912345678" sx={{ mt: 1.25 }}
                value={form.telefono}
                disabled={!!pasajeroEncontrado?.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                slotProps={{ input: { startAdornment: (
                  <InputAdornment position="start"><PhoneCall size={15} color="#a89f8f" /></InputAdornment>
                ) } }}
              />
              {buscandoRut && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Buscando...</Typography>}
              {pasajeroEncontrado && (
                <Typography sx={{ fontSize: 11, color: '#2f7d5b', fontWeight: 600, mt: 0.5 }}>
                  ✓ Pasajero registrado — {pasajeroEncontrado.telefono ?? 'sin teléfono'}
                </Typography>
              )}
              {pasajeroEncontrado?.bloqueado_domicilio === 1 && (
                <Alert
                  severity="warning" sx={{ mt: 1, fontSize: 12 }}
                  action={esAdmin ? <Button color="inherit" size="small" onClick={handleLevantarBloqueo}>Levantar</Button> : undefined}
                >
                  Bloqueado por {pasajeroEncontrado.incumplimientos} incumplimientos: no puede pedir móviles a domicilio
                  {modoReserva ? '' : ' (solo puede tomar uno en el hospital)'}.
                </Alert>
              )}
              {!buscandoRut && form.rut && !pasajeroEncontrado && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                  RUT no registrado — se registrará como pasajero nuevo con el nombre y apellido de arriba.
                </Typography>
              )}
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 1 }}>
                Detalles del traslado
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box>
                  <TextField fullWidth size="small" label="Dirección de recogida *" placeholder="Calle Falsa 123"
                    value={form.origen}
                    onChange={e => {
                      setForm(f => ({ ...f, origen: e.target.value }));
                      setGeocodOrigen(null); setErrorGeocodOrigen(null); setTarifaEstimada(null);
                    }}
                    onBlur={handleOrigenBlur}
                    slotProps={{ input: { startAdornment: (
                      <InputAdornment position="start"><MapPin size={15} color="#a89f8f" /></InputAdornment>
                    ) } }} />
                  {buscandoOrigen && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Ubicando dirección...</Typography>}
                  {geocodOrigen && (
                    <Typography sx={{ fontSize: 11, color: '#2f7d5b', fontWeight: 600, mt: 0.5 }}>
                      ✓ Ubicado ({geocodOrigen.lat.toFixed(4)}, {geocodOrigen.lng.toFixed(4)})
                    </Typography>
                  )}
                  {errorGeocodOrigen && <Typography sx={{ fontSize: 11, color: '#c2410c', mt: 0.5 }}>{errorGeocodOrigen}</Typography>}
                </Box>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fdecec', borderRadius: 3, px: 1.5, py: 1,
                }}>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: 2, flexShrink: 0, bgcolor: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Cross size={15} color="#c0392b" />
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#7a2020', flex: 1 }}>
                    Destino: {DESTINO_HOSPITAL}
                  </Typography>
                  <MapPin size={16} color="#c0392b" style={{ flexShrink: 0 }} />
                </Box>

                {(calculandoTarifa || tarifaEstimada) && (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#fdf1dc', borderRadius: 3, px: 1.5, py: 1.25,
                    border: '1px solid', borderColor: '#f0d9a8',
                  }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: 2, flexShrink: 0, bgcolor: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Navigation size={15} color="#c2410c" />
                    </Box>
                    {calculandoTarifa ? (
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Calculando tarifa estimada...</Typography>
                    ) : tarifaEstimada && (
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#7a4a10', fontFamily: 'Roboto Mono, monospace' }}>
                          ${tarifaEstimada.tarifa_estimada.toLocaleString('es-CL')} <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#a08050' }}>estimado</Box>
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: '#a08050' }}>
                          {(tarifaEstimada.distancia_m / 1000).toFixed(1)} km aprox. — puede variar según el tráfico y la ruta real.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {modoReserva && (
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 1 }}>
                      Hora de recogida (24 h)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small" type="date" label="Día" sx={{ flex: 1.6 }}
                        value={reservaFecha} onChange={e => setReservaFecha(e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: { min: aFechaLocal(new Date()), max: aFechaLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)) },
                        }}
                      />
                      <TextField select size="small" label="Hora" sx={{ flex: 1 }} value={reservaHora} onChange={e => setReservaHora(e.target.value)}>
                        {HORAS.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Min" sx={{ flex: 1 }} value={reservaMin} onChange={e => setReservaMin(e.target.value)}>
                        {MINUTOS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                      Con al menos 30 minutos de anticipación y hasta 24 horas adelante.
                    </Typography>
                  </Box>
                )}

                {!modoReserva && (
                <TextField fullWidth select size="small" label="Canal de solicitud" value={form.canal_entrada}
                  onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}
                  slotProps={{ input: { startAdornment: (
                    <InputAdornment position="start"><PhoneCall size={15} color="#a89f8f" /></InputAdornment>
                  ) } }}>
                  {CANALES.map(c => <MenuItem key={c} value={c}>{c === 'TELEFONO' ? 'Teléfono' : 'Presencial (en la central)'}</MenuItem>)}
                </TextField>
                )}

                <TextField fullWidth multiline rows={2} size="small" label="Observaciones (opcional)"
                  value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  slotProps={{ input: { startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><MessageSquare size={15} color="#a89f8f" /></InputAdornment>
                  ) } }} />
              </Box>
            </Box>

            {formError && <Alert severity="error">{formError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={() => setShowForm(false)} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button fullWidth type="submit" variant="contained" disabled={saving}
              sx={{
                color: colors.ink,
                background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
                '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
              }}>
              {saving ? 'Guardando...' : (modoReserva ? 'Registrar reserva' : 'Registrar Solicitud')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Modal acción (avanzar / cancelar / sin contacto) */}
      <Dialog open={!!accion} onClose={() => setAccion(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        {accion && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
              {accion.tipo === 'cancelar' ? 'Cancelar solicitud'
                : accion.tipo === 'sin_contacto' ? 'Sin contacto'
                : 'Avanzar estado'}
              <IconButton size="small" onClick={() => setAccion(null)}><X size={18} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Folio: <Box component="span" sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, color: 'text.primary' }}>{accion.solicitud.folio}</Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                {accion.solicitud.origen} → {accion.solicitud.destino}
              </Typography>

              {accion.tipo === 'sin_contacto' && (
                <Alert severity="warning" icon={<PhoneMissed size={18} />} sx={{ mb: 2 }}>
                  Se cancelará la solicitud con motivo <strong>SIN_CONTACTO</strong>. Esto queda registrado para seguimiento.
                </Alert>
              )}

              {accion.tipo === 'cancelar' && (
                <Alert severity="error" icon={<XCircle size={18} />} sx={{ mb: 2 }}>
                  Se cancelará la solicitud. Esta acción no se puede deshacer.
                </Alert>
              )}

              {accion.tipo === 'cambiar' && accion.solicitud.estado === 'PENDIENTE' && (
                <TextField
                  fullWidth select size="small" label="Asignar móvil *" value={movilId}
                  onChange={e => setMovilId(e.target.value)} sx={{ mb: 2 }}
                >
                  <MenuItem value="">Seleccionar móvil disponible...</MenuItem>
                  {movilesDisponibles.map(m => (
                    <MenuItem key={m.id_movil} value={m.id_movil}>{m.patente} — {m.socio_nombre}</MenuItem>
                  ))}
                </TextField>
              )}

              {accion.tipo === 'cambiar' && accion.solicitud.estado !== 'PENDIENTE' && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                  Nuevo estado: <strong>{SIG_ESTADO[accion.solicitud.estado]}</strong>
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
              <Button fullWidth variant="outlined" onClick={() => setAccion(null)} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
                Volver
              </Button>
              <Button
                fullWidth variant="contained"
                onClick={handleAccion}
                disabled={saving || (accion.tipo === 'cambiar' && accion.solicitud.estado === 'PENDIENTE' && !movilId)}
                color={accion.tipo === 'cancelar' || accion.tipo === 'sin_contacto' ? 'error' : undefined}
                sx={accion.tipo === 'cambiar' ? {
                  color: colors.ink,
                  background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
                  '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
                } : undefined}
              >
                {saving ? 'Procesando...' : 'Confirmar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal historial completo */}
      <Dialog open={showHistorial} onClose={() => setShowHistorial(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, maxHeight: '80vh' } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2.5, flexShrink: 0, bgcolor: '#f1efe9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <History size={17} color="#6b6152" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Historial completo</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{historial.length} solicitudes registradas</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setShowHistorial(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{
            display: { xs: 'none', sm: 'grid' },
            gridTemplateColumns: '105px 2fr 90px 110px 1.2fr 110px',
            gap: 1.5, px: 1.5, pb: 1,
          }}>
            {['Folio', 'Origen → Destino', 'Móvil', 'Estado', 'Obs.', 'Fecha'].map(h => (
              <Typography key={h} sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                {h}
              </Typography>
            ))}
          </Box>

          {historial.length === 0 ? (
            <EmptyHint text="Sin solicitudes registradas." />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {historial.map(s => (
                <Box
                  key={s.id_solicitud}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: '105px 2fr 90px 110px 1.2fr 110px' },
                    alignItems: 'center', gap: 1.5,
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    borderRadius: 3, px: 1.75, py: 1.1,
                  }}
                >
                  <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 11, color: 'text.secondary' }}>
                    {s.folio}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, minWidth: 0 }}>
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.origen}</Box>
                    <ChevronRight size={12} color="#9c9284" style={{ flexShrink: 0 }} />
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.destino}</Box>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
                    {s.movil_patente ?? '—'}
                  </Typography>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}><EstadoChip estado={s.estado} /></Box>
                  <Typography sx={{
                    fontSize: 11.5, color: 'text.secondary', display: { xs: 'none', sm: '-webkit-box' },
                    WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {s.observaciones ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#a89f8f', textAlign: { sm: 'right' } }}>
                    {formatoFechaHora(s.fecha_hora)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
