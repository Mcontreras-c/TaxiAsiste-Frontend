import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton,
  Alert, CircularProgress, Box, Typography, Chip,
} from '@mui/material';
import { UserRound, X, Check, KeyRound, Mail, Phone } from 'lucide-react';
import { getMiPerfil, actualizarMiPerfil, type PerfilUsuario } from '../api/usuarios';
import { colors } from '../theme';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Abre el dialogo de cambio de contraseña (vive en Layout). */
  onCambiarClave: () => void;
}

const soloLectura = (etiqueta: string, valor: string | null) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
      {etiqueta}
    </Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{valor || '—'}</Typography>
  </Box>
);

/**
 * Mi perfil: cada persona ve su cuenta y edita SOLO su correo y su telefono.
 * Nombre, RUT, usuario y rol los maneja un administrador. Cambiar el correo
 * (que sirve para recuperar la clave) pide la contraseña actual.
 */
export default function PerfilDialog({ open, onClose, onCambiarClave }: Props) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const cargar = (p: PerfilUsuario) => {
    setPerfil(p);
    setEmail(p.email ?? '');
    setTelefono(p.telefono ?? '');
    setPasswordActual('');
  };

  useEffect(() => {
    if (!open) return;
    setError(null); setOk(false); setCargando(true);
    getMiPerfil()
      .then(cargar)
      .catch(() => setError('No se pudo cargar tu perfil.'))
      .finally(() => setCargando(false));
  }, [open]);

  const cambiaCorreo = !!perfil && email.trim().toLowerCase() !== (perfil.email ?? '').toLowerCase();
  const cambiaTelefono = !!perfil && telefono.trim() !== (perfil.telefono ?? '');
  const hayCambios = cambiaCorreo || cambiaTelefono;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil || !hayCambios) return;
    if (cambiaCorreo && !passwordActual) { setError('Para cambiar el correo ingresa tu contraseña actual.'); return; }
    setGuardando(true); setError(null); setOk(false);
    try {
      const actualizado = await actualizarMiPerfil({
        ...(cambiaCorreo ? { email: email.trim(), password_actual: passwordActual } : {}),
        ...(cambiaTelefono ? { telefono: telefono.trim() || null } : {}),
      });
      cargar(actualizado);
      setOk(true);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { detail?: string; email?: string[]; telefono?: string[] } } })?.response?.data;
      setError(data?.detail ?? data?.email?.[0] ?? data?.telefono?.[0] ?? 'No se pudo guardar el perfil.');
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <UserRound size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Mi perfil</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={guardar}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
          {cargando && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>}

          {perfil && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{perfil.nombre_completo}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>@{perfil.username}</Typography>
                </Box>
                <Chip label={perfil.rol} size="small" sx={{ bgcolor: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.70)', fontWeight: 700 }} />
              </Box>

              {perfil.rut && soloLectura('RUT', perfil.rut)}

              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: -0.5 }}>
                Tu nombre, RUT, usuario y rol los administra un administrador.
              </Typography>

              <TextField
                size="small" fullWidth label="Correo" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setOk(false); }}
                helperText="Es el correo donde llegan las claves temporales."
                slotProps={{ input: { startAdornment: <Mail size={15} color="rgba(255,255,255,.55)" style={{ marginRight: 8 }} /> } }}
              />

              {cambiaCorreo && (
                <TextField
                  size="small" fullWidth label="Contraseña actual (para confirmar el cambio)" type="password"
                  value={passwordActual} onChange={e => setPasswordActual(e.target.value)} autoComplete="current-password"
                />
              )}

              <TextField
                size="small" fullWidth label="Teléfono" placeholder="+56 9 1234 5678" value={telefono}
                onChange={e => { setTelefono(e.target.value); setOk(false); }}
                slotProps={{ input: { startAdornment: <Phone size={15} color="rgba(255,255,255,.55)" style={{ marginRight: 8 }} /> } }}
              />

              <Button
                variant="outlined" size="small" startIcon={<KeyRound size={14} />}
                onClick={() => { onClose(); onCambiarClave(); }}
                sx={{ alignSelf: 'flex-start', color: colors.ink, borderColor: 'rgba(0,114,188,.35)' }}
              >
                Cambiar contraseña
              </Button>
            </>
          )}

          {ok && <Alert severity="success" icon={<Check size={18} />}>Perfil actualizado.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cerrar</Button>
          <Button
            type="submit" variant="contained" disabled={!perfil || !hayCambios || guardando}
            sx={{ color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})` }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
