import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Car, RefreshCw, CheckCircle, XCircle, Clock, PhoneCall, BarChart3, MapPin, Trophy } from 'lucide-react';
import { getPerfilConductor, type PerfilConductor } from '../api/conductor';
import { colors } from '../theme';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDIENTE:  { bg: '#fdece2', fg: '#c2410c' },
  ASIGNADO:   { bg: '#e8ecf9', fg: '#3355a8' },
  EN_CURSO:   { bg: '#f3e8fd', fg: '#7e22ce' },
  COMPLETADO: { bg: '#e4f3ec', fg: '#2f7d5b' },
  CANCELADO:  { bg: '#f1efe9', fg: '#8a8071' },
};

const CUOTA_STYLE: Record<string, { bg: string; fg: string }> = {
  PAGADO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  PENDIENTE: { bg: '#fdf1dc', fg: colors.accent700 },
  VENCIDO:   { bg: '#fbe9e9', fg: '#c0392b' },
  EXENTO:    { bg: '#f1efe9', fg: '#6b6152' },
};

const CUOTA_ICON: Record<string, React.ReactNode> = {
  PAGADO:    <CheckCircle size={15} color="#2f7d5b" />,
  PENDIENTE: <Clock size={15} color={colors.accent700} />,
  VENCIDO:   <XCircle size={15} color="#c0392b" />,
  EXENTO:    <CheckCircle size={15} color="#a89f8f" />,
};

const MOVIL_ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  DISPONIBLE:  { bg: '#e4f3ec', fg: '#2f7d5b' },
  EN_SERVICIO: { bg: '#e8ecf9', fg: '#3355a8' },
  EN_VIAJE:    { bg: '#f1e7fb', fg: '#7128b8' },
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
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Hola, {socio.nombre} 👋</Typography>
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
                  bgcolor: '#e9e6dc', border: '2.5px solid #2a2519', borderRadius: 2, px: 2, py: 1,
                  boxShadow: '0 2px 6px rgba(20,17,11,.15)', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', letterSpacing: 1, color: '#14110b' }}>
                    {movil.patente}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{[movil.marca, movil.modelo].filter(Boolean).join(' ')} {movil.anio ?? ''}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#a89f8f' }}>{movil.color ?? ''}</Typography>
                  <Chip
                    label={movil.estado_operativo.replace('_', ' ')} size="small"
                    sx={{
                      mt: 0.5, alignSelf: 'flex-start', fontWeight: 700, fontSize: 10.5,
                      bgcolor: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.bg ?? '#fbe9e9',
                      color: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.fg ?? '#c0392b',
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
              <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: '#f3e8fd', color: '#7e22ce', display: 'flex' }}>
                <PhoneCall size={18} />
              </Box>
              <Typography sx={{ fontWeight: 700 }}>Resumen de hoy</Typography>
              <BarChart3 size={16} color="#c4bda9" style={{ marginLeft: 'auto' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Total carreras', value: solicitudes_hoy.length, color: 'text.primary' },
                { label: 'Completadas', value: completadas, color: '#2f7d5b' },
                { label: 'En curso', value: solicitudes_hoy.filter(s => s.estado === 'EN_CURSO').length, color: '#7e22ce' },
                { label: 'Canceladas', value: solicitudes_hoy.filter(s => s.estado === 'CANCELADO').length, color: '#a89f8f' },
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
            Mis carreras de hoy <Box component="span" sx={{ color: '#a89f8f', fontWeight: 400 }}>({solicitudes_hoy.length} carrera{solicitudes_hoy.length === 1 ? '' : 's'})</Box>
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
                    <TableCell sx={{ fontSize: 13 }}>{s.origen} <Box component="span" sx={{ color: '#a89f8f', mx: 0.5 }}>→</Box> {s.destino}</TableCell>
                    <TableCell>
                      <Chip label={s.estado} size="small" sx={{ bgcolor: ESTADO_STYLE[s.estado]?.bg, color: ESTADO_STYLE[s.estado]?.fg, fontWeight: 700, fontSize: 10.5 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#a89f8f' }}>
                      {new Date(s.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
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
