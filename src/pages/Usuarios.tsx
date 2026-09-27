import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
  Pagination, Tabs, Tab,
} from '@mui/material';
import {
  UserCog, RefreshCw, KeyRound, X, Check, User, Shield, PhoneCall, DollarSign,
  ClipboardList, Truck, Flag, Mail, Clock, Search, Plus, Lock,
  Eye, EyeOff, Send, Pencil, UserX, UserCheck,
} from 'lucide-react';
import {
  getUsuarios, getRoles, resetearPassword, updateUsuario, reenviarCredenciales,
  darDeBajaUsuario, reactivarUsuario,
  type UsuarioCuenta, type RolCuenta,
} from '../api/usuarios';
import ConfirmarBajaDialog from '../components/ConfirmarBajaDialog';
import NuevaPersonaDialog from '../components/NuevaPersonaDialog';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

import { formatoFechaHora } from '../utils/formatoFecha';
const POR_PAGINA = 6;
const PASSWORD_MIN_LEN = 6;

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  ACTIVO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  INACTIVO:  { bg: '#f1efe9', fg: '#6b6152' },
  BLOQUEADO: { bg: '#fbe9e9', fg: '#c0392b' },
};

// Un tinte por rol (no por persona, a diferencia de InitialsAvatar) -- asi
// la grilla se puede escanear de un vistazo por tipo de usuario.
const ROL_TINT: Record<string, { bg: string; fg: string }> = {
  Administrador: { bg: '#e8ecf9', fg: '#3355a8' },
  Central:       { bg: '#e4f3ec', fg: '#2f7d5b' },
  Tesorero:      { bg: '#fdf1dc', fg: colors.accent700 },
  Secretario:    { bg: '#f3e8fd', fg: '#7e22ce' },
  Conductor:     { bg: '#fdece2', fg: '#c2410c' },
  Paletero:      { bg: '#fce7f3', fg: '#be185d' },
};

const ROL_ICON: Record<string, React.ReactNode> = {
  Administrador: <Shield size={13} />,
  Central:       <PhoneCall size={13} />,
  Tesorero:      <DollarSign size={13} />,
  Secretario:    <ClipboardList size={13} />,
  Conductor:     <Truck size={13} />,
  Paletero:      <Flag size={13} />,
};

function formatoUltimoAcceso(fecha: string | null) {
  return fecha
    ? formatoFechaHora(fecha)
    : 'Nunca ha ingresado';
}

// ---------- Resetear contraseña (sin cambios de fondo, solo estetica) ----------
function ModalResetear({ usuario, onClose }: { usuario: UsuarioCuenta; onClose: () => void }) {
  const [nueva, setNueva]   = useState('');
  const [verNueva, setVerNueva] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [ok, setOk]         = useState(false);
  const [saving, setSaving] = useState(false);

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva.length < PASSWORD_MIN_LEN) {
      setError(`La nueva contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres.`);
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
            Usuario: <strong>{usuario.nombre_completo}</strong> (@{usuario.username} · {usuario.rol.nombre_rol})
          </Typography>
          {ok ? (
            <Alert severity="success" icon={<Check size={18} />}>Contraseña actualizada. Avísale la nueva clave al usuario.</Alert>
          ) : (
            <>
              <TextField
                fullWidth size="small" type={verNueva ? 'text' : 'password'} label="Nueva contraseña" autoFocus
                value={nueva} onChange={e => setNueva(e.target.value)}
                helperText="Mínimo 6 caracteres. No se pide la contraseña anterior."
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setVerNueva(v => !v)} edge="end">
                      {verNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ) } }}
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

