import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress, Card, CardContent,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  DollarSign, RefreshCw, CheckCircle2,
  ChevronLeft, ChevronRight, Lock, Car,
  AlertTriangle, ShieldOff, X, AlarmClock, HandCoins, Pencil,
} from 'lucide-react';
import { getResumenTesorero, cerrarSemana } from '../api/reportes';
import { pagarMovil, pagarAtrasos } from '../api/tesoreria';
import type { ResumenTesorero, DetalleMovilCuota } from '../types';
import { colors } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';

const PAGO_STYLE: Record<string, { bg: string; fg: string }> = {
  PAGADO:    { bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  PENDIENTE: { bg: 'rgba(251,146,60,.14)', fg: '#fb923c' },
  VENCIDO:   { bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  EXENTO:    { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.70)' },
  SIN_CUOTA: { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.55)' },
};
const PAGO_LABEL: Record<string, string> = {
  PAGADO: 'Pagado', PENDIENTE: 'Pendiente', VENCIDO: 'Vencido', EXENTO: 'Exento', SIN_CUOTA: 'Sin cuota',
};

type Tone = { fg: string; bg: string; iconBg: string };

const TONES: Record<string, Tone> = {
  blue:    { fg: '#60a5fa', bg: 'rgba(96,165,250,.14)', iconBg: 'rgba(255,255,255,.65)' },
  emerald: { fg: '#34d399', bg: 'rgba(52,211,153,.14)', iconBg: 'rgba(255,255,255,.65)' },
  red:     { fg: '#f87171', bg: 'rgba(248,113,113,.14)', iconBg: 'rgba(255,255,255,.65)' },
  teal:    { fg: '#127a6b', bg: 'rgba(45,212,191,.14)', iconBg: 'rgba(255,255,255,.65)' },
};

function StatHero({
  icon, tone, label, value, sub,
}: { icon: React.ReactNode; tone: Tone; label: string; value: React.ReactNode; sub: string }) {
  return (
    <Card sx={{ borderRadius: 4, bgcolor: tone.bg, boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: tone.iconBg, color: tone.fg,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: tone.fg }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', color: '#ffffff', lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 11, color: tone.fg, opacity: 0.85 }}>{sub}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function lunesDeSemana(d: Date) {
  const dia = d.getDay(); // 0=domingo
  const offset = dia === 0 ? -6 : 1 - dia;
  const l = new Date(d);
  l.setDate(d.getDate() + offset);
  return l;
}
function hoyPeriodo() {
  return toISODate(lunesDeSemana(new Date()));
}
function periodoLabel(p: string) {
  const [y, m, d] = p.split('-').map(Number);
  const inicio = new Date(y, m - 1, d);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  const mismoMes = inicio.getMonth() === fin.getMonth();
  const mes = fin.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return mismoMes
    ? `${inicio.getDate()} – ${fin.getDate()} de ${mes}`
    : `${inicio.getDate()} de ${inicio.toLocaleDateString('es-CL', { month: 'long' })} – ${fin.getDate()} de ${mes}`;
}
function prevSemana(p: string) {
  const [y, m, d] = p.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 7);
  return toISODate(dt);
}
function nextSemana(p: string) {
  const [y, m, d] = p.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 7);
  return toISODate(dt);
}

function ModalAtrasos({
  item, onClose, onPagado,
}: { item: DetalleMovilCuota; onClose: () => void; onPagado: () => void }) {
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    setLoading(true);
    try {
      const r = await pagarAtrasos(item.id_socio);
      alert(`${r.message}\nTotal ingresado: $${r.total_pagado.toLocaleString('es-CL')}`);
      onPagado();
    } catch {
      alert('Error al procesar el pago. Verifica que el servidor esté activo.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ShieldOff size={20} color="#fb923c" />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Saldar atrasos</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ bgcolor: 'rgba(251,146,60,.14)', border: '1px solid rgba(251,146,60,.35)', borderRadius: 3, p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{item.socio}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Patente: <Box component="span" sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}>{item.patente}</Box>
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#fb923c', fontWeight: 600, mt: 1 }}>
            {item.cuotas_vencidas} cuota{item.cuotas_vencidas !== 1 ? 's' : ''} vencida{item.cuotas_vencidas !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          Se registrará el ingreso de <strong>cada cuota vencida</strong> en tesorería y el socio quedará{' '}
          <Box component="span" sx={{ color: '#34d399', fontWeight: 700 }}>ACTIVO</Box> automáticamente.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        <Button fullWidth variant="outlined" onClick={onClose} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>Cancelar</Button>
        <Button fullWidth variant="contained" color="success" disabled={loading} onClick={confirmar} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <CheckCircle2 size={16} />}>
          Confirmar pago
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ReportesTesorero() {
  const [resumen, setResumen]             = useState<ResumenTesorero | null>(null);
  const [periodo, setPeriodo]             = useState(hoyPeriodo());
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [pagando, setPagando]             = useState<number | null>(null);
  const [cerrando, setCerrando]           = useState(false);
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [tarifa, setTarifa]               = useState<string>('7000');
  const [editTarifa, setEditTarifa]       = useState(false);
  const [modalAtrasos, setModalAtrasos]   = useState<DetalleMovilCuota | null>(null);

  const load = async (p = periodo) => {
    setLoading(true); setError(null);
    try { setResumen(await getResumenTesorero(p)); }
    catch { setError('No se pudo cargar el resumen.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(periodo); }, [periodo]);

  const marcarPagado = async (item: DetalleMovilCuota) => {
    if (item.estado_pago === 'PAGADO') return;
    setPagando(item.id_socio);
    try {
      await pagarMovil(item.id_socio, Number(tarifa), periodo);
      await load(periodo);
    } catch {
      alert('Error al registrar el pago.');
    } finally { setPagando(null); }
  };

  const ejecutarCierre = async () => {
    setCerrando(true);
    try {
      const r = await cerrarSemana(periodo, Number(tarifa));
      setConfirmCierre(false);
      alert(
        `Cierre de semana ejecutado:\n` +
        `• Recaudado: $${r.recaudado.toLocaleString('es-CL')}\n` +
        `• ${r.cuotas_vencidas} cuota(s) → VENCIDO\n` +
        `• ${r.socios_bloqueados} socio(s) bloqueado(s)`
      );
      await load(periodo);
    } catch {
      alert('Error al ejecutar el cierre.');
    } finally { setCerrando(false); }
  };

  const hayPendientes = (resumen?.pendientes ?? 0) > 0;

  const detalle = resumen?.detalle.slice().sort((a, b) => {
    if (a.estado_socio === 'BLOQUEADO' && b.estado_socio !== 'BLOQUEADO') return -1;
    if (a.estado_socio !== 'BLOQUEADO' && b.estado_socio === 'BLOQUEADO') return 1;
    return 0;
  }) ?? [];

  const barColor = !resumen ? colors.accent500
    : resumen.porcentaje >= 80 ? '#34d399' : resumen.porcentaje >= 50 ? colors.accent500 : '#f87171';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DollarSign size={22} color="rgba(255,255,255,.92)" />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>Reportes — Tesorería</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Control de recaudación semanal</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hayPendientes && (
            <Button variant="contained" color="error" startIcon={<Lock size={15} />} onClick={() => setConfirmCierre(true)}>
              Cerrar semana
            </Button>
          )}
          <IconButton onClick={() => load(periodo)} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
          <IconButton size="small" onClick={() => setPeriodo(prevSemana(periodo))}><ChevronLeft size={17} /></IconButton>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>
            Semana {periodoLabel(periodo)}
          </Typography>
          <IconButton size="small" onClick={() => setPeriodo(nextSemana(periodo))}><ChevronRight size={17} /></IconButton>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, bgcolor: 'rgba(255,222,0,.12)', border: '1px solid', borderColor: 'rgba(255,222,0,.28)', boxShadow: 'none' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: colors.accent700 }}>Tarifa semanal por móvil:</Typography>
          {editTarifa ? (
            <TextField
              type="number" size="small" value={tarifa} autoFocus
              onChange={e => setTarifa(e.target.value)}
              onBlur={() => setEditTarifa(false)}
              sx={{ width: 130, bgcolor: 'background.paper' }}
            />
          ) : (
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: colors.accent700, fontFamily: 'Roboto Mono, monospace' }}>
              ${Number(tarifa).toLocaleString('es-CL')}
            </Typography>
          )}
          <Button
            size="small" variant="outlined" startIcon={<Pencil size={13} />} onClick={() => setEditTarifa(true)}
            sx={{ ml: 'auto', fontSize: 11.5, color: colors.accent700, borderColor: colors.accent500 }}
          >
            Editar
          </Button>
        </CardContent>
      </Card>

      {error && <Alert severity="error" onClose={() => load(periodo)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : resumen && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
            <StatHero icon={<Car size={19} />} tone={TONES.blue} label="Móviles totales" value={resumen.total_moviles} sub="Total flota" />
            <StatHero icon={<HandCoins size={19} />} tone={TONES.emerald} label="Móviles pagados" value={resumen.pagados} sub="Semana actual" />
            <StatHero icon={<AlarmClock size={19} />} tone={TONES.red} label="Móviles sin pagar" value={resumen.pendientes} sub="Semana actual" />
            <StatHero icon={<DollarSign size={19} />} tone={TONES.teal} label="Recaudación semanal" value={`$${resumen.cobrado.toLocaleString('es-CL')}`} sub="Total cobrado" />
          </Box>

          {resumen.total_moviles > 0 && (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>Avance de cobranza</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{resumen.pagados} / {resumen.total_moviles} móviles</Typography>
                </Box>
                <LinearProgress
                  variant="determinate" value={Math.min(resumen.porcentaje, 100)}
                  sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,.07)', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: barColor } }}
                />
                <Typography sx={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,.55)', mt: 0.5 }}>{resumen.porcentaje}%</Typography>
              </CardContent>
            </Card>
          )}

          <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Car size={15} color="rgba(255,255,255,.70)" />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Todos los móviles — <Box component="span" sx={{ textTransform: 'capitalize' }}>{periodoLabel(periodo)}</Box>
              </Typography>
              <Typography sx={{ ml: 'auto', fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{resumen.pagados} / {resumen.total_moviles} pagados</Typography>
            </Box>

            {detalle.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5, fontSize: 13 }}>No hay móviles registrados.</Typography>
            ) : (
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {detalle.map(d => {
                  const bloqueado = d.estado_socio === 'BLOQUEADO';
                  const yaAtraso  = d.cuotas_vencidas > 0;
                  return (
                    <Box
                      key={d.id_movil}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '140px 1fr 130px 150px 130px auto' },
                        alignItems: 'center', gap: 1.5,
                        bgcolor: bloqueado ? 'rgba(248,113,113,.10)' : 'background.paper',
                        border: '1px solid', borderColor: bloqueado ? 'rgba(248,113,113,.30)' : 'divider',
                        borderRadius: 3, px: 2, py: 1.5,
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <Car size={13} color="rgba(255,255,255,.55)" />
                          <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, fontSize: 13 }}>{d.patente}</Typography>
                        </Box>
                        {d.estado_movil === 'BLOQUEADO' && (
                          <Chip label="MÓVIL BLOQ." size="small" sx={{ mt: 0.4, bgcolor: 'rgba(248,113,113,.14)', color: '#f87171', fontWeight: 700, fontSize: 9, height: 18 }} />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <InitialsAvatar nombre={d.socio} size={32} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{d.socio}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{d.rut}</Typography>
                        </Box>
                      </Box>

                      <Box>
                        {yaAtraso ? (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#f87171', fontWeight: 700, fontSize: 12 }}>
                              <AlertTriangle size={13} /> {d.cuotas_vencidas} cuota{d.cuotas_vencidas !== 1 ? 's' : ''}
                            </Box>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#f87171', fontFamily: 'Roboto Mono, monospace' }}>
                              ${d.monto_adeudado.toLocaleString('es-CL')}
                            </Typography>
                          </>
                        ) : <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Sin atrasos</Typography>}
                      </Box>

                      <Box>
                        <Chip label={PAGO_LABEL[d.estado_pago]} size="small" sx={{ bgcolor: PAGO_STYLE[d.estado_pago].bg, color: PAGO_STYLE[d.estado_pago].fg, fontWeight: 700, fontSize: 10.5 }} />
                        {d.fecha_pago && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)', mt: 0.4 }}>{new Date(d.fecha_pago).toLocaleDateString('es-CL')}</Typography>}
                      </Box>

                      <Box>
                        {bloqueado ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 700, color: '#f87171' }}>
                            <Lock size={13} /> Bloqueado
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                            <CheckCircle2 size={13} /> Activo
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 140 }}>
                        {d.estado_pago !== 'PAGADO' && d.estado_pago !== 'EXENTO' && (
                          <Button
                            size="small" variant="contained" color="success" disabled={pagando === d.id_socio}
                            onClick={() => marcarPagado(d)}
                            startIcon={pagando === d.id_socio ? <CircularProgress size={12} color="inherit" /> : <CheckCircle2 size={13} />}
                            sx={{ fontSize: 11 }}
                          >
                            Pagar período
                          </Button>
                        )}
                        {yaAtraso && (
                          <Button
                            size="small" variant="contained" onClick={() => setModalAtrasos(d)}
                            startIcon={<ShieldOff size={13} />}
                            sx={{ fontSize: 11, bgcolor: colors.accent600, '&:hover': { bgcolor: colors.accent700 } }}
                          >
                            Saldar atrasos
                          </Button>
                        )}
                        {d.estado_pago === 'PAGADO' && !yaAtraso && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle2 size={15} /> Al día
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </>
      )}

      {modalAtrasos && (
        <ModalAtrasos item={modalAtrasos} onClose={() => setModalAtrasos(null)} onPagado={() => { setModalAtrasos(null); load(periodo); }} />
      )}

      <Dialog open={confirmCierre} onClose={() => setConfirmCierre(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Lock size={20} color="#f87171" />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Cerrar semana</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Los móviles marcados <strong>Pagado</strong> quedan tal cual — ese dinero ya se sumó al fondo de tesorería.
            Los que <strong>no pagaron</strong> esta semana quedarán <strong>VENCIDO</strong> y su socio se bloqueará
            automáticamente (bloqueo acumulativo: si sigue sin pagar, se suma otra cuota la próxima semana).
            <br /><br />
            <strong>Esta acción no se puede deshacer.</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirmCierre(false)} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>Cancelar</Button>
          <Button
            fullWidth variant="contained" color="error" disabled={cerrando} onClick={ejecutarCierre}
            startIcon={cerrando ? <CircularProgress size={14} color="inherit" /> : <Lock size={15} />}
          >
            Cerrar semana
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
