import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Card, CardContent, Alert as MAlert, CircularProgress as MuiCircularProgress } from '@mui/material';
import {
  Car, PhoneCall, RefreshCw, LayoutDashboard, UserCheck, UserX, CarFront,
  Timer, Route, CheckCircle2, Wallet, CalendarClock, BarChart3, TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
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

type Tone = { fg: string; bg: string; grad: string; iconBg: string };

const TONES: Record<string, Tone> = {
  emerald: { fg: '#2f7d5b', bg: '#dcf1e6', grad: 'linear-gradient(135deg,#5fbf8f,#2f7d5b)', iconBg: 'rgba(255,255,255,.65)' },
  red:     { fg: '#c0392b', bg: '#fbe9e9', grad: 'linear-gradient(135deg,#f08a7d,#c0392b)', iconBg: 'rgba(255,255,255,.65)' },
  blue:    { fg: '#3355a8', bg: '#e1e6f8', grad: 'linear-gradient(135deg,#7d95d8,#3355a8)', iconBg: 'rgba(255,255,255,.65)' },
  amber:   { fg: colors.accent700, bg: '#fdf1dc', grad: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`, iconBg: 'rgba(255,255,255,.65)' },
  violet:  { fg: '#7e22ce', bg: '#efe0fc', grad: 'linear-gradient(135deg,#c084f5,#7e22ce)', iconBg: 'rgba(255,255,255,.65)' },
  orange:  { fg: '#c2410c', bg: '#fdece2', grad: 'linear-gradient(135deg,#f5a06b,#c2410c)', iconBg: 'rgba(255,255,255,.65)' },
};

function Ring({ pct, tone, trend }: { pct: number; tone: Tone; trend?: boolean }) {
  return (
    <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <MuiCircularProgress
        variant="determinate" value={100} size={56} thickness={4}
        sx={{ position: 'absolute', color: 'rgba(255,255,255,.55)' }}
      />
      <MuiCircularProgress
        variant="determinate" value={pct} size={56} thickness={4}
        sx={{ position: 'absolute', color: tone.fg, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
      />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: tone.fg }}>{pct}%</Typography>
      </Box>
      {trend && (
        <Box sx={{
          position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%',
          bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }}>
          <TrendingUp size={11} color={tone.fg} />
        </Box>
      )}
    </Box>
  );
}

function Sparkline({ tone, data }: { tone: Tone; data: number[] }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <Box sx={{ width: 64, height: 40, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Line type="monotone" dataKey="v" stroke={tone.fg} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function HeroStat({
  title, value, total, icon, tone, unidad, sparkline,
}: { title: string; value: number; total: number; icon: React.ReactNode; tone: Tone; unidad: string; sparkline?: number[] }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card sx={{ borderRadius: 4, bgcolor: tone.bg, boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: tone.iconBg, color: tone.fg,
        }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: tone.fg }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', lineHeight: 1.15, color: '#241f16' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: tone.fg, opacity: 0.85, mt: 0.25 }}>{unidad}</Typography>
        </Box>
        {sparkline
          ? <Sparkline tone={tone} data={sparkline} />
          : <Ring pct={pct} tone={tone} trend={pct >= 50} />
        }
      </CardContent>
    </Card>
  );
}

function MiniRow({
  icon, label, value, tone, alerta,
}: { icon: React.ReactNode; label: string; value: number; tone: Tone; alerta?: boolean }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, py: 1.1, px: alerta ? 1.25 : 0,
      mx: alerta ? -1.25 : 0, borderRadius: alerta ? 3 : 0, bgcolor: alerta ? tone.bg : 'transparent',
    }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 2.25, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alerta ? 'rgba(255,255,255,.65)' : tone.bg, color: tone.fg,
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, color: alerta ? tone.fg : 'text.secondary', fontWeight: alerta ? 600 : 400, flex: 1 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: alerta ? tone.fg : 'text.primary' }}>{value}</Typography>
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
        <MuiCircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando dashboard...
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
          title="Socios disponibles" value={data.socios.activos} total={totalSocios}
          unidad={`Total ${totalSocios}: ${data.socios.bloqueados} bloqueado${data.socios.bloqueados === 1 ? '' : 's'}`}
          icon={<UserCheck size={19} />} tone={TONES.emerald}
        />
        <HeroStat
          title="Móviles disponibles" value={data.moviles.disponibles} total={totalMoviles}
          unidad={`Total ${totalMoviles}: ${data.moviles.en_servicio} en servicio`}
          icon={<Car size={19} />} tone={TONES.blue}
        />
        <HeroStat
          title="Solicitudes en curso" value={data.solicitudes.en_curso} total={0} unidad={`${data.solicitudes.pendientes} pendientes`}
          sparkline={[data.solicitudes.hoy, data.solicitudes.pendientes, data.solicitudes.en_curso, data.solicitudes.completadas_hoy, data.solicitudes.hoy]}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <MiniRow icon={<PhoneCall size={14} />} label="Solicitudes hoy" value={data.solicitudes.hoy} tone={TONES.violet} />
              <MiniRow icon={<CheckCircle2 size={14} />} label="Completadas hoy" value={data.solicitudes.completadas_hoy} tone={TONES.emerald} />
              <MiniRow icon={<Timer size={14} />} label="Solicitudes pendientes" value={data.solicitudes.pendientes} tone={TONES.orange} />
              <MiniRow icon={<CarFront size={14} />} label="Móviles en servicio" value={data.moviles.en_servicio} tone={TONES.amber} />
              <MiniRow icon={<UserX size={14} />} label="Socios bloqueados" value={data.socios.bloqueados} tone={TONES.red} alerta={data.socios.bloqueados > 0} />
              <MiniRow icon={<Wallet size={14} />} label="Cuotas pendientes" value={data.cuotas.pendientes} tone={TONES.amber} alerta={data.cuotas.pendientes > 0} />
              <MiniRow icon={<CalendarClock size={14} />} label="Cuotas vencidas" value={data.cuotas.vencidas} tone={TONES.red} alerta={data.cuotas.vencidas > 0} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