// ---------- Editar usuario (username/email/nombre/apellido) ----------
function ModalEditarUsuario({ usuario, onClose, onGuardado }: { usuario: UsuarioCuenta; onClose: () => void; onGuardado: () => void }) {
  const esConductor = usuario.rol.nombre_rol === 'Conductor';
  const [username, setUsername] = useState(usuario.username);
  const [email, setEmail]       = useState(usuario.email ?? '');
  const [nombre, setNombre]     = useState(usuario.nombre ?? '');
  const [apellido, setApellido] = useState(usuario.apellido ?? '');
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) { setError('El usuario es requerido.'); return; }
    setSaving(true);
    try {
      await updateUsuario(usuario.id_usuario, {
        username: username.trim(),
        email: email.trim(),
        ...(esConductor ? {} : { nombre: nombre.trim(), apellido: apellido.trim() }),
      });
      onGuardado();
    } catch (err: any) {
      const detail = err?.response?.data;
      const primerError = detail && typeof detail === 'object'
        ? Object.values(detail).flat()[0]
        : null;
      setError((primerError as string) ?? detail?.detail ?? 'No se pudo guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Pencil size={18} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Editar usuario</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={guardar}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
          {esConductor && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Rol Conductor: el nombre que se muestra es el del socio vinculado — para
              cambiarlo, edítalo desde Socios.
            </Typography>
          )}
          {!esConductor && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth size="small" label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              <TextField fullWidth size="small" label="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} />
            </Box>
          )}
          <TextField fullWidth size="small" label="Usuario *" value={username} onChange={e => setUsername(e.target.value)} />
          <TextField fullWidth size="small" label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={onClose} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
            Cancelar
          </Button>
          <Button fullWidth type="submit" variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Check size={14} />}
            sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---------- Reenviar credenciales ----------
