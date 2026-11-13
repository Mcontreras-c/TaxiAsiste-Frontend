import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Car, RefreshCw, CheckCircle, XCircle, Clock, PhoneCall, BarChart3, MapPin, Trophy } from 'lucide-react';
import { getPerfilConductor, type PerfilConductor } from '../api/conductor';
import { colors } from '../theme';

import { formatoHora } from '../utils/formatoFecha';
const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDIENTE:  { bg: 'rgba(251,146,60,.14)', fg: '#fb923c' },
  ASIGNADO:   { bg: 'rgba(96,165,250,.14)', fg: '#60a5fa' },
  EN_CURSO:   { bg: 'rgba(192,132,252,.14)', fg: '#c084fc' },
  COMPLETADO: { bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  CANCELADO:  { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.55)' },
};

const CUOTA_STYLE: Record<string, { bg: string; fg: string }> = {
  PAGADO:    { bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  PENDIENTE: { bg: 'rgba(255,222,0,.12)', fg: colors.accent700 },
  VENCIDO:   { bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  EXENTO:    { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.70)' },
};

const CUOTA_ICON: Record<string, React.ReactNode> = {
  PAGADO:    <CheckCircle size={15} color="#34d399" />,
  PENDIENTE: <Clock size={15} color={colors.accent700} />,
  VENCIDO:   <XCircle size={15} color="#f87171" />,
  EXENTO:    <CheckCircle size={15} color="rgba(255,255,255,.55)" />,
};

const MOVIL_ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  DISPONIBLE:  { bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  EN_SERVICIO: { bg: 'rgba(96,165,250,.14)', fg: '#60a5fa' },
  EN_VIAJE:    { bg: 'rgba(192,132,252,.14)', fg: '#c084fc' },
};

export default function ConductorPage() {
  const [perfil, setPerfil] = useState<PerfilConductor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setPerfil(await getPerfilConductor());
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
        <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
      </Box>
    );
  }

  if (error || !perfil) {
    return <Alert severity="error">{error}</Alert>;
  }

  const { socio, movil, solicitudes_hoy, cuotas, fecha } = perfil;
  const moroso = cuotas.some(c => c.estado_pago === 'VENCIDO');
  const completadas = solicitudes_hoy.filter(s => s.estado === 'COMPLETADO').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>Hola, {socio.nombre} 👋</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textTransform: 'capitalize' }}>
            {new Date(fecha).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      {moroso && (
        <Alert severity="error" icon={<XCircle size={18} />}>
          <strong>Tienes cuotas vencidas.</strong> Contáctate con el tesorero para regularizar tu situación.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 2 }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{
                p: 1.25, borderRadius: 2.5, display: 'flex',
                background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`, color: colors.ink,
              }}>
                <Car size={18} />
              </Box>
              <Typography sx={{ fontWeight: 700 }}>Mi móvil</Typography>
            </Box>
            {movil ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{
                  bgcolor: 'rgba(255,255,255,.12)', border: '2.5px solid #ffffff', borderRadius: 2, px: 2, py: 1,
                  boxShadow: '0 2px 6px rgba(20,17,11,.15)', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', letterSpacing: 1, color: '#14110b' }}>
                    {movil.patente}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{[movil.marca, movil.modelo].filter(Boolean).join(' ')} {movil.anio ?? ''}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{movil.color ?? ''}</Typography>
                  <Chip
                    label={movil.estado_operativo.replace('_', ' ')} size="small"
                    sx={{
                      mt: 0.5, alignSelf: 'flex-start', fontWeight: 700, fontSize: 10.5,
                      bgcolor: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.bg ?? 'rgba(248,113,113,.14)',
                      color: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.fg ?? '#f87171',
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No tienes un móvil asignado.</Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(192,132,252,.14)', color: '#c084fc', display: 'flex' }}>
                <PhoneCall size={18} />
              </Box>
              <Typography sx={{ fontWeight: 700 }}>Resumen de hoy</Typography>
              <BarChart3 size={16} color="rgba(255,255,255,.35)" style={{ marginLeft: 'auto' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Total carreras', value: solicitudes_hoy.length, color: 'text.primary' },
                { label: 'Completadas', value: completadas, color: '#34d399' },
                { label: 'En curso', value: solicitudes_hoy.filter(s => s.estado === 'EN_CURSO').length, color: '#c084fc' },
                { label: 'Canceladas', value: solicitudes_hoy.filter(s => s.estado === 'CANCELADO').length, color: 'rgba(255,255,255,.55)' },
              ].map(row => (
                <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: row.color, fontFamily: 'Roboto Mono, monospace' }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
            Mis carreras de hoy <Box component="span" sx={{ color: 'rgba(255,255,255,.55)', fontWeight: 400 }}>({solicitudes_hoy.length} carrera{solicitudes_hoy.length === 1 ? '' : 's'})</Box>
          </Typography>
        </Box>
        {solicitudes_hoy.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5, fontSize: 13 }}>Sin carreras asignadas hoy.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Folio</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MapPin size={12} /> Origen → Destino</Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Trophy size={12} /> Estado</Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {solicitudes_hoy.map(s => (
                  <TableRow key={s.id_solicitud} hover>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 12, color: 'text.secondary' }}>{s.folio}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{s.origen} <Box component="span" sx={{ color: 'rgba(255,255,255,.55)', mx: 0.5 }}>→</Box> {s.destino}</TableCell>
                    <TableCell>
                      <Chip label={s.estado} size="small" sx={{ bgcolor: ESTADO_STYLE[s.estado]?.bg, color: ESTADO_STYLE[s.estado]?.fg, fontWeight: 700, fontSize: 10.5 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                      {formatoHora(s.fecha_hora)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Mis cuotas</Typography>
        </Box>
        {cuotas.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5, fontSize: 13 }}>Sin cuotas registradas.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Período', 'Monto', 'Vencimiento', 'Estado'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cuotas.map(c => (
                  <TableRow key={c.id_cuota} hover>
                    <TableCell sx={{ fontSize: 13 }}>{c.periodo}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>${Number(c.monto).toLocaleString('es-CL')}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{new Date(c.fecha_vencimiento).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {CUOTA_ICON[c.estado_pago]}
                        <Chip label={c.estado_pago} size="small" sx={{ bgcolor: CUOTA_STYLE[c.estado_pago]?.bg, color: CUOTA_STYLE[c.estado_pago]?.fg, fontWeight: 700, fontSize: 10.5 }} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
