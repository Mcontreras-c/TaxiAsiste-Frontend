import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Card, CardContent, LinearProgress, Alert as MAlert, CircularProgress } from '@mui/material';
import { Car, PhoneCall, RefreshCw, LayoutDashboard, UserCheck, UserX, CarFront, Timer, Route, CheckCircle2, Wallet, CalendarClock } from 'lucide-react';
import { getDashboard } from '../api/reportes';
import type { Dashboard } from '../types';
import { colors } from '../theme';

type Tone = { fg: string; bg: string; grad: string };

const TONES: Record<string, Tone> = {
  emerald: { fg: '#2f7d5b', bg: '#e4f3ec', grad: 'linear-gradient(135deg,#5fbf8f,#2f7d5b)' },
  red:     { fg: '#c0392b', bg: '#fbe9e9', grad: 'linear-gradient(135deg,#f08a7d,#c0392b)' },
  blue:    { fg: '#3355a8', bg: '#e8ecf9', grad: 'linear-gradient(135deg,#7d95d8,#3355a8)' },
  amber:   { fg: colors.accent700, bg: '#fdf1dc', grad: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
  violet:  { fg: '#7e22ce', bg: '#f3e8fd', grad: 'linear-gradient(135deg,#c084f5,#7e22ce)' },
  orange:  { fg: '#c2410c', bg: '#fdece2', grad: 'linear-gradient(135deg,#f5a06b,#c2410c)' },
};

function StatCard({
  title, value, icon, tone, sub, percent,
}: { title: string; value: number; icon: React.ReactNode; tone: Tone; sub?: string; percent?: number }) {
  return (
    <Card sx={{ borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary' }}>
            {title}
          </Typography>
          <Box sx={{
            width: 34, height: 34, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tone.grad, color: '#fff', boxShadow: `0 4px 10px ${tone.fg}33`,
          }}>
            {icon}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 30, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', lineHeight: 1 }}>
          {String(value).padStart(2, '0')}
        </Typography>
        {percent !== undefined ? (
          <Box>
            <LinearProgress
              variant="determinate" value={percent}
              sx={{ height: 6, borderRadius: 3, bgcolor: tone.bg, '& .MuiLinearProgress-bar': { borderRadius: 3, background: tone.grad } }}
            />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>
          </Box>
        ) : sub && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{sub}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a89f8f', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

const gridSx = { display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 };

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
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

  const totalSocios = data.socios.activos + data.socios.bloqueados;
  const totalMoviles = data.moviles.disponibles + data.moviles.en_servicio;
  const totalCuotas = data.cuotas.pendientes + data.cuotas.vencidas;
  const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      <Box>
        <SectionLabel>Socios</SectionLabel>
        <Box sx={gridSx}>
          <StatCard title="Socios activos" value={data.socios.activos} icon={<UserCheck size={17} />} tone={TONES.emerald}
            percent={pct(data.socios.activos, totalSocios)} sub={`${pct(data.socios.activos, totalSocios)}% del total`} />
          <StatCard title="Socios bloqueados" value={data.socios.bloqueados} icon={<UserX size={17} />} tone={TONES.red}
            percent={pct(data.socios.bloqueados, totalSocios)} sub={`${pct(data.socios.bloqueados, totalSocios)}% del total`} />
        </Box>
      </Box>

      <Box>
        <SectionLabel>Móviles</SectionLabel>
        <Box sx={gridSx}>
          <StatCard title="Disponibles" value={data.moviles.disponibles} icon={<Car size={17} />} tone={TONES.blue}
            percent={pct(data.moviles.disponibles, totalMoviles)} sub={`${pct(data.moviles.disponibles, totalMoviles)}% del total`} />
          <StatCard title="En servicio" value={data.moviles.en_servicio} icon={<CarFront size={17} />} tone={TONES.amber}
            percent={pct(data.moviles.en_servicio, totalMoviles)} sub={`${pct(data.moviles.en_servicio, totalMoviles)}% del total`} />
        </Box>
      </Box>

      <Box>
        <SectionLabel>Solicitudes</SectionLabel>
        <Box sx={gridSx}>
          <StatCard title="Hoy" value={data.solicitudes.hoy} icon={<PhoneCall size={17} />} tone={TONES.violet} />
          <StatCard title="Pendientes" value={data.solicitudes.pendientes} icon={<Timer size={17} />} tone={TONES.orange} />
          <StatCard title="En curso" value={data.solicitudes.en_curso} icon={<Route size={17} />} tone={TONES.blue} />
          <StatCard title="Completadas hoy" value={data.solicitudes.completadas_hoy} icon={<CheckCircle2 size={17} />} tone={TONES.emerald} />
        </Box>
      </Box>

      <Box>
        <SectionLabel>Cuotas</SectionLabel>
        <Box sx={gridSx}>
          <StatCard title="Pendientes de pago" value={data.cuotas.pendientes} icon={<Wallet size={17} />} tone={TONES.amber}
            percent={pct(data.cuotas.pendientes, totalCuotas)} sub={`${pct(data.cuotas.pendientes, totalCuotas)}% del total`} />
          <StatCard title="Vencidas" value={data.cuotas.vencidas} icon={<CalendarClock size={17} />} tone={TONES.red}
            percent={pct(data.cuotas.vencidas, totalCuotas)} sub={`${pct(data.cuotas.vencidas, totalCuotas)}% del total`} />
        </Box>
      </Box>
    </Box>
  );
}
