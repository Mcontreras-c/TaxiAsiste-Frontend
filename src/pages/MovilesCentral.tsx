import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, TextField, Alert, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, InputAdornment,
} from '@mui/material';
import { Car, Search, RefreshCw } from 'lucide-react';
import { getMoviles } from '../api/moviles';
import type { Movil } from '../types';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  DISPONIBLE:  { bg: '#e4f3ec', fg: '#2f7d5b' },
  EN_SERVICIO: { bg: '#e8ecf9', fg: '#3355a8' },
};

export default function MovilesCentralPage() {
  const [moviles, setMoviles] = useState<Movil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const all = await getMoviles();
      setMoviles(all.filter(m => m.estado_operativo === 'DISPONIBLE' || m.estado_operativo === 'EN_SERVICIO'));
    } catch {
      setError('No se pudieron cargar los móviles.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = moviles.filter(m =>
    `${m.patente} ${m.socio_nombre} ${m.marca} ${m.modelo}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Car size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Móviles</Typography>
          <Chip label={`${moviles.length} operativos`} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <TextField
        size="small" placeholder="Buscar por nombre, patente o marca..." value={search}
        onChange={e => setSearch(e.target.value)} fullWidth
        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="#a89f8f" /></InputAdornment> } }}
      />

      {error && <Alert severity="error">{error}</Alert>}

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
                  {['Patente', 'Socio / Conductor', 'Teléfono', 'Vehículo', 'Año', 'Color', 'Estado'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>No hay móviles operativos.</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id_movil} hover>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, fontSize: 13 }}>{m.patente}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13.5 }}>{m.socio_nombre}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.socio_telefono ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.anio ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.color ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={m.estado_operativo.replace('_', ' ')} size="small"
                        sx={{ bgcolor: ESTADO_STYLE[m.estado_operativo]?.bg, color: ESTADO_STYLE[m.estado_operativo]?.fg, fontWeight: 700, fontSize: 10.5 }}
                      />
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
