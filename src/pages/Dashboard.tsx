import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Card, CardContent, Alert as MAlert, CircularProgress } from '@mui/material';
import {
  Car, PhoneCall, RefreshCw, LayoutDashboard, UserCheck, UserX, CarFront,
  Timer, Route, CheckCircle2, Wallet, CalendarClock, BarChart3,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { getDashboard, getSolicitudesPorEstado } from '../api/reportes';
import type { Dashboard, SolicitudPorEstado } from '../types';
import { colors } from '../theme';

const ESTADO_CHART_COLOR: Record<string, string> = {
  PENDIENTE:  '#c2410c',
  ASIGNADO:   '#3355a8',
  EN_CURSO:   '#7e22ce',
  COMPLETADO: '#2f7d5b',
  CANCELADO:  '#a89f8f',
};

const ESTADO_CHART_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASIGNADO: 'Asignado', EN_CURSO: 'En curso', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

function EstadoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <Box sx={{ bgcolor: colors.ink, color: '#fff', px: 1.5, py: 1, borderRadius: 2, fontSize: 12 }}>
      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{p.label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{p.total}</Typography>
    </Box>
  );
}

type Tone = { fg: string; bg: string; grad: string };

const TONES: Record<string, Tone> = {
  emerald: { fg: '#2f7d5b', bg: '#e4f3ec', grad: 'linear-gradient(135deg,#5fbf8f,#2f7d5b)' },
  red:     { fg: '#c0392b', bg: '#fbe9e9', grad: 'linear-gradient(135deg,#f08a7d,#c0392b)' },
  blue:    { fg: '#3355a8', bg: '#e8ecf9', grad: 'linear-gradient(135deg,#7d95d8,#3355a8)' },
  amber:   { fg: colors.accent700, bg: '#fdf1dc', grad: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
  violet:  { fg: '#7e22ce', bg: '#f3e8fd', grad: 'linear-gradient(135deg,#c084f5,#7e22ce)' },
  orange:  { fg: '#c2410c', bg: '#fdece2', grad: 'linear-gradient(135deg,#f5a06b,#c2410c)' },
};

function HeroStat({
  title, value, total, icon, tone, unidad,
}: { title: string; value: number; total: number; icon: React.ReactNode; tone: Tone; unidad: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card sx={{ borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0, opacity: 0.06, background: tone.grad }} />
      <CardContent sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tone.grad, color: '#fff', boxShadow: `0 4px 12px ${tone.fg}40`,
          }}>
            {icon}
          </Box>
          {total > 0 && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: tone.fg, bgcolor: tone.bg, px: 1.25, py: 0.4, borderRadius: 5 }}>
              {pct}%
            </Typography>
          )}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 36, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', lineHeight: 1, color: '#2a2519' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {title} <Box component="span" sx={{ color: '#c4bda9' }}>· {unidad}</Box>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function MiniRow({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: Tone }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.1 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 2.25, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: tone.bg, color: tone.fg,
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', flex: 1 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{value}</Typography>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a89f8f', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [porEstado, setPorEstado] = useState<SolicitudPorEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, e] = await Promise.all([getDashboard(), getSolicitudesPorEstado()]);
      setData(d);
      setPorEstado(e);
    } catch {
      setError('No se pudo cargar el dashboard. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fecha = data
    ? new Date(data.fecha).toLocaleDateString('es-CL', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : undefined;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
        <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando dashboard...
      </Box>
    );
  }

  if (error || !data) {
    return <MAlert severity="error" action={<IconButton size="small" onClick={load}><RefreshCw size={16} /></IconButton>}>{error ?? 'Error desconocido'}</MAlert>;
  }

  const totalSocios  = data.socios.activos + data.socios.bloqueados;
  const totalMoviles = data.moviles.disponibles + data.moviles.en_servicio;
  const hayChart = porEstado.some(e => e.total > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LayoutDashboard size={22} color="#3a3327" />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Dashboard</Typography>
            {fecha && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textTransform: 'capitalize' }}>{fecha}</Typography>}
          </Box>
        </Box>
        <IconButton onClick={load} sx={{
          color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
          '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
        }}>
          <RefreshCw size={17} />
        </IconButton>
      </Box>

      {/* Fila hero: 3 métricas principales */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
        <HeroStat
          title="Socios activos" value={data.socios.activos} total={totalSocios} unidad={`${data.socios.bloqueados} bloqueados`}
          icon={<UserCheck size={19} />} tone={TONES.emerald}
        />
        <HeroStat
          title="Móviles disponibles" value={data.moviles.disponibles} total={totalMoviles} unidad={`${data.moviles.en_servicio} en servicio`}
          icon={<Car size={19} />} tone={TONES.blue}
        />
        <HeroStat
          title="Solicitudes en curso" value={data.solicitudes.en_curso} total={0} unidad={`${data.solicitudes.pendientes} pendientes`}
          icon={<Route size={19} />} tone={TONES.violet}
        />
      </Box>

      {/* Fila principal: gráfico + panel resumen */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, alignItems: 'stretch' }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BarChart3 size={16} color="#6b6152" />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
                Solicitudes por estado — Total: {porEstado.reduce((acc, e) => acc + e.total, 0)}
              </Typography>
            </Box>
            {hayChart ? (
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porEstado.map(e => ({ estado: e.estado, label: ESTADO_CHART_LABEL[e.estado], total: e.total }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid vertical={false} stroke="#ece7db" />
                    <XAxis
                      dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: '#6b6152' }}
                    />
                    <Tooltip cursor={{ fill: '#f1efe9' }} content={<EstadoTooltip />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={56}>
                      {porEstado.map(e => (
                        <Cell key={e.estado} fill={ESTADO_CHART_COLOR[e.estado] ?? colors.accent500} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 13, minHeight: 260 }}>
                Todavía no hay solicitudes registradas.
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <SectionLabel>Resumen</SectionLabel>
            <Box sx={{
              display: 'flex', flexDirection: 'column',
              '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
            }}>
              <MiniRow icon={<PhoneCall size={14} />} label="Solicitudes hoy" value={data.solicitudes.hoy} tone={TONES.violet} />
              <MiniRow icon={<CheckCircle2 size={14} />} label="Completadas hoy" value={data.solicitudes.completadas_hoy} tone={TONES.emerald} />
              <MiniRow icon={<Timer size={14} />} label="Solicitudes pendientes" value={data.solicitudes.pendientes} tone={TONES.orange} />
              <MiniRow icon={<CarFront size={14} />} label="Móviles en servicio" value={data.moviles.en_servicio} tone={TONES.amber} />
              <MiniRow icon={<UserX size={14} />} label="Socios bloqueados" value={data.socios.bloqueados} tone={TONES.red} />
              <MiniRow icon={<Wallet size={14} />} label="Cuotas pendientes" value={data.cuotas.pendientes} tone={TONES.amber} />
              <MiniRow icon={<CalendarClock size={14} />} label="Cuotas vencidas" value={data.cuotas.vencidas} tone={TONES.red} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
