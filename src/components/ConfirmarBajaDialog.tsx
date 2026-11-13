import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Box, Typography,
  IconButton, CircularProgress,
} from '@mui/material';
import { UserX, X } from 'lucide-react';

interface Props {
  open: boolean;
  /** Ej: "¿Dar de baja a Juan Pérez?" */
  titulo: string;
  /** Lo que va a pasar, una linea por punto. */
  detalles: string[];
  loading: boolean;
  error: string | null;
  onConfirmar: () => void;
  onClose: () => void;
}

/** Confirmacion de una baja (usuario o socio): explica que pasa antes de hacerlo. */
export default function ConfirmarBajaDialog({ open, titulo, detalles, loading, error, onConfirmar, onClose }: Props) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <UserX size={20} color="#f87171" />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{titulo}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {detalles.map(d => (
            <Typography key={d} component="li" sx={{ fontSize: 13.5, color: 'text.secondary' }}>{d}</Typography>
          ))}
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          fullWidth variant="outlined" onClick={onClose} disabled={loading}
          sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}
        >
          Cancelar
        </Button>
        <Button
          fullWidth variant="contained" color="error" onClick={onConfirmar} disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {loading ? 'Procesando...' : 'Dar de baja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
