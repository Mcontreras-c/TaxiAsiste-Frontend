import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, TextField, Alert, CircularProgress, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, InputAdornment,
} from '@mui/material';
import { Users, Search, RefreshCw, AlertTriangle, Phone } from 'lucide-react';
import { getSocios } from '../api/socios';
import type { Socio } from '../types';
import { InitialsAvatar } from '../components/InitialsAvatar';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  ACTIVO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  INACTIVO:  { bg: '#f1efe9', fg: '#6b6152' },
  BLOQUEADO: { bg: '#fbe9e9', fg: '#c0392b' },
};

export default function SociosTesorero() {
  const [socios, setSocios]   = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try { setSocios(await getSocios()); }
    catch { setError('No se pudieron cargar los socios.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = socios.filter(s =>
    `${s.nombre_completo} ${s.rut}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalVencidas = socios.reduce((acc, s) => acc + (s.cuotas_vencidas ?? 0), 0);
  const morosos = socios.filter(s => (s.cuotas_vencidas ?? 0) > 0).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Users size={22} color="#3a3327" />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Socios</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{socios.length} registrados</Typography>
          </Box>
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{socios.length}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Total socios</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c2410c' }}>{morosos}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Con cuotas vencidas</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c0392b' }}>{totalVencidas}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Cuotas vencidas totales</Typography>
        </CardContent></Card>
      </Box>

      <TextField
        size="small" placeholder="Buscar por nombre o RUT..." value={search}
        onChange={e => setSearch(e.target.value)} fullWidth
        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="#a89f8f" /></InputAdornment> } }}
      />

      {error && <Alert severity="error" onClose={load}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['RUT', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas vencidas'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>No se encontraron socios.</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id_socio} hover>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 13 }}>{s.rut}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <InitialsAvatar nombre={s.nombre_completo} />
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{s.nombre_completo}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {s.telefono ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone size={12} color="#a89f8f" /> {s.telefono}
                        </Box>
                      ) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.direccion ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={s.estado_socio} size="small" sx={{ bgcolor: ESTADO_STYLE[s.estado_socio]?.bg, color: ESTADO_STYLE[s.estado_socio]?.fg, fontWeight: 700, fontSize: 10.5 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#a89f8f' }}>{new Date(s.fecha_ingreso).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      {(s.cuotas_vencidas ?? 0) > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#c2410c', fontWeight: 700, fontSize: 12 }}>
                          <AlertTriangle size={13} /> {s.cuotas_vencidas}
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2f7d5b' }}>Al día</Typography>
                      )}
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
