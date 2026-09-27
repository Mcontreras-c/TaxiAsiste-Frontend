import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, Typography, Box,
} from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { registrarSolicitante } from '../api/confirmacion';
import { colors } from '../theme';

/**
 * Dialogo global (montado una vez en Layout) que pide la contraseña cuando el
 * servidor exige confirmarla para una accion sensible. La resuelve con la clave
 * escrita, o con null si la persona cancela (la accion original no se ejecuta).
 */
export default function ConfirmarPasswordDialog() {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | undefined>();
  const resolver = useRef<((clave: string | null) => void) | null>(null);

  useEffect(() => {
    registrarSolicitante((mensajeError) => new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setError(mensajeError);
      setClave('');
      setAbierto(true);
    }));
    return () => registrarSolicitante(null);
  }, []);

  const cerrar = (valor: string | null) => {
    setAbierto(false);
    resolver.current?.(valor);
    resolver.current = null;
  };

  return (
    <Dialog open={abierto} onClose={() => cerrar(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); if (clave) cerrar(clave); }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ShieldCheck size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Confirma tu contraseña</Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Por seguridad, esta acción requiere que vuelvas a ingresar tu contraseña. La confirmación
            vale por unos minutos.
          </Typography>
          <TextField
            autoFocus fullWidth size="small" type="password" label="Tu contraseña"
            autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => cerrar(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            type="submit" variant="contained" disabled={!clave}
            sx={{ color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})` }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