// Genera una clave nueva y la manda por correo (link de la app o del panel segun
// el rol). La clave nunca se muestra aca: solo llega al correo de la persona.
function ModalReenviar({ usuario, onClose }: { usuario: UsuarioCuenta; onClose: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    setEnviando(true); setError(null);
    try {
      const r = await reenviarCredenciales(usuario.id_usuario);
      setMensaje(r.detail);
    } catch (e: unknown) {
      const detalle = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detalle ?? 'No se pudo enviar. Intenta de nuevo.');
    } finally { setEnviando(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Send size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Reenviar credenciales</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0 }}>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          Usuario: <strong>{usuario.nombre_completo}</strong> (@{usuario.username} · {usuario.rol.nombre_rol})
        </Typography>
        {mensaje ? (
          <Alert severity="success" icon={<Check size={18} />}>{mensaje}</Alert>
        ) : (
          <>
            <Typography sx={{ fontSize: 13.5 }}>
              Se generará una clave nueva y se enviará a <strong>{usuario.email}</strong>. La clave actual dejará de funcionar.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>{mensaje ? 'Cerrar' : 'Cancelar'}</Button>
        {!mensaje && (
          <Button
            variant="contained" onClick={enviar} disabled={enviando}
            sx={{ color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})` }}
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ---------- Pantalla principal ----------
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioCuenta[]>([]);
  const [roles, setRoles] = useState<RolCuenta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [modalReset, setModalReset] = useState<UsuarioCuenta | null>(null);
  const [modalEditar, setModalEditar] = useState<UsuarioCuenta | null>(null);
  const [modalReenviar, setModalReenviar] = useState<UsuarioCuenta | null>(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('Todos');
  const [pestana, setPestana] = useState<'conductores' | 'personal'>('conductores');
  const [pagina, setPagina] = useState(1);
  const { usuario: yo } = useAuthStore();
  // Los inactivos (dados de baja) quedan ocultos salvo que se pida verlos.
  const [verInactivos, setVerInactivos] = useState(false);
  const [modalBaja, setModalBaja] = useState<UsuarioCuenta | null>(null);
  const [bajando, setBajando] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);
  const [reactivando, setReactivando] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [u, r] = await Promise.all([getUsuarios(), getRoles()]);
      setUsuarios(u);
      setRoles(r);
    } catch { setError('No se pudieron cargar los usuarios.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deLaPestana = useMemo(
    () => usuarios.filter(u => (u.rol.nombre_rol === 'Conductor') === (pestana === 'conductores')),
    [usuarios, pestana]
  );
  const totalInactivos = useMemo(() => deLaPestana.filter(u => u.estado === 'INACTIVO').length, [deLaPestana]);
  const listados = useMemo(
    () => (verInactivos ? deLaPestana : deLaPestana.filter(u => u.estado !== 'INACTIVO')),
    [deLaPestana, verInactivos]
  );

  const rolesPresentes = useMemo(
    () => Array.from(new Set(listados.map(u => u.rol.nombre_rol))),
    [listados]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return listados.filter(u => {
      if (filtroRol !== 'Todos' && u.rol.nombre_rol !== filtroRol) return false;
      if (!q) return true;
      return u.nombre_completo.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
  }, [listados, busqueda, filtroRol]);

  const confirmarBaja = async () => {
    if (!modalBaja) return;
    setBajando(true); setErrorBaja(null);
    try {
      await darDeBajaUsuario(modalBaja.id_usuario);
      setModalBaja(null);
      await load();
    } catch (err: any) {
      setErrorBaja(err?.response?.data?.detail ?? 'No se pudo dar de baja al usuario.');
    } finally {
      setBajando(false);
    }
  };

  const reactivar = async (u: UsuarioCuenta) => {
    setReactivando(u.id_usuario); setError(null);
    try {
      await reactivarUsuario(u.id_usuario);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo reactivar al usuario.');
    } finally {
      setReactivando(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda, filtroRol]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <UserCog size={22} color="#3a3327" />
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Personas</Typography>
            <Chip label={usuarios.filter(u => u.estado !== 'INACTIVO').length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
            <Chip
              icon={<Lock size={12} />} label="Solo Administrador" size="small"
              sx={{ bgcolor: '#fdf1dc', color: colors.accent700, fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Conductores (socios) y personal del sindicato: altas, cuentas, accesos y bajas en un solo lugar.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalCrear(true)}
            sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 }, fontWeight: 700 }}
          >
            Nueva persona
          </Button>
          <IconButton onClick={load} sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}>
            <RefreshCw size={16} />
          </IconButton>
        </Box>
      </Box>

      <Tabs
        value={pestana}
        onChange={(_, v) => { setPestana(v); setFiltroRol('Todos'); setVerInactivos(false); }}
        sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38, textTransform: 'none', fontWeight: 700 } }}
      >
        <Tab value="conductores" label={`Conductores (${usuarios.filter(u => u.rol.nombre_rol === 'Conductor' && u.estado !== 'INACTIVO').length})`} />
        <Tab value="personal" label={`Personal (${usuarios.filter(u => u.rol.nombre_rol !== 'Conductor' && u.estado !== 'INACTIVO').length})`} />
      </Tabs>

      <Alert severity="info">
        ¿Olvidó su contraseña? Restablece la clave y comunícala directamente. Al crear una cuenta
        nueva, en cambio, la contraseña se genera sola y solo se envía por correo.
      </Alert>

      {error && <Alert severity="error" onClose={load}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Buscar por nombre o usuario..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          sx={{ minWidth: 260, flex: 1, maxWidth: 360 }}
          slotProps={{ input: { startAdornment: (
            <InputAdornment position="start"><Search size={15} color="#a89f8f" /></InputAdornment>
          ) } }}
        />
        <Chip
          label={`Todos ${listados.length}`} onClick={() => setFiltroRol('Todos')}
          sx={{
            fontWeight: 700, bgcolor: filtroRol === 'Todos' ? colors.ink : '#f1efe9',
            color: filtroRol === 'Todos' ? '#fff' : 'text.secondary',
          }}
        />
        {rolesPresentes.map(rol => (
          <Chip
            key={rol} label={rol} onClick={() => setFiltroRol(rol)}
            sx={{
              fontWeight: 600, bgcolor: filtroRol === rol ? colors.ink : '#f1efe9',
              color: filtroRol === rol ? '#fff' : 'text.secondary',
            }}
          />
        ))}
        {(totalInactivos > 0 || verInactivos) && (
          <Chip
            icon={<UserX size={13} />}
            label={`Ver inactivos (${totalInactivos})`}
            onClick={() => { setVerInactivos(v => !v); setFiltroRol('Todos'); }}
            sx={{
              ml: 'auto', fontWeight: 600,
              bgcolor: verInactivos ? colors.ink : '#f1efe9',
              color: verInactivos ? '#fff' : 'text.secondary',
              '& .MuiChip-icon': { color: verInactivos ? '#fff' : '#6b6152' },
            }}
          />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : filtrados.length === 0 ? (
        <Alert severity="info">No hay usuarios que coincidan con la búsqueda.</Alert>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: 2 }}>
            {visibles.map(u => {
              const tint = ROL_TINT[u.rol.nombre_rol] ?? { bg: '#f1efe9', fg: '#6b6152' };
              return (
                <Card key={u.id_usuario} sx={{ borderRadius: 4, opacity: u.estado === 'INACTIVO' ? 0.72 : 1 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        bgcolor: tint.bg, color: tint.fg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={22} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.nombre_completo}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>@{u.username}</Typography>
                      </Box>
                      <Chip
                        label={u.estado} size="small"
                        sx={{ ml: 'auto', flexShrink: 0, bgcolor: ESTADO_STYLE[u.estado]?.bg, color: ESTADO_STYLE[u.estado]?.fg, fontWeight: 700, fontSize: 10 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: tint.fg }}>
                      {ROL_ICON[u.rol.nombre_rol]}
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tint.fg }}>{u.rol.nombre_rol}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: 'text.secondary' }}>
                        <Mail size={13} color="#a89f8f" />
                        <Typography sx={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: '#a89f8f' }}>
                        <Clock size={13} />
                        <Typography sx={{ fontSize: 12.5 }}>{formatoUltimoAcceso(u.ultimo_acceso)}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, mt: 0.5 }}>
                      {u.estado === 'INACTIVO' ? (
                        <Button
                          size="small" onClick={() => reactivar(u)} disabled={reactivando === u.id_usuario}
                          startIcon={<UserCheck size={13} />}
                          sx={{ fontSize: 12, fontWeight: 700, color: '#2f7d5b', px: 0 }}
                        >
                          Reactivar
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="small" onClick={() => setModalEditar(u)} startIcon={<Pencil size={12} />}
                            sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', px: 0 }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small" onClick={() => setModalReset(u)} startIcon={<KeyRound size={13} />}
                            sx={{ fontSize: 12, fontWeight: 700, color: colors.ink, px: 0 }}
                          >
                            Resetear clave
                          </Button>
                          <Button
                            size="small" onClick={() => setModalReenviar(u)} startIcon={<Send size={12} />}
                            disabled={!u.email} title={u.email ? 'Generar clave nueva y enviarla por correo' : 'Este usuario no tiene correo'}
                            sx={{ fontSize: 12, fontWeight: 700, color: '#2f7d5b', px: 0 }}
                          >
                            Reenviar credenciales
                          </Button>
                          {u.id_usuario !== yo?.id_usuario && (
                            <Button
                              size="small" onClick={() => { setErrorBaja(null); setModalBaja(u); }} startIcon={<UserX size={13} />}
                              sx={{ fontSize: 12, fontWeight: 700, color: '#c0392b', px: 0 }}
                            >
                              Dar de baja
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              Mostrando {(paginaSegura - 1) * POR_PAGINA + 1}–{Math.min(paginaSegura * POR_PAGINA, filtrados.length)} de {filtrados.length} usuarios
            </Typography>
            {totalPaginas > 1 && (
              <Pagination
                count={totalPaginas} page={paginaSegura} onChange={(_, p) => setPagina(p)}
                shape="rounded" size="small"
              />
            )}
          </Box>
        </>
      )}

      <ConfirmarBajaDialog
        open={!!modalBaja}
        titulo={modalBaja ? `¿Dar de baja a ${modalBaja.nombre_completo}?` : ''}
        detalles={[
          'No podrá iniciar sesión y su sesión actual se cierra de inmediato.',
          'La cuenta no se borra: se conserva todo su historial de viajes y pagos.',
          ...(modalBaja?.rol.nombre_rol === 'Conductor'
            ? ['Como es conductor, también quedan inactivos su socio y su móvil, y sale de la fila virtual.']
            : []),
          'Puedes reactivarla cuando quieras.',
        ]}
        loading={bajando}
        error={errorBaja}
        onConfirmar={confirmarBaja}
        onClose={() => setModalBaja(null)}
      />
      {modalReenviar && <ModalReenviar usuario={modalReenviar} onClose={() => setModalReenviar(null)} />}
      {modalReset && <ModalResetear usuario={modalReset} onClose={() => { setModalReset(null); load(); }} />}
      {modalEditar && (
        <ModalEditarUsuario
          usuario={modalEditar}
          onClose={() => setModalEditar(null)}
          onGuardado={() => { setModalEditar(null); load(); }}
        />
      )}
      {modalCrear && (
        <NuevaPersonaDialog
          roles={roles}
          onClose={() => setModalCrear(false)}
          onCreado={() => { setModalCrear(false); load(); }}
        />
      )}
    </Box>
  );
}
