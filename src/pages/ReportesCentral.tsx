import { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import { BarChart2, RefreshCw, PhoneCall } from 'lucide-react';
import { getSolicitudesPorEstado } from '../api/reportes';
import { getSolicitudes } from '../api/solicitudes';
import type { SolicitudPorEstado, Solicitud } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  '#c2410c',
  ASIGNADO:   '#3355a8',
  EN_CURSO:   '#7e22ce',
  COMPLETADO: '#2f7d5b',
  CANCELADO:  '#a89f8f',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASIGNADO: 'Asignado', EN_CURSO: 'En curso', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

export default function ReportesCentralPage() {
  const [porEstado, setPorEstado]     = useState<SolicitudPorEstado[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [e, s] = await Promise.all([getSolicitudesPorEstado(), getSolicitudes()]);
      setPorEstado(e);
      setSolicitudes(s);
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hoy = new Date().toDateString();
  const solicitudesHoy  = solicitudes.filter(s => new Date(s.fecha_hora).toDateString() === hoy);
  const sinContacto     = solicitudes.filter(s => s.observaciones === 'SIN_CONTACTO');
  const totalSolicitudes = porEstado.reduce((acc, e) => acc + e.total, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
        <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" action={<IconButton size="small" onClick={load}><RefreshCw size={16} /></IconButton>}>{error}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BarChart2 size={22} color="#3a3327" />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Reportes</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{solicitudesHoy.length}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>Solicitudes hoy</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#2f7d5b' }}>
            {solicitudesHoy.filter(s => s.estado === 'COMPLETADO').length}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>Completadas hoy</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c2410c' }}>{sinContacto.length}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>Sin contacto (total)</Typography>
        </CardContent></Card>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PhoneCall size={17} color="#6b6152" />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Solicitudes por estado</Typography>
            <Typography sx={{ ml: 'auto', fontSize: 13, color: 'text.secondary' }}>
              Total: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{totalSolicitudes}</Box>
            </Typography>
          </Box>

          {totalSolicitudes > 0 && (
            <Box sx={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', mb: 2.5, gap: '2px' }}>
              {porEstado.filter(e => e.total > 0).map(e => (
                <Box key={e.estado} title={`${e.estado}: ${e.total}`} sx={{ bgcolor: ESTADO_COLOR[e.estado], width: `${(e.total / totalSolicitudes) * 100}%` }} />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {porEstado.map(e => (
              <Box key={e.estado} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ESTADO_COLOR[e.estado], flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary', width: 100 }}>{ESTADO_LABEL[e.estado]}</Typography>
                <LinearProgress
                  variant="determinate" value={totalSolicitudes > 0 ? (e.total / totalSolicitudes) * 100 : 0}
                  sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#f1efe9', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: ESTADO_COLOR[e.estado] } }}
                />
                <Typography sx={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: 'right', fontFamily: 'Roboto Mono, monospace' }}>{e.total}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {sinContacto.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>Sin contacto registrados</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Folio', 'Origen → Destino', 'Fecha'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sinContacto.map(s => (
                    <TableRow key={s.id_solicitud} hover>
                      <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 12, color: 'text.secondary' }}>{s.folio}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{s.origen} → {s.destino}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#a89f8f' }}>
                        {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
