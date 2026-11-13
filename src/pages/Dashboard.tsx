import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Alert as MAlert, CircularProgress as MuiCircularProgress } from '@mui/material';
import {
  Car, PhoneCall, RefreshCw, LayoutDashboard, UserCheck, UserX, CarFront,
  Timer, Route, CheckCircle2, Wallet, CalendarClock, BarChart3,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { getDashboard, getSolicitudesPorEstado } from '../api/reportes';
import type { Dashboard, SolicitudPorEstado } from '../types';
import { colors } from '../theme';

// Colores de las barras sobre fondo oscuro
const ESTADO_CHART_COLOR: Record<string, string> = {
  PENDIENTE:  '#fb923c',
  ASIGNADO:   '#60a5fa',
  EN_CURSO:   '#c084fc',
  COMPLETADO: '#34d399',
  CANCELADO:  '#94a3b8',
};

const ESTADO_CHART_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASIGNADO: 'Asignado', EN_CURSO: 'En curso', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

const TEXTO_SUAVE = 'rgba(255,255,255,.62)';

function EstadoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <Box sx={{
      bgcolor: 'rgba(15,26,46,.94)', border: '1px solid rgba(255,255,255,.16)', color: '#fff',
      px: 1.5, py: 1, borderRadius: 2, fontSize: 12,
    }}>
      <Typography sx={{ fontSize: 11, color: TEXTO_SUAVE }}>{p.label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{p.total}</Typography>
    </Box>
  );
}

type Tono = { color: string; brillo: string; degradado: string };

