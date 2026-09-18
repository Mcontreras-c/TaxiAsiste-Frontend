import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, Wallet, Info, Landmark, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { getMovimientos, getBalance, getResumenMensual, type TesoreriaMovimiento, type Balance, type ResumenMensual } from '../api/tesoreria';

const TIPO_STYLE = {
  INGRESO: { bg: '#e4f3ec', fg: '#2f7d5b' },
  EGRESO:  { bg: '#fbe9e9', fg: '#c0392b' },
};

const CATEGORIA_LABEL: Record<string, string> = {
  CUOTA:             'Cuota',
  MULTA:             'Multa',
  GASTO_OPERACIONAL: 'Gasto Operacional',
  OTRO:              'Otro',
};

function ResumenCard({
  icon, tone, label, value,
}: { icon: React.ReactNode; tone: { bg: string; fg: string }; label: string; value: string }) {
  return (
    <Card sx={{ borderRadius: 999, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important', px: '20px !important' }}>
        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: tone.bg, color: tone.fg, display: 'flex' }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: tone.fg, fontFamily: 'Roboto Mono, monospace' }}>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function hoyMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesLabel(m: string) {
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}
function prevMes(m: string) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMes(m: string) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TesoreriaAdmin() {
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([]);
  const [balance, setBalance]         = useState<Balance | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [mes, setMes]                 = useState(hoyMes());
  const [resumenMes, setResumenMes]   = useState<ResumenMensual | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [m, b] = await Promise.all([getMovimientos(), getBalance()]);
      setMovimientos(m);
      setBalance(b);
    } catch {
      setError('No se pudo cargar la tesorería.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    getResumenMensual(mes).then(setResumenMes).catch(() => setResumenMes(null));
  }, [mes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DollarSign size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Tesorería</Typography>
          <Chip label="Solo consulta" size="small" sx={{ bgcolor: '#e8ecf9', color: '#3355a8', fontWeight: 700 }} />
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <Alert severity="info" icon={<Info size={18} />}>
        Estás viendo la tesorería en modo <strong>solo lectura</strong>. Para registrar ingresos, egresos
        o pagos de cuotas, coordina con el <strong>Tesorero</strong>.
      </Alert>

      {error && <Alert severity="error" onClose={load}>{error}</Alert>}

      {balance && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
          <ResumenCard icon={<TrendingUp size={19} />} tone={{ bg: '#e4f3ec', fg: '#2f7d5b' }} label="Ingresos" value={`$${balance.ingresos.toLocaleString('es-CL')}`} />
          <ResumenCard icon={<TrendingDown size={19} />} tone={{ bg: '#fbe9e9', fg: '#c0392b' }} label="Egresos" value={`$${balance.egresos.toLocaleString('es-CL')}`} />
          <ResumenCard
            icon={<Wallet size={19} />}
            tone={balance.balance >= 0 ? { bg: '#e8ecf9', fg: '#3355a8' } : { bg: '#fdece2', fg: '#c2410c' }}
            label="Balance" value={`$${balance.balance.toLocaleString('es-CL')}`}
          />
        </Box>
      )}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card sx={{ borderRadius: 999, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '8px !important' }}>
              <IconButton size="small" onClick={() => setMes(prevMes(mes))}><ChevronLeft size={17} /></IconButton>
              <Typography sx={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>Resumen de caja — {mesLabel(mes)}</Typography>
              <IconButton size="small" onClick={() => setMes(nextMes(mes))}><ChevronRight size={17} /></IconButton>
            </CardContent>
          </Card>
          {resumenMes && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
              <ResumenCard icon={<Landmark size={19} />} tone={{ bg: '#f1efe9', fg: '#6b6152' }} label="Caja mes anterior" value={`$${resumenMes.caja_anterior.toLocaleString('es-CL')}`} />
              <ResumenCard icon={<TrendingUp size={19} />} tone={{ bg: '#e4f3ec', fg: '#2f7d5b' }} label="Ganancias del mes" value={`$${resumenMes.ingresos_mes.toLocaleString('es-CL')}`} />
              <ResumenCard icon={<TrendingDown size={19} />} tone={{ bg: '#fbe9e9', fg: '#c0392b' }} label="Gastos del mes" value={`$${resumenMes.egresos_mes.toLocaleString('es-CL')}`} />
              <ResumenCard
                icon={<Wallet size={19} />}
                tone={resumenMes.total_caja >= 0 ? { bg: '#e8ecf9', fg: '#3355a8' } : { bg: '#fdece2', fg: '#c2410c' }}
                label="Total caja actual" value={`$${resumenMes.total_caja.toLocaleString('es-CL')}`}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Historial de Movimientos Actuales</Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Registrado por', 'Monto'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, border: 'none' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <BookOpen size={32} color="#c4bda9" strokeWidth={1.5} />
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Aún no hay movimientos registrados.</Typography>
                        <Typography sx={{ fontSize: 12, color: '#a89f8f' }}>Los nuevos ingresos y egresos aparecerán aquí.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : movimientos.map(m => (
                  <TableRow key={m.id_movimiento} hover>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{new Date(m.fecha).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      <Chip label={m.tipo} size="small" sx={{ bgcolor: TIPO_STYLE[m.tipo].bg, color: TIPO_STYLE[m.tipo].fg, fontWeight: 700, fontSize: 10.5 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{CATEGORIA_LABEL[m.categoria]}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{m.descripcion}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.usuario_nombre ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: m.tipo === 'INGRESO' ? '#2f7d5b' : '#c0392b' }}>
                      {m.tipo === 'EGRESO' ? '-' : '+'}${Number(m.monto).toLocaleString('es-CL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
}
