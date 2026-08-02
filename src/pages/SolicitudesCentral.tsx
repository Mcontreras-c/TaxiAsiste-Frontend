import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress,
  Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Avatar,
} from '@mui/material';
import {
  PhoneCall, Plus, RefreshCw, X, ChevronRight,
  Clock, Car, CheckCircle, XCircle, History, PhoneMissed, MapPin, Navigation,
} from 'lucide-react';
import {
  getResumenCentral, getSolicitudes, createSolicitud,
  cambiarEstado, buscarPasajeroPorRut, type ResumenCentral,
} from '../api/solicitudes';
import { getMoviles, getFilaBase } from '../api/moviles';
import { geocodificar, obtenerRuta } from '../api/mapas';
import MapaDespacho from '../components/MapaDespacho';
import type { PuntoRuta, RutaGeoJSON } from '../components/MapaDespacho';
import { useUbicacionesMoviles } from '../hooks/useUbicacionesMoviles';
import type { Solicitud, EstadoSolicitud, Movil, Pasajero, FilaBase } from '../types';
import { colors } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDIENTE:  { bg: '#fdece2', fg: '#c2410c' },
  ASIGNADO:   { bg: '#e8ecf9', fg: '#3355a8' },
  EN_CURSO:   { bg: '#f3e8fd', fg: '#7e22ce' },
  COMPLETADO: { bg: '#e4f3ec', fg: '#2f7d5b' },
  CANCELADO:  { bg: '#f1efe9', fg: '#8a8071' },
};

const CANALES = ['TELEFONO', 'APP', 'PRESENCIAL'] as const;

interface FormData {
  rut: string;
  origen: string;
  destino: string;
  canal_entrada: string;
  observaciones: string;
  pasajero_id: number | null;
  pasajero_nombre: string;
}

