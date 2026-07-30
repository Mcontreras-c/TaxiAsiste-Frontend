import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress,
  Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Avatar,
} from '@mui/material';
import {
  PhoneCall, Plus, RefreshCw, X, ChevronRight,
  Clock, Car, CheckCircle, XCircle, History, PhoneMissed, MapPin, Maximize2, Navigation,
} from 'lucide-react';
import {
  getResumenCentral, getSolicitudes, createSolicitud,
  cambiarEstado, buscarPasajeroPorRut, type ResumenCentral,
} from '../api/solicitudes';
import { getMoviles, getFilaBase } from '../api/moviles';
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

const MAPA_PINES = [
  { top: '28%', left: '22%' }, { top: '52%', left: '38%' }, { top: '20%', left: '58%' },
  { top: '68%', left: '64%' }, { top: '40%', left: '78%' }, { top: '74%', left: '30%' },
];

function MapaPreview({ pendientes, enCurso }: { pendientes: number; enCurso: number }) {
  const total = pendientes + enCurso;
  return (
    <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'relative', height: 210,
          background: `
            radial-gradient(circle at 20% 30%, rgba(245,166,35,.10), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(51,85,168,.10), transparent 40%),
            linear-gradient(#faf7f0, #f3efe4)
          `,
          backgroundSize: '18px 18px, 18px 18px, 100% 100%',
          backgroundImage:
            'linear-gradient(rgba(20,17,11,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,17,11,.05) 1px, transparent 1px)',
        }}
      >
        <Box sx={{ position: 'absolute', top: 12, left: 14, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Navigation size={13} color="#6b6152" />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Santiago Centro</Typography>
        </Box>
        <IconButton size="small" disabled sx={{ position: 'absolute', top: 8, right: 8, bgcolor: '#fff', boxShadow: 1, '&.Mui-disabled': { bgcolor: '#fff' } }}>
          <Maximize2 size={13} />
        </IconButton>

        {MAPA_PINES.slice(0, Math.max(total, 2)).map((p, i) => {
          const esPendiente = i < pendientes;
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%,-100%)',
                color: esPendiente ? '#c2410c' : '#3355a8', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.18))',
              }}
            >
              <MapPin size={24} fill={esPendiente ? '#fdece2' : '#e8ecf9'} strokeWidth={2} />
            </Box>
          );
        })}

        <Chip
          label="Mapa en vivo — próximamente"
          size="small"
          sx={{
            position: 'absolute', bottom: 12, left: 14,
            bgcolor: 'rgba(255,255,255,.9)', fontWeight: 600, fontSize: 11, color: 'text.secondary',
          }}
        />
      </Box>
    </Card>
  );
}

function SolicitudCard({
  sol, onAccion,
}: { sol: Solicitud; onAccion: (a: AccionModal) => void }) {
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

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, m, f] = await Promise.all([getResumenCentral(), getMoviles(), getFilaBase()]);
      setResumen(r);
      setMoviles(m.filter(m => m.estado_operativo === 'DISPONIBLE'));
      setFilaBase(f.sort((a, b) => a.posicion - b.posicion));
    } catch {
      setError('No se pudo cargar las solicitudes.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setPasajeroEncontrado(null); setFormError(null); }}
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
        <MapaPreview pendientes={resumen.pendientes.length} enCurso={resumen.en_curso.length} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
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
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
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

            <TextField fullWidth size="small" label="Origen *" placeholder="Calle Falsa 123"
              value={form.origen} onChange={e => setForm(f => ({ ...f, origen: e.target.value }))} />
            <TextField fullWidth size="small" label="Destino *" placeholder="Plaza Italia"
              value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} />

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
                  {moviles.map(m => (
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
