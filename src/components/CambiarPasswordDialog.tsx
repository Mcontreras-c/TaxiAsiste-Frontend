import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  IconButton, Alert, CircularProgress, Box, Typography, InputAdornment,
} from '@mui/material';
import { KeyRound, X, Check, Eye, EyeOff } from 'lucide-react';
import { cambiarPassword } from '../api/usuarios';

export default function CambiarPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [actual, setActual]   = useState('');
  const [nueva, setNueva]     = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [ok, setOk]           = useState(false);
  const [saving, setSaving]   = useState(false);
  const [ver, setVer]         = useState(false);

  // Un solo ojito por campo, pero los tres comparten el estado (mostrar/ocultar juntos).
  const ojito = {
    input: { endAdornment: (
      <InputAdornment position="end">
        <IconButton size="small" edge="end" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
        </IconButton>
      </InputAdornment>
    ) },
  };

  const limpiarYCerrar = () => {
    setActual(''); setNueva(''); setRepetir(''); setError(null); setOk(false); setVer(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== repetir) {
      setError('La nueva contraseña no coincide en ambos campos.');
      return;
    }

    setSaving(true);
    try {
      await cambiarPassword(actual, nueva);
      setOk(true);
      setActual(''); setNueva(''); setRepetir('');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={limpiarYCerrar} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <KeyRound size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Cambiar contraseña</Typography>
        </Box>
        <IconButton size="small" onClick={limpiarYCerrar}><X size={18} /></IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
          {ok ? (
            <Alert severity="success" icon={<Check size={18} />}>Tu contraseña se actualizó correctamente.</Alert>
          ) : (
            <>
              <TextField
                fullWidth size="small" type={ver ? 'text' : 'password'} label="Contraseña actual" autoFocus
                value={actual} onChange={e => setActual(e.target.value)}
                slotProps={ojito}
              />
              <TextField
                fullWidth size="small" type={ver ? 'text' : 'password'} label="Nueva contraseña"
                value={nueva} onChange={e => setNueva(e.target.value)}
                helperText="Mínimo 6 caracteres."
                slotProps={ojito}
              />
              <TextField
                fullWidth size="small" type={ver ? 'text' : 'password'} label="Repetir nueva contraseña"
                value={repetir} onChange={e => setRepetir(e.target.value)}
                slotProps={ojito}
              />
              {error && <Alert severity="error">{error}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          {ok ? (
            <Button fullWidth variant="contained" onClick={limpiarYCerrar}>Listo</Button>
          ) : (
            <>
              <Button fullWidth variant="outlined" onClick={limpiarYCerrar} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
                Cancelar
              </Button>
              <Button fullWidth type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
