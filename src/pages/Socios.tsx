import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Button, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, InputAdornment,
} from '@mui/material';
import { Users, Plus, AlertTriangle, X, Search } from 'lucide-react';
import { getSocios, createSocio } from '../api/socios';
import type { Socio } from '../types';
import { colors } from '../theme';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  ACTIVO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  INACTIVO:  { bg: '#f1efe9', fg: '#6b6152' },
  BLOQUEADO: { bg: '#fbe9e9', fg: '#c0392b' },
};

interface FormData {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
}

const EMPTY: FormData = { rut: '', nombre: '', apellido: '', telefono: '', direccion: '' };

const CAMPOS: { label: string; key: keyof FormData; placeholder: string }[] = [
  { label: 'RUT *',      key: 'rut',       placeholder: '12345678-9' },
  { label: 'Nombre *',   key: 'nombre',    placeholder: 'Juan' },
  { label: 'Apellido *', key: 'apellido',  placeholder: 'Pérez' },
  { label: 'Teléfono',   key: 'telefono',  placeholder: '912345678' },
  { label: 'Dirección',  key: 'direccion', placeholder: 'Av. Principal 123' },
];

export default function SociosPage() {
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
      setSocios(await getSocios());
    } catch {
      setError('No se pudieron cargar los socios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = socios.filter(s =>
    `${s.nombre} ${s.apellido} ${s.rut}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rut || !form.nombre || !form.apellido) {
      setFormError('RUT, nombre y apellido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createSocio({
        rut: form.rut,
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        estado_socio: 'ACTIVO',
      });
      setShowModal(false);
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.rut?.[0] ?? 'Error al crear el socio.');
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
          <Users size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Socios</Typography>
          <Chip label={socios.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
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
          Nuevo socio
        </Button>
      </Box>

      <TextField
        size="small" placeholder="Buscar por nombre o RUT..." value={search}
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
                  {['RUT', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas vencidas'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>No hay socios registrados.</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id_socio} hover>
                    <TableCell sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 13 }}>{s.rut}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13.5 }}>{s.nombre_completo}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{s.telefono ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.direccion ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.estado_socio} size="small"
                        sx={{ bgcolor: ESTADO_STYLE[s.estado_socio]?.bg, color: ESTADO_STYLE[s.estado_socio]?.fg, fontWeight: 700, fontSize: 10.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#a89f8f' }}>
                      {new Date(s.fecha_ingreso).toLocaleDateString('es-CL')}
                    </TableCell>
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

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          Nuevo socio
          <IconButton size="small" onClick={() => setShowModal(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
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
