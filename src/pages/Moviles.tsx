import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Button, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, InputAdornment,
} from '@mui/material';
import { Car, Plus, X, Search } from 'lucide-react';
import { getMoviles, createMovil } from '../api/moviles';
import { getSocios } from '../api/socios';
import type { Movil, Socio } from '../types';
import { colors } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  DISPONIBLE:  { bg: '#e4f3ec', fg: '#2f7d5b' },
  EN_SERVICIO: { bg: '#e8ecf9', fg: '#3355a8' },
  BLOQUEADO:   { bg: '#fbe9e9', fg: '#c0392b' },
  INACTIVO:    { bg: '#f1efe9', fg: '#6b6152' },
};

interface FormData {
  id_socio: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
}

const EMPTY: FormData = { id_socio: '', patente: '', marca: '', modelo: '', anio: '', color: '' };

const CAMPOS: { label: string; key: keyof FormData; placeholder: string }[] = [
  { label: 'Patente *', key: 'patente', placeholder: 'ABCD12' },
  { label: 'Marca',     key: 'marca',   placeholder: 'Toyota' },
  { label: 'Modelo',    key: 'modelo',  placeholder: 'Corolla' },
  { label: 'Año',       key: 'anio',    placeholder: '2020' },
  { label: 'Color',     key: 'color',   placeholder: 'Blanco' },
];

export default function MovilesPage() {
  const [moviles, setMoviles]     = useState<Movil[]>([]);
  const [socios, setSocios]       = useState<Socio[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<FormData>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([getMoviles(), getSocios()]);
      setMoviles(m);
      setSocios(s);
    } catch {
      setError('No se pudieron cargar los móviles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = moviles.filter(m =>
    `${m.patente} ${m.socio_nombre} ${m.marca} ${m.modelo}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_socio || !form.patente) {
      setFormError('Socio y patente son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createMovil({
        socio: Number(form.id_socio),
        patente: form.patente.toUpperCase(),
        marca: form.marca || null,
        modelo: form.modelo || null,
        anio: form.anio ? Number(form.anio) : null,
        color: form.color || null,
        estado_operativo: 'DISPONIBLE',
      });
      setShowModal(false);
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.patente?.[0] ?? 'Error al registrar el móvil.');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setForm(EMPTY);
    setFormError(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Car size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Móviles</Typography>
          <Chip label={moviles.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <Button
          variant="contained" startIcon={<Plus size={16} />} onClick={openModal}
          sx={{
            color: colors.ink,
            background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
            boxShadow: '0 4px 10px rgba(245,166,35,.25)',
            '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
          }}
        >
          Nuevo móvil
        </Button>
      </Box>

      <TextField
        size="small" placeholder="Buscar por patente, socio o marca..." value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ maxWidth: 360, bgcolor: 'background.paper', borderRadius: 2 }}
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
                  {['Patente', 'Socio', 'Vehículo', 'Año', 'Color', 'Estado', 'Registro'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>No hay móviles registrados.</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id_movil} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Car size={13} color="#a89f8f" />
                        <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, fontSize: 13 }}>{m.patente}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <InitialsAvatar nombre={m.socio_nombre} />
                        <Typography sx={{ fontSize: 13.5 }}>{m.socio_nombre}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.anio ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{m.color ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={m.estado_operativo.replace('_', ' ')} size="small"
                        sx={{ bgcolor: ESTADO_STYLE[m.estado_operativo]?.bg, color: ESTADO_STYLE[m.estado_operativo]?.fg, fontWeight: 700, fontSize: 10.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#a89f8f' }}>
                      {new Date(m.fecha_registro).toLocaleDateString('es-CL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          Nuevo móvil
          <IconButton size="small" onClick={() => setShowModal(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
            <TextField
              fullWidth select size="small" label="Socio *" value={form.id_socio}
              onChange={e => setForm(f => ({ ...f, id_socio: e.target.value }))}
            >
              <MenuItem value="">Seleccionar socio...</MenuItem>
              {socios.map(s => (
                <MenuItem key={s.id_socio} value={s.id_socio}>{s.nombre_completo} — {s.rut}</MenuItem>
              ))}
            </TextField>

            {CAMPOS.map(({ label, key, placeholder }) => (
              <TextField
                key={key} fullWidth size="small" label={label} placeholder={placeholder}
                value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            ))}
            {formError && <Alert severity="error">{formError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={() => setShowModal(false)} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button
              fullWidth type="submit" variant="contained" disabled={saving}
              sx={{
                color: colors.ink,
                background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
                '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
