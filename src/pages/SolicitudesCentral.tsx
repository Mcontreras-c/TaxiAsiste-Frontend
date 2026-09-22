import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress,
  Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, InputAdornment, Avatar,
} from '@mui/material';
import {
  PhoneCall, Plus, RefreshCw, X, ChevronRight,
  Clock, Car, CheckCircle, XCircle, History, PhoneMissed, MapPin, Navigation,
  User, MessageSquare, Cross, Users,
} from 'lucide-react';
import {
  getResumenCentral, getSolicitudes, createSolicitud,
  cambiarEstado, buscarPasajeroPorRut, createPasajero, actualizarTelefonoPasajero, type ResumenCentral,
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

function HeroStat({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: Tone }) {
  return (
    <Card sx={{ borderRadius: 4, position: 'relative', overflow: 'hidden', flex: '1 1 220px' }}>
      <Box sx={{ position: 'absolute', inset: 0, opacity: 0.06, background: tone.grad }} />
      <CardContent sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tone.grad, color: '#fff', boxShadow: `0 4px 12px ${tone.fg}40`,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', lineHeight: 1, color: '#2a2519' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.3 }}>{title}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const ESTADO_OPERATIVO_STYLE: Record<string, { dot: string; label: string; bg: string; fg: string }> = {
  DISPONIBLE:  { dot: '#2f9e5e', label: 'Disponible', bg: '#e4f3ec', fg: '#2f7d5b' },
  EN_SERVICIO: { dot: '#3355a8', label: 'En servicio', bg: '#e8ecf9', fg: '#3355a8' },
  EN_VIAJE:    { dot: '#7e22ce', label: 'En viaje',    bg: '#f3e8fd', fg: '#7e22ce' },
  BLOQUEADO:   { dot: '#c0392b', label: 'Bloqueado',   bg: '#fdecec', fg: '#c0392b' },
  INACTIVO:    { dot: '#a89f8f', label: 'Inactivo',    bg: '#f1efe9', fg: '#6b6152' },
};

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

function ColumnHeader({ icon, bg = '#f1efe9', title, count }: { icon: React.ReactNode; bg?: string; title: string; count: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 2, flexShrink: 0, bgcolor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
      <Box sx={{ ml: 'auto' }}>{count}</Box>
    </Box>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', py: 3 }}>
      {text}
    </Typography>
  );
}

function tiempoRelativo(fechaISO: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000));
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.round(diffH / 24)} d`;
}

function ActividadRow({ sol }: { sol: Solicitud }) {
  const completada = sol.estado === 'COMPLETADO';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
      <Box sx={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: completada ? '#e4f3ec' : '#fbe9e9', color: completada ? '#2f7d5b' : '#c0392b',
      }}>
        {completada ? <CheckCircle size={14} /> : <XCircle size={14} />}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sol.movil_patente ?? sol.folio}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {completada ? 'Completada' : 'Cancelada'}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 10.5, color: '#a89f8f', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {tiempoRelativo(sol.fecha_termino ?? sol.fecha_hora)}
      </Typography>
    </Box>
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
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: '12px !important', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 11, color: 'text.secondary' }}>
            {sol.folio}
          </Typography>
          <EstadoChip estado={sol.estado} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <MapPin size={13} color="#a89f8f" style={{ flexShrink: 0 }} />
          <Box sx={{ fontWeight: 600, color: 'text.primary', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sol.origen}
          </Box>
        </Box>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start',
          bgcolor: '#fdecec', color: '#c0392b', borderRadius: 10, px: 1, py: 0.25,
        }}>
          <Cross size={11} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Hospital Félix Bulnes</Typography>
        </Box>
        {sol.movil_patente && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Car size={12} color="#a89f8f" />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Móvil: <strong>{sol.movil_patente}</strong>
            </Typography>
          </Box>
        )}
        {sol.pasajero_nombre && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            <InitialsAvatar nombre={sol.pasajero_nombre} size={22} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{sol.pasajero_nombre}</Typography>
          </Box>
        )}
        <Typography sx={{ fontSize: 11, color: '#a89f8f' }}>
          {new Date(sol.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
        {sol.estado !== 'COMPLETADO' && sol.estado !== 'CANCELADO' && (
          <Box sx={{ display: 'flex', gap: 0.5, pt: 0.5 }}>
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
      const [r, m, f] = await Promise.all([getResumenCentral(), getMoviles(), getFilaBase()]);
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
        const [r, m, f] = await Promise.all([getResumenCentral(), getMoviles(), getFilaBase()]);
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
      await createSolicitud({
        origen: form.origen,
        canal_entrada: form.canal_entrada as any,
        observaciones: form.observaciones || null,
        pasajero: pasajeroId ?? null,
      });
      setForm(EMPTY_FORM); setPasajeroEncontrado(null);
      setGeocodOrigen(null);
      setErrorGeocodOrigen(null);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Error al crear la solicitud.');
    } finally { setSaving(false); }
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

  const countPill = (n: number, bg: string, fg: string) => (
    <Chip label={n} size="small" sx={{ bgcolor: bg, color: fg, fontWeight: 700, height: 20, fontSize: 11 }} />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PhoneCall size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Solicitudes</Typography>
          {resumen && countPill(resumen.pendientes.length + resumen.en_curso.length, '#f1efe9', '#6b6152')}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} sx={{ color: 'text.secondary' }}>
            <RefreshCw size={16} />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<History size={15} />}
            onClick={() => loadHistorial()}
            sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}
          >
            Historial
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setShowForm(true); setForm(EMPTY_FORM); setPasajeroEncontrado(null); setFormError(null);
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

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : resumen && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '230px 1fr 280px' }, gap: 2.5, alignItems: 'start' }}>
          {/* Rail izquierdo: metricas clave */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <HeroStat title="Móviles en línea" value={Object.keys(ubicacionesEnVivo).length} icon={<Car size={19} />} tone={TONES.blue} />
            <HeroStat title="Solicitudes en curso" value={resumen.en_curso.length} icon={<Navigation size={19} />} tone={TONES.violet} />
            <HeroStat title="Solicitudes pendientes" value={resumen.pendientes.length} icon={<Clock size={19} />} tone={TONES.orange} />
          </Box>

          {/* Centro: mapa + pendientes/en curso lado a lado */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
            <Box>
              <ColumnHeader
                icon={<MapPin size={15} color="#6b6152" />}
                bg="#f1efe9"
                title="Mapa de flota"
                count={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {Object.entries(ESTADO_OPERATIVO_STYLE).map(([k, s]) => (
                      <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.dot, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{s.label}</Typography>
                      </Box>
                    ))}
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', ml: 0.5 }}>
                      {Object.keys(ubicacionesEnVivo).length > 0 ? '· GPS en vivo (4s)' : '· Sin reportes GPS aun'}
                    </Typography>
                  </Box>
                }
              />
              <MapaDespacho
                moviles={moviles
                  .filter(m => ubicacionesEnVivo[m.id_movil])
                  .map(m => {
                    const u = ubicacionesEnVivo[m.id_movil];
                    return { ...m, lat: u.lat, lng: u.lng, heading: u.heading };
                  })}
                origenDestino={rutaSeleccionada?.origenDestino ?? null}
                ruta={rutaSeleccionada?.ruta ?? null}
              />
              {rutaSeleccionada && (
                <Button size="small" onClick={() => setRutaSeleccionada(null)} sx={{ fontSize: 11, mt: 0.5, color: 'text.secondary' }}>
                  Ocultar ruta
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {/* Pendientes */}
              <Box>
                <ColumnHeader
                  icon={<Clock size={15} color="#c2410c" />}
                  bg="#fdece2"
                  title="Solicitudes pendientes"
                  count={countPill(resumen.pendientes.length, '#fdece2', '#c2410c')}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {resumen.pendientes.length === 0
                    ? <EmptyHint text="Sin pendientes" />
                    : resumen.pendientes.map(s => (
                        <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                      ))
                  }
                </Box>
              </Box>

              {/* En curso */}
              <Box>
                <ColumnHeader
                  icon={<Car size={15} color="#3355a8" />}
                  bg="#e8ecf9"
                  title="Solicitudes en curso"
                  count={countPill(resumen.en_curso.length, '#e8ecf9', '#3355a8')}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {resumen.en_curso.length === 0
                    ? <EmptyHint text="Sin viajes en curso" />
                    : resumen.en_curso.map(s => (
                        <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} onVerRuta={handleVerRuta} cargandoRuta={cargandoRuta} />
                      ))
                  }
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Rail derecho: conductores disponibles (fila virtual) + actividad reciente */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Fila virtual — la membresia sale SIEMPRE de filaBase (backend
                filtra a EN_ESPERA por defecto: ver FilaBaseViewSet.get_queryset),
                nunca de si el movil reporta GPS. Antes esto se armaba filtrando
                por ubicacionesEnVivo, asi que un movil que se retiraba de la
                fila (estado -> RETIRADO) seguia apareciendo aca mientras el
                celular siguiera mandando ubicacion -- la fila y el GPS son
                cosas independientes. El GPS ahora solo decora la fila (punto
                verde = en linea), no decide quien aparece. */}
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Users size={15} color="#6b6152" />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                    Conductores disponibles (fila virtual)
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
                              <Typography sx={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.patente}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.socio_nombre}
                              </Typography>
                            </Box>
                            <Chip
                              label={enLinea ? 'DISPONIBLE' : 'SIN GPS'}
                              size="small"
                              sx={{
                                flexShrink: 0, fontSize: 9.5, fontWeight: 700,
                                bgcolor: enLinea ? '#e4f3ec' : '#f1efe9',
                                color: enLinea ? '#2f7d5b' : '#a89f8f',
                              }}
                            />
                          </Box>
                        );
                      })
                  }
                </Box>
              </CardContent>
            </Card>

            {/* Actividad reciente (Completadas / Canceladas) */}
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={15} color="#2f7d5b" />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                      Actividad reciente
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => loadHistorial()} sx={{ fontSize: 11, color: '#3355a8', minWidth: 0, p: 0 }}>
                    ver todo
                  </Button>
                </Box>
                <Box sx={{
                  display: 'flex', flexDirection: 'column',
                  '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
                }}>
                  {resumen.finalizadas.length === 0
                    ? <EmptyHint text="Sin finalizadas" />
                    : resumen.finalizadas.map(s => <ActividadRow key={s.id_solicitud} sol={s} />)
                  }
                </Box>
              </CardContent>
            </Card>

            <ClimaWidget />
          </Box>
        </Box>
      )}

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
              <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Nueva solicitud</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Traslado a Hospital Félix Bulnes</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setShowForm(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, pt: 0 }}>
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

                <TextField fullWidth select size="small" label="Canal de solicitud" value={form.canal_entrada}
                  onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}
                  slotProps={{ input: { startAdornment: (
                    <InputAdornment position="start"><PhoneCall size={15} color="#a89f8f" /></InputAdornment>
                  ) } }}>
                  {CANALES.map(c => <MenuItem key={c} value={c}>{c === 'TELEFONO' ? 'Teléfono' : 'Presencial (en la central)'}</MenuItem>)}
                </TextField>

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
              {saving ? 'Guardando...' : 'Registrar Solicitud'}
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
                    {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
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
