import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Alert, CircularProgress, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import { BarChart2, RefreshCw, PhoneCall, ClipboardList, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { getSolicitudes } from '../api/solicitudes';
import type { Solicitud } from '../types';
import { exportarAExcel } from '../utils/exportarExcel';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  '#c2410c',
  ASIGNADO:   '#3355a8',
  EN_CURSO:   '#7e22ce',
  COMPLETADO: '#2f7d5b',
  CANCELADO:  '#33415c',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASIGNADO: 'Asignado', EN_CURSO: 'En curso', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

// Orden fijo para que la leyenda y el anillo siempre salgan en el mismo orden.
const ORDEN_ESTADOS = ['CANCELADO', 'COMPLETADO', 'PENDIENTE', 'ASIGNADO', 'EN_CURSO'];

type Tone = { fg: string; bg: string; iconBg: string };

const TONES: Record<string, Tone> = {
  blue:    { fg: '#3355a8', bg: '#e1e6f8', iconBg: 'rgba(255,255,255,.65)' },
  emerald: { fg: '#2f7d5b', bg: '#dcf1e6', iconBg: 'rgba(255,255,255,.65)' },
  red:     { fg: '#c0392b', bg: '#fbe9e9', iconBg: 'rgba(255,255,255,.65)' },
};

function StatHero({
  icon, tone, label, value,
}: { icon: React.ReactNode; tone: Tone; label: string; value: React.ReactNode }) {
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
          <Typography sx={{ fontSize: 26, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', color: '#241f16', lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 12, color: tone.fg, fontWeight: 600 }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function DonutEstados({ segmentos, total }: { segmentos: { estado: string; total: number }[]; total: number }) {
  const size = 190;
  const r = 72;
  const strokeWidth = 26;
  const circunferencia = 2 * Math.PI * r;
  const gap = total > 0 ? 4 : 0; // separacion visual entre segmentos, en px de arco

  let acumulado = 0;
  const arcos = segmentos.map(s => {
    const largo = Math.max((s.total / total) * circunferencia - gap, 0);
    const offset = circunferencia - acumulado;
    acumulado += (s.total / total) * circunferencia;
    return { ...s, largo, offset };
  });

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1efe9" strokeWidth={strokeWidth} />
          {arcos.map(a => (
            <circle
              key={a.estado}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={ESTADO_COLOR[a.estado]} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${a.largo} ${circunferencia - a.largo}`}
              strokeDashoffset={a.offset}
            />
          ))}
        </g>
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: '.04em' }}>TOTAL</Typography>
        <Typography sx={{ fontSize: 32, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', color: '#241f16', lineHeight: 1 }}>{total}</Typography>
      </Box>
    </Box>
  );
}

export default function ReportesCentralPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setSolicitudes(await getSolicitudes());
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hoy = new Date().toDateString();
  const solicitudesHoy = solicitudes.filter(s => new Date(s.fecha_hora).toDateString() === hoy);
  const sinContacto    = solicitudes.filter(s => s.observaciones === 'SIN_CONTACTO');

  const porEstadoHoy = ORDEN_ESTADOS
    .map(estado => ({ estado, total: solicitudesHoy.filter(s => s.estado === estado).length }))
    .filter(e => e.total > 0);
  const totalHoy = solicitudesHoy.length;

  const exportar = () => {
    exportarAExcel(`TaxiAsiste_Reporte_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}`, [{
      nombre: 'Solicitudes de hoy',
      columnas: [
        { header: 'Folio', key: 'folio', width: 14 },
        { header: 'Origen', key: 'origen', width: 28 },
        { header: 'Destino', key: 'destino', width: 28 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Canal', key: 'canal', width: 12 },
        { header: 'Hora', key: 'hora', width: 10 },
      ],
      filas: solicitudesHoy.map(s => ({
        folio: s.folio,
        origen: s.origen,
        destino: s.destino,
        estado: ESTADO_LABEL[s.estado] ?? s.estado,
        canal: s.canal_entrada,
        hora: new Date(s.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      })),
    }]);
  };

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={exportar}
            sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
            Exportar
          </Button>
          <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        <StatHero icon={<ClipboardList size={19} />} tone={TONES.blue} label="Solicitudes hoy" value={solicitudesHoy.length} />
        <StatHero icon={<CheckCircle2 size={19} />} tone={TONES.emerald} label="Completadas hoy" value={solicitudesHoy.filter(s => s.estado === 'COMPLETADO').length} />
        <StatHero icon={<AlertTriangle size={19} />} tone={TONES.red} label="Sin contacto (total)" value={sinContacto.length} />
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PhoneCall size={17} color="#6b6152" />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Análisis de Solicitudes por Estado (Hoy)</Typography>
            <Typography sx={{ ml: 'auto', fontSize: 13, color: 'text.secondary' }}>
              Total: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{totalHoy}</Box>
            </Typography>
          </Box>

          {totalHoy === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4, fontSize: 13 }}>
              Aún no hay solicitudes registradas hoy.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 130 }}>
                {porEstadoHoy.map(e => (
                  <Box key={e.estado} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ESTADO_COLOR[e.estado], flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{ESTADO_LABEL[e.estado]}</Typography>
                  </Box>
                ))}
              </Box>

              <DonutEstados segmentos={porEstadoHoy} total={totalHoy} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 70, alignItems: 'flex-end' }}>
                {porEstadoHoy.map(e => (
                  <Typography key={e.estado} sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
                    {e.total} unid.
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
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
