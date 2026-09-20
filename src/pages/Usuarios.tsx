import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  UserCog, RefreshCw, KeyRound, X, Check, User, Shield, PhoneCall, DollarSign,
  ClipboardList, Truck, Mail, Clock,
} from 'lucide-react';
import { getUsuarios, resetearPassword, type UsuarioCuenta } from '../api/usuarios';
import { colors } from '../theme';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  ACTIVO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  INACTIVO:  { bg: '#f1efe9', fg: '#6b6152' },
  BLOQUEADO: { bg: '#fbe9e9', fg: '#c0392b' },
};

const ROL_ICON: Record<string, React.ReactNode> = {
  Administrador: <Shield size={13} />,
  Central:       <PhoneCall size={13} />,
  Tesorero:      <DollarSign size={13} />,
  Secretario:    <ClipboardList size={13} />,
  Conductor:     <Truck size={13} />,
};

function ModalResetear({ usuario, onClose }: { usuario: UsuarioCuenta; onClose: () => void }) {
  const [nueva, setNueva]   = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [ok, setOk]         = useState(false);
  const [saving, setSaving] = useState(false);

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await resetearPassword(usuario.id_usuario, nueva);
      setOk(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo resetear la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <KeyRound size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Resetear contraseña</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={confirmar}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Usuario: <strong>{usuario.username}</strong> ({usuario.rol.nombre_rol})
          </Typography>
          {ok ? (
            <Alert severity="success" icon={<Check size={18} />}>Contraseña actualizada. Avísale la nueva clave al usuario.</Alert>
          ) : (
            <>
              <TextField
                fullWidth size="small" type="text" label="Nueva contraseña" autoFocus
                value={nueva} onChange={e => setNueva(e.target.value)}
                helperText="Mínimo 6 caracteres. No se pide la contraseña anterior."
              />
              {error && <Alert severity="error">{error}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          {ok ? (
            <Button fullWidth variant="contained" onClick={onClose}>Listo</Button>
          ) : (
            <>
              <Button fullWidth variant="outlined" onClick={onClose} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
                Cancelar
              </Button>
              <Button fullWidth type="submit" variant="contained" color="error" disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <KeyRound size={14} />}>
                {saving ? 'Guardando...' : 'Resetear'}
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioCuenta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [modal, setModal]       = useState<UsuarioCuenta | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setUsuarios(await getUsuarios()); }
    catch { setError('No se pudieron cargar los usuarios.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UserCog size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Usuarios</Typography>
          <Chip label={usuarios.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <Alert severity="info">
        Si alguien olvidó su contraseña, resetéala aquí y avísale la nueva clave directamente —
        no hay envío de correo automático.
      </Alert>

      {error && <Alert severity="error" onClose={load}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: 2 }}>
          {usuarios.map(u => (
            <Card key={u.id_usuario} sx={{ borderRadius: 4 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    bgcolor: '#f1efe9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid', borderColor: 'divider', overflow: 'hidden',
                  }}>
                    {/* Placeholder -- reemplazar por la foto real cuando este disponible. */}
                    <User size={22} color="#a89f8f" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.username}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: 12 }}>
                      {ROL_ICON[u.rol.nombre_rol]} {u.rol.nombre_rol}
                    </Box>
                  </Box>
                  <Chip
                    label={u.estado} size="small"
                    sx={{ ml: 'auto', flexShrink: 0, bgcolor: ESTADO_STYLE[u.estado]?.bg, color: ESTADO_STYLE[u.estado]?.fg, fontWeight: 700, fontSize: 10 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: 'text.secondary' }}>
                    <Mail size={13} color="#a89f8f" />
                    <Typography sx={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: '#a89f8f' }}>
                    <Clock size={13} />
                    <Typography sx={{ fontSize: 12.5 }}>
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca ha ingresado'}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  size="small" variant="contained" startIcon={<KeyRound size={13} />}
                  onClick={() => setModal(u)}
                  sx={{ mt: 0.5, fontSize: 11.5, color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}
                >
                  Resetear clave
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {modal && <ModalResetear usuario={modal} onClose={() => { setModal(null); load(); }} />}
    </Box>
  );
}