const EMPTY_FORM: FormData = {
  rut: '', origen: '', destino: '', canal_entrada: 'TELEFONO',
  observaciones: '', pasajero_id: null, pasajero_nombre: '',
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

function ColumnHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: 'text.primary', fontSize: 13.5 }}>
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sol.origen}</Box>
          <ChevronRight size={13} color="#9c9284" style={{ flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sol.destino}</Box>
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

  // Geocoding en vivo del formulario de nueva solicitud (Nominatim, via backend).
  const [geocodOrigen, setGeocodOrigen] = useState<{ lat: number; lng: number; direccion_formateada: string } | null>(null);
  const [geocodDestino, setGeocodDestino] = useState<{ lat: number; lng: number; direccion_formateada: string } | null>(null);
  const [buscandoOrigen, setBuscandoOrigen] = useState(false);
  const [buscandoDestino, setBuscandoDestino] = useState(false);
  const [errorGeocodOrigen, setErrorGeocodOrigen] = useState<string | null>(null);
  const [errorGeocodDestino, setErrorGeocodDestino] = useState<string | null>(null);

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
      } catch {
        // se reintenta en el siguiente ciclo
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
    if (!form.rut) return;
    setBuscandoRut(true);
    try {
      const res = await buscarPasajeroPorRut(form.rut);
      if (res.length > 0) {
        setPasajeroEncontrado(res[0]);
        setForm(f => ({
          ...f,
          pasajero_id: res[0].id_pasajero,
          pasajero_nombre: `${res[0].nombre} ${res[0].apellido}`,
        }));
      } else {
        setPasajeroEncontrado(null);
        setForm(f => ({ ...f, pasajero_id: null, pasajero_nombre: '' }));
      }
    } finally { setBuscandoRut(false); }
  };

  const handleOrigenBlur = async () => {
    if (!form.origen) { setGeocodOrigen(null); setErrorGeocodOrigen(null); return; }
    setBuscandoOrigen(true); setErrorGeocodOrigen(null);
    try {
      setGeocodOrigen(await geocodificar(form.origen));
    } catch {
      setGeocodOrigen(null);
      setErrorGeocodOrigen('No se pudo ubicar esta dirección — se registrará solo como texto.');
    } finally { setBuscandoOrigen(false); }
  };

  const handleDestinoBlur = async () => {
    if (!form.destino) { setGeocodDestino(null); setErrorGeocodDestino(null); return; }
    setBuscandoDestino(true); setErrorGeocodDestino(null);
    try {
      setGeocodDestino(await geocodificar(form.destino));
    } catch {
      setGeocodDestino(null);
      setErrorGeocodDestino('No se pudo ubicar esta dirección — se registrará solo como texto.');
    } finally { setBuscandoDestino(false); }
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
    if (!form.origen || !form.destino) { setFormError('Origen y destino son obligatorios.'); return; }
    setSaving(true); setFormError(null);
    try {
      await createSolicitud({
        origen: form.origen,
        destino: form.destino,
        canal_entrada: form.canal_entrada as any,
        observaciones: form.observaciones || null,
        pasajero: form.pasajero_id ?? null,
      });
      setForm(EMPTY_FORM); setPasajeroEncontrado(null);
      setGeocodOrigen(null); setGeocodDestino(null);
      setErrorGeocodOrigen(null); setErrorGeocodDestino(null);
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
              setGeocodOrigen(null); setGeocodDestino(null);
              setErrorGeocodOrigen(null); setErrorGeocodDestino(null);
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
        <>
        <Box>
          <ColumnHeader
            icon={<MapPin size={15} color="#6b6152" />}
            title="Mapa de flota"
            count={
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {Object.keys(ubicacionesEnVivo).length > 0
                  ? 'GPS en vivo (actualiza cada 4s)'
                  : 'Sin reportes GPS aun'}
              </Typography>
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

        <Box className="grid grid-cols-4 gap-4">
          {/* Fila virtual (base) */}
          <Box>
            <ColumnHeader
              icon={<MapPin size={15} color="#6b6152" />}
              title="Fila Virtual (Base)"
              count={countPill(filaBase.length, '#f1efe9', '#6b6152')}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filaBase.length === 0
                ? <EmptyHint text="Sin moviles en base" />
                : filaBase.map(f => (
                    <Card key={f.id_fila} sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ p: '10px 12px !important', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{
                          width: 24, height: 24, fontSize: 11.5, fontWeight: 700, color: colors.ink,
                          background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`,
                        }}>
                          {f.posicion}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.patente}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.socio_nombre}
                          </Typography>
                        </Box>
                        <Chip
                          label={f.estado}
                          size="small"
                          sx={{
                            ml: 'auto', fontSize: 10, fontWeight: 700,
                            bgcolor: f.estado === 'LLAMADO' ? '#e8ecf9' : '#f1efe9',
                            color: f.estado === 'LLAMADO' ? '#3355a8' : '#6b6152',
                          }}
                        />
                      </CardContent>
                    </Card>
                  ))
              }
            </Box>
          </Box>

          {/* Pendientes */}
          <Box>
            <ColumnHeader
              icon={<Clock size={15} color="#c2410c" />}
              title="Pendientes"
              count={countPill(resumen.pendientes.length, '#fdece2', '#c2410c')}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {resumen.pendientes.length === 0
                ? <EmptyHint text="Sin pendientes" />
                : resumen.pendientes.slice(0, 4).map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                  ))
              }
            </Box>
          </Box>

          {/* En curso */}
          <Box>
            <ColumnHeader
              icon={<Car size={15} color="#3355a8" />}
              title="En curso"
              count={countPill(resumen.en_curso.length, '#e8ecf9', '#3355a8')}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {resumen.en_curso.length === 0
                ? <EmptyHint text="Sin viajes en curso" />
                : resumen.en_curso.slice(0, 4).map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} onVerRuta={handleVerRuta} cargandoRuta={cargandoRuta} />
                  ))
              }
            </Box>
          </Box>

          {/* Finalizadas recientes */}
          <Box>
            <ColumnHeader
              icon={<CheckCircle size={15} color="#2f7d5b" />}
              title="Recientes"
              count={
                <Button size="small" onClick={() => loadHistorial()} sx={{ fontSize: 11, color: '#3355a8', minWidth: 0, p: 0 }}>
                  ver todo
                </Button>
              }
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {resumen.finalizadas.length === 0
                ? <EmptyHint text="Sin finalizadas" />
                : resumen.finalizadas.map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                  ))
              }
            </Box>
          </Box>
        </Box>
        </>
      )}

      {/* Modal nueva solicitud */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          Nueva solicitud
          <IconButton size="small" onClick={() => setShowForm(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
            <Box>
              <TextField
                fullWidth size="small" label="RUT pasajero" placeholder="12345678-9"
                value={form.rut}
                onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                onBlur={handleRutBlur}
              />
              {buscandoRut && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Buscando...</Typography>}
              {pasajeroEncontrado && (
                <Typography sx={{ fontSize: 11, color: '#2f7d5b', fontWeight: 600, mt: 0.5 }}>
                  ✓ {pasajeroEncontrado.nombre} {pasajeroEncontrado.apellido} — {pasajeroEncontrado.telefono ?? 'sin teléfono'}
                </Typography>
              )}
              {!buscandoRut && form.rut && !pasajeroEncontrado && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                  Pasajero no registrado — se creará la solicitud sin vincularlo.
                </Typography>
              )}
            </Box>

            <Box>
              <TextField fullWidth size="small" label="Origen *" placeholder="Calle Falsa 123"
                value={form.origen}
                onChange={e => { setForm(f => ({ ...f, origen: e.target.value })); setGeocodOrigen(null); setErrorGeocodOrigen(null); }}
                onBlur={handleOrigenBlur} />
              {buscandoOrigen && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Ubicando dirección...</Typography>}
              {geocodOrigen && (
                <Typography sx={{ fontSize: 11, color: '#2f7d5b', fontWeight: 600, mt: 0.5 }}>
                  ✓ Ubicado ({geocodOrigen.lat.toFixed(4)}, {geocodOrigen.lng.toFixed(4)})
                </Typography>
              )}
              {errorGeocodOrigen && <Typography sx={{ fontSize: 11, color: '#c2410c', mt: 0.5 }}>{errorGeocodOrigen}</Typography>}
            </Box>

            <Box>
              <TextField fullWidth size="small" label="Destino *" placeholder="Plaza Italia"
                value={form.destino}
                onChange={e => { setForm(f => ({ ...f, destino: e.target.value })); setGeocodDestino(null); setErrorGeocodDestino(null); }}
                onBlur={handleDestinoBlur} />
              {buscandoDestino && <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Ubicando dirección...</Typography>}
              {geocodDestino && (
                <Typography sx={{ fontSize: 11, color: '#2f7d5b', fontWeight: 600, mt: 0.5 }}>
                  ✓ Ubicado ({geocodDestino.lat.toFixed(4)}, {geocodDestino.lng.toFixed(4)})
                </Typography>
              )}
              {errorGeocodDestino && <Typography sx={{ fontSize: 11, color: '#c2410c', mt: 0.5 }}>{errorGeocodDestino}</Typography>}
            </Box>

            <TextField fullWidth select size="small" label="Canal" value={form.canal_entrada}
              onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}>
              {CANALES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            <TextField fullWidth multiline rows={2} size="small" label="Observaciones" placeholder="Opcional..."
              value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />

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
              {saving ? 'Guardando...' : 'Registrar'}
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          Historial completo
          <IconButton size="small" onClick={() => setShowHistorial(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Folio', 'Origen → Destino', 'Móvil', 'Estado', 'Obs.', 'Fecha'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {historial.map(s => (
                  <TableRow key={s.id_solicitud} hover>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 11, color: 'text.secondary' }}>{s.folio}</TableCell>
                    <TableCell sx={{ fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.origen} → {s.destino}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{s.movil_patente ?? '—'}</TableCell>
                    <TableCell><EstadoChip estado={s.estado} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.observaciones ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
