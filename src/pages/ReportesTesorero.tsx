import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Button, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  DollarSign, RefreshCw, CheckCircle2,
  ChevronLeft, ChevronRight, Lock, Car, Settings,
  AlertTriangle, ShieldOff, X,
} from 'lucide-react';
import { getResumenTesorero, cerrarPeriodo } from '../api/reportes';
import { pagarMovil, pagarAtrasos } from '../api/tesoreria';
import type { ResumenTesorero, DetalleMovilCuota } from '../types';
import { colors } from '../theme';

const PAGO_STYLE: Record<string, { bg: string; fg: string }> = {
  PAGADO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  PENDIENTE: { bg: '#fdece2', fg: '#c2410c' },
  VENCIDO:   { bg: '#fbe9e9', fg: '#c0392b' },
  EXENTO:    { bg: '#f1efe9', fg: '#6b6152' },
  SIN_CUOTA: { bg: '#f1efe9', fg: '#a89f8f' },
};
const PAGO_LABEL: Record<string, string> = {
  PAGADO: 'Pagado', PENDIENTE: 'Pendiente', VENCIDO: 'Vencido', EXENTO: 'Exento', SIN_CUOTA: 'Sin cuota',
};

function hoyPeriodo() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function periodoLabel(p: string) {
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}
function prevMes(p: string) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMes(p: string) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
          <ShieldOff size={20} color="#c2410c" />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Saldar atrasos</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ bgcolor: '#fdece2', border: '1px solid #f5c69e', borderRadius: 3, p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{item.socio}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Patente: <Box component="span" sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}>{item.patente}</Box>
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#c2410c', fontWeight: 600, mt: 1 }}>
            {item.cuotas_vencidas} cuota{item.cuotas_vencidas !== 1 ? 's' : ''} vencida{item.cuotas_vencidas !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          Se registrará el ingreso de <strong>cada cuota vencida</strong> en tesorería y el socio quedará{' '}
          <Box component="span" sx={{ color: '#2f7d5b', fontWeight: 700 }}>ACTIVO</Box> automáticamente.
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
      const r = await cerrarPeriodo();
      setConfirmCierre(false);
      alert(`Cierre ejecutado:\n• ${r.cuotas_vencidas} cuotas → VENCIDO\n• ${r.socios_bloqueados} socios bloqueados`);
      await load(periodo);
    } catch {
      alert('Error al ejecutar el cierre.');
    } finally { setCerrando(false); }
  };

  const esPeriodoActual = periodo === hoyPeriodo();
  const hayPendientes   = (resumen?.pendientes ?? 0) > 0;

  const detalle = resumen?.detalle.slice().sort((a, b) => {
    if (a.estado_socio === 'BLOQUEADO' && b.estado_socio !== 'BLOQUEADO') return -1;
    if (a.estado_socio !== 'BLOQUEADO' && b.estado_socio === 'BLOQUEADO') return 1;
    return 0;
  }) ?? [];

  const barColor = !resumen ? colors.accent500
    : resumen.porcentaje >= 80 ? '#2f7d5b' : resumen.porcentaje >= 50 ? colors.accent500 : '#c0392b';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DollarSign size={22} color="#3a3327" />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Reportes — Tesorería</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Control de recaudación por período</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {esPeriodoActual && hayPendientes && (
            <Button variant="contained" color="error" startIcon={<Lock size={15} />} onClick={() => setConfirmCierre(true)}>
              Cierre de período
            </Button>
          )}
          <IconButton onClick={() => load(periodo)} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
          <IconButton size="small" onClick={() => setPeriodo(prevMes(periodo))}><ChevronLeft size={17} /></IconButton>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>
            {periodoLabel(periodo)}
          </Typography>
          <IconButton size="small" onClick={() => setPeriodo(nextMes(periodo))}><ChevronRight size={17} /></IconButton>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
          <Settings size={16} color="#a89f8f" />
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>Tarifa semanal por móvil:</Typography>
          {editTarifa ? (
            <TextField
              type="number" size="small" value={tarifa} autoFocus
              onChange={e => setTarifa(e.target.value)}
              onBlur={() => setEditTarifa(false)}
              sx={{ width: 130 }}
            />
          ) : (
            <Chip
              label={`$${Number(tarifa).toLocaleString('es-CL')}`}
              onClick={() => setEditTarifa(true)}
              sx={{ bgcolor: '#fdf1dc', color: colors.accent700, fontWeight: 700, cursor: 'pointer' }}
            />
          )}
          <Typography sx={{ fontSize: 11, color: '#a89f8f', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>Haz clic para editar</Typography>
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
            <Card sx={{ borderRadius: 3 }}><CardContent>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Total móviles</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{resumen.total_moviles}</Typography>
            </CardContent></Card>
            <Card sx={{ borderRadius: 3 }}><CardContent>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Pagados</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#2f7d5b' }}>{resumen.pagados}</Typography>
            </CardContent></Card>
            <Card sx={{ borderRadius: 3 }}><CardContent>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Sin pagar</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c2410c' }}>{resumen.pendientes}</Typography>
            </CardContent></Card>
            <Card sx={{ borderRadius: 3 }}><CardContent>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Cobrado período</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>${resumen.cobrado.toLocaleString('es-CL')}</Typography>
            </CardContent></Card>
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
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#f1efe9', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: barColor } }}
                />
                <Typography sx={{ textAlign: 'right', fontSize: 11, color: '#a89f8f', mt: 0.5 }}>{resumen.porcentaje}%</Typography>
              </CardContent>
            </Card>
          )}

          <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Car size={15} color="#6b6152" />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Todos los móviles — <Box component="span" sx={{ textTransform: 'capitalize' }}>{periodoLabel(periodo)}</Box>
              </Typography>
              <Typography sx={{ ml: 'auto', fontSize: 11, color: '#a89f8f' }}>{resumen.pagados} / {resumen.total_moviles} pagados</Typography>
            </Box>

            {detalle.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5, fontSize: 13 }}>No hay móviles registrados.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Patente', 'Socio / Conductor', 'Atrasos', 'Cuota actual', 'Estado', 'Acción'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.map(d => {
                      const bloqueado = d.estado_socio === 'BLOQUEADO';
                      const yaAtraso  = d.cuotas_vencidas > 0;
                      return (
                        <TableRow key={d.id_movil} hover sx={bloqueado ? { bgcolor: 'rgba(192,57,43,.04)' } : undefined}>
                          <TableCell>
                            <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, fontSize: 13 }}>{d.patente}</Typography>
                            {d.estado_movil === 'BLOQUEADO' && (
                              <Chip label="BLOQUEADO" size="small" sx={{ mt: 0.25, bgcolor: '#fbe9e9', color: '#c0392b', fontWeight: 700, fontSize: 9, height: 18 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{d.socio}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#a89f8f' }}>{d.rut}</Typography>
                          </TableCell>
                          <TableCell>
                            {yaAtraso ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#c0392b', fontWeight: 700, fontSize: 12 }}>
                                <AlertTriangle size={13} /> {d.cuotas_vencidas} cuota{d.cuotas_vencidas !== 1 ? 's' : ''}
                              </Box>
                            ) : <Typography sx={{ fontSize: 12, color: '#c4bda9' }}>—</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip label={PAGO_LABEL[d.estado_pago]} size="small" sx={{ bgcolor: PAGO_STYLE[d.estado_pago].bg, color: PAGO_STYLE[d.estado_pago].fg, fontWeight: 700, fontSize: 10.5 }} />
                            {d.fecha_pago && <Typography sx={{ fontSize: 11, color: '#a89f8f', mt: 0.25 }}>{new Date(d.fecha_pago).toLocaleDateString('es-CL')}</Typography>}
                          </TableCell>
                          <TableCell>
                            {bloqueado ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 700, color: '#c0392b' }}>
                                <Lock size={13} /> BLOQUEADO
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 700, color: '#2f7d5b' }}>
                                <CheckCircle2 size={13} /> Activo
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#2f7d5b', fontSize: 12, fontWeight: 600 }}>
                                  <CheckCircle2 size={15} /> Al día
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
          <Lock size={20} color="#c0392b" />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Cierre de período</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Se marcarán como <strong>VENCIDO</strong> las cuotas pendientes con fecha de vencimiento pasada
            y se bloquearán los socios morosos.
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
            Ejecutar cierre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