const TONOS: Record<string, Tono> = {
  verde:    { color: '#34d399', brillo: 'rgba(52,211,153,.30)', degradado: 'linear-gradient(135deg,#6ee7b7,#059669)' },
  rojo:     { color: '#f87171', brillo: 'rgba(248,113,113,.30)', degradado: 'linear-gradient(135deg,#fca5a5,#dc2626)' },
  azul:     { color: '#60a5fa', brillo: 'rgba(96,165,250,.32)', degradado: 'linear-gradient(135deg,#93c5fd,#2563eb)' },
  amarillo: { color: colors.accent500, brillo: 'rgba(255,222,0,.26)', degradado: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
  violeta:  { color: '#c084fc', brillo: 'rgba(192,132,252,.30)', degradado: 'linear-gradient(135deg,#d8b4fe,#7e22ce)' },
  naranja:  { color: '#fb923c', brillo: 'rgba(251,146,60,.30)', degradado: 'linear-gradient(135deg,#fdba74,#ea580c)' },
};

function Tarjeta({
  children, elevable = true, retraso = 0,
}: { children: React.ReactNode; elevable?: boolean; retraso?: number }) {
  return (
    <Box
      className={`vidrio-tarjeta${elevable ? ' vidrio-tarjeta--elevable' : ''}`}
      style={{ ['--retraso' as string]: `${retraso}ms` }}
      sx={{ borderRadius: '22px', height: '100%', p: 2.5, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </Box>
  );
}

function Anillo({ pct, tono }: { pct: number; tono: Tono }) {
  return (
    <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <MuiCircularProgress variant="determinate" value={100} size={56} thickness={4}
        sx={{ position: 'absolute', color: 'rgba(255,255,255,.12)' }} />
      <MuiCircularProgress variant="determinate" value={pct} size={56} thickness={4}
        sx={{
          position: 'absolute', color: tono.color, filter: `drop-shadow(0 0 6px ${tono.brillo})`,
          '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
        }} />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{pct}%</Typography>
      </Box>
    </Box>
  );
}

function MiniCurva({ tono, datos }: { tono: Tono; datos: number[] }) {
  const puntos = datos.map((v, i) => ({ i, v }));
  return (
    <Box sx={{ width: 72, height: 44, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={puntos} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Line type="monotone" dataKey="v" stroke={tono.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function Indicador({
  titulo, valor, total, icono, tono, detalle, curva, retraso,
}: {
  titulo: string; valor: number; total: number; icono: React.ReactNode; tono: Tono;
  detalle: string; curva?: number[]; retraso: number;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <Tarjeta retraso={retraso}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tono.degradado, color: '#0b1220', boxShadow: `0 6px 20px ${tono.brillo}`,
        }}>
          {icono}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: TEXTO_SUAVE }}>
            {titulo}
          </Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 800, fontFamily: 'Roboto Mono, monospace', lineHeight: 1.15, color: '#fff' }}>
            {valor}
          </Typography>
          <Typography sx={{ fontSize: 12, color: tono.color, mt: 0.25 }}>{detalle}</Typography>
        </Box>
        {curva ? <MiniCurva tono={tono} datos={curva} /> : <Anillo pct={pct} tono={tono} />}
      </Box>
    </Tarjeta>
  );
}

function FilaResumen({
  icono, etiqueta, valor, tono, alerta,
}: { icono: React.ReactNode; etiqueta: string; valor: number; tono: Tono; alerta?: boolean }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, py: 1.1, px: 1.25, mx: -1.25, borderRadius: '14px',
      bgcolor: alerta ? 'rgba(255,255,255,.07)' : 'transparent',
      border: `1px solid ${alerta ? tono.brillo : 'transparent'}`,
      transition: 'background-color 160ms ease',
      '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
    }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 2.25, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,.08)', color: tono.color,
      }}>
        {icono}
      </Box>
      <Typography sx={{ fontSize: 13, color: alerta ? '#fff' : TEXTO_SUAVE, fontWeight: alerta ? 600 : 400, flex: 1 }}>{etiqueta}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: alerta ? tono.color : '#fff' }}>{valor}</Typography>
    </Box>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: TEXTO_SUAVE, mb: 1.5 }}>
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
    <Box className="vidrio-escena" sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 2, md: 3 }, borderRadius: '28px', color: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LayoutDashboard size={22} color={colors.accent500} />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Dashboard</Typography>
            {fecha && <Typography sx={{ fontSize: 12.5, color: TEXTO_SUAVE, textTransform: 'capitalize' }}>{fecha}</Typography>}
          </Box>
        </Box>
        <IconButton onClick={load} aria-label="Actualizar" sx={{
          color: '#0b1220', background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
          boxShadow: '0 6px 20px rgba(255,222,0,.25)', transition: 'transform 200ms ease',
          '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`, transform: 'rotate(40deg)' },
        }}>
          <RefreshCw size={17} />
        </IconButton>
      </Box>

      {/* Indicadores principales */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
        <Indicador
          titulo="Socios disponibles" valor={data.socios.activos} total={totalSocios} retraso={0}
          detalle={`Total ${totalSocios}: ${data.socios.bloqueados} bloqueado${data.socios.bloqueados === 1 ? '' : 's'}`}
          icono={<UserCheck size={19} />} tono={TONOS.verde}
        />
        <Indicador
          titulo="Móviles disponibles" valor={data.moviles.disponibles} total={totalMoviles} retraso={80}
          detalle={`Total ${totalMoviles}: ${data.moviles.en_servicio} en servicio`}
          icono={<Car size={19} />} tono={TONOS.azul}
        />
        <Indicador
          titulo="Solicitudes en curso" valor={data.solicitudes.en_curso} total={0} retraso={160}
          detalle={`${data.solicitudes.pendientes} pendientes`}
          curva={[data.solicitudes.hoy, data.solicitudes.pendientes, data.solicitudes.en_curso, data.solicitudes.completadas_hoy, data.solicitudes.hoy]}
          icono={<Route size={19} />} tono={TONOS.violeta}
        />
      </Box>

      {/* Gráfico y resumen */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, alignItems: 'stretch' }}>
        <Tarjeta elevable={false} retraso={240}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <BarChart3 size={16} color={colors.accent500} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXTO_SUAVE }}>
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
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: TEXTO_SUAVE }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,.06)' }} content={<EstadoTooltip />} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {porEstado.map(e => (
                      <Cell key={e.estado} fill={ESTADO_CHART_COLOR[e.estado] ?? colors.accent500} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXTO_SUAVE, fontSize: 13, minHeight: 260 }}>
              Todavía no hay solicitudes registradas.
            </Box>
          )}
        </Tarjeta>

        <Tarjeta elevable={false} retraso={320}>
          <Rotulo>Resumen</Rotulo>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <FilaResumen icono={<PhoneCall size={14} />} etiqueta="Solicitudes hoy" valor={data.solicitudes.hoy} tono={TONOS.violeta} />
            <FilaResumen icono={<CheckCircle2 size={14} />} etiqueta="Completadas hoy" valor={data.solicitudes.completadas_hoy} tono={TONOS.verde} />
            <FilaResumen icono={<Timer size={14} />} etiqueta="Solicitudes pendientes" valor={data.solicitudes.pendientes} tono={TONOS.naranja} />
            <FilaResumen icono={<CarFront size={14} />} etiqueta="Móviles en servicio" valor={data.moviles.en_servicio} tono={TONOS.amarillo} />
            <FilaResumen icono={<UserX size={14} />} etiqueta="Socios bloqueados" valor={data.socios.bloqueados} tono={TONOS.rojo} alerta={data.socios.bloqueados > 0} />
            <FilaResumen icono={<Wallet size={14} />} etiqueta="Cuotas pendientes" valor={data.cuotas.pendientes} tono={TONOS.amarillo} alerta={data.cuotas.pendientes > 0} />
            <FilaResumen icono={<CalendarClock size={14} />} etiqueta="Cuotas vencidas" valor={data.cuotas.vencidas} tono={TONOS.rojo} alerta={data.cuotas.vencidas > 0} />
          </Box>
        </Tarjeta>
      </Box>
    </Box>
  );
}
