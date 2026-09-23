import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Alert, CircularProgress, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
  Pagination, MenuItem,
} from '@mui/material';
import {
  UserCog, RefreshCw, KeyRound, X, Check, User, Shield, PhoneCall, DollarSign,
  ClipboardList, Truck, Flag, Mail, Clock, Search, Plus, Lock, Car, Briefcase,
  ArrowLeft, Eye, EyeOff,
} from 'lucide-react';
import {
  getUsuarios, getRoles, crearUsuario, resetearPassword,
  type UsuarioCuenta, type RolCuenta,
} from '../api/usuarios';
import { getSocios } from '../api/socios';
import type { Socio } from '../types';
import { sugerirEmail, sugerirUsername } from '../utils/sugerirCredenciales';
import { colors } from '../theme';

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
    ? new Date(fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
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

// ---------- Crear usuario (2 pasos: tipo -> datos) ----------
type TipoUsuario = 'socio' | 'personal';

function TarjetaTipo({ seleccionado, onClick, icono, iconoBg, titulo, descripcion, pie }: {
  seleccionado: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  iconoBg: string;
  titulo: string;
  descripcion: string;
  pie: string;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1, cursor: 'pointer', borderRadius: 4, p: 3, textAlign: 'center',
        border: '2px solid', borderColor: seleccionado ? colors.ink : 'divider',
        bgcolor: seleccionado ? '#eaf3fb' : 'background.paper',
        transition: 'border-color .15s, background-color .15s',
      }}
    >
      <Box sx={{
        width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 1.5,
        bgcolor: iconoBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icono}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, minHeight: 34 }}>{descripcion}</Typography>
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>{pie}</Typography>
      </Box>
    </Box>
  );
}

function ModalCrearUsuario({ roles, onClose, onCreado }: {
  roles: RolCuenta[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [paso, setPaso] = useState<'tipo' | 'datos'>('tipo');
  const [tipo, setTipo] = useState<TipoUsuario>('socio');

  const rolConductor = roles.find(r => r.nombre_rol === 'Conductor');
  const rolesPersonal = roles.filter(r => r.nombre_rol !== 'Conductor');

  // --- Paso "socio" ---
  const [socios, setSocios] = useState<Socio[] | null>(null);
  const [errorSocios, setErrorSocios] = useState<string | null>(null);
  const [busquedaSocio, setBusquedaSocio] = useState('');
  const [socioId, setSocioId] = useState<number | null>(null);

  // --- Campos comunes del formulario de datos ---
  const [rolId, setRolId] = useState<number | ''>('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTocado, setUsernameTocado] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTocado, setEmailTocado] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (tipo !== 'socio' || socios !== null) return;
    getSocios()
      .then(todos => setSocios(todos.filter(s => s.usuario == null)))
      .catch(() => setErrorSocios('No se pudieron cargar los socios.'));
  }, [tipo, socios]);

  const socioSeleccionado = socios?.find(s => s.id_socio === socioId) ?? null;
  const sociosFiltrados = useMemo(() => {
    if (!socios) return [];
    const q = busquedaSocio.trim().toLowerCase();
    if (!q) return socios;
    return socios.filter(s => s.nombre_completo.toLowerCase().includes(q) || s.rut.toLowerCase().includes(q));
  }, [socios, busquedaSocio]);

  // Nombre/apellido fuente de la sugerencia: el del socio elegido (camino
  // Socio) o los que la persona esta tipeando (camino Personal).
  const nombreParaSugerencia = tipo === 'socio' ? (socioSeleccionado?.nombre ?? '') : nombre;
  const apellidoParaSugerencia = tipo === 'socio' ? (socioSeleccionado?.apellido ?? '') : apellido;
  const usuarioSugerido = sugerirUsername(nombreParaSugerencia, apellidoParaSugerencia);
  const emailSugerido = sugerirEmail(nombreParaSugerencia, apellidoParaSugerencia);

  // Autocompleta el campo (una sola vez, hasta que la persona lo edite a
  // mano) apenas hay sugerencia disponible.
  useEffect(() => {
    if (!usernameTocado && usuarioSugerido) setUsername(usuarioSugerido);
  }, [usuarioSugerido, usernameTocado]);
  useEffect(() => {
    if (!emailTocado && emailSugerido) setEmail(emailSugerido);
  }, [emailSugerido, emailTocado]);

  function elegirTipo(nuevo: TipoUsuario) {
    setTipo(nuevo);
  }

  function continuar() {
    setError(null);
    setPaso('datos');
  }

  function volverATipo() {
    setPaso('tipo');
    setError(null);
  }

  async function confirmarCreacion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tipo === 'socio' && !socioId) { setError('Elegí un socio de la lista.'); return; }
    if (tipo === 'personal' && !rolId) { setError('Elegí un rol.'); return; }
    if (tipo === 'personal' && (!nombre.trim() || !apellido.trim())) { setError('Nombre y apellido son requeridos.'); return; }
    if (!username.trim()) { setError('El usuario es requerido.'); return; }
    if (password.length < PASSWORD_MIN_LEN) { setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres.`); return; }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return; }

    setCreando(true);
    try {
      await crearUsuario({
        id_rol: tipo === 'socio' ? Number(rolConductor!.id_rol) : Number(rolId),
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        ...(tipo === 'personal' ? { nombre: nombre.trim(), apellido: apellido.trim() } : {}),
        ...(tipo === 'socio' ? { id_socio: socioId! } : {}),
      });
      onCreado();
    } catch (err: any) {
      const detail = err?.response?.data;
      const primerError = detail && typeof detail === 'object'
        ? Object.values(detail).flat()[0]
        : null;
      setError((primerError as string) ?? detail?.detail ?? 'No se pudo crear el usuario.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth={paso === 'tipo' ? 'sm' : 'md'} fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Plus size={20} />
            <Typography sx={{ fontWeight: 700, fontSize: 19 }}>Crear usuario</Typography>
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
            {paso === 'tipo' ? 'Paso 1 de 2 · Tipo de usuario' : `Paso 2 de 2 · ${tipo === 'socio' ? 'Socio conductor' : 'Personal del sindicato'}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {paso === 'datos' && (
            <Button size="small" startIcon={<ArrowLeft size={14} />} onClick={volverATipo} sx={{ color: 'text.secondary' }}>
              Cambiar tipo
            </Button>
          )}
          <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
        </Box>
      </DialogTitle>

      {paso === 'tipo' ? (
        <>
          <DialogContent sx={{ pt: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, textAlign: 'center' }}>¿Qué tipo de usuario vas a crear?</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', mb: 3 }}>
              Selecciona una opción para continuar.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TarjetaTipo
                seleccionado={tipo === 'socio'} onClick={() => elegirTipo('socio')}
                icono={<Car size={28} color={colors.ink} />} iconoBg="#fdf1dc"
                titulo="Socio (Conductor)"
                descripcion="Vincular usuario a un socio conductor ya registrado"
                pie="Rol: Conductor"
              />
              <TarjetaTipo
                seleccionado={tipo === 'personal'} onClick={() => elegirTipo('personal')}
                icono={<Briefcase size={26} color={colors.ink} />} iconoBg="#e8ecf9"
                titulo="Personal del sindicato"
                descripcion="Paletero, Tesorero, Secretario, Central o Administrador"
                pie="Cuenta para el equipo del sindicato"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 3, color: 'text.secondary' }}>
              <Lock size={13} />
              <Typography sx={{ fontSize: 12 }}>Solo los administradores pueden crear usuarios.</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button variant="outlined" onClick={onClose} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={continuar} disabled={!rolConductor && tipo === 'socio'}
              sx={{ ml: 'auto', color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}>
              Continuar →
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box component="form" onSubmit={confirmarCreacion}>
          <DialogContent sx={{ pt: 1 }}>
            {tipo === 'socio' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Selecciona un socio</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                    Solo se muestran socios que aún no tienen usuario.
                  </Typography>
                  <TextField
                    fullWidth size="small" placeholder="Buscar por nombre o RUT..."
                    value={busquedaSocio} onChange={e => setBusquedaSocio(e.target.value)}
                    slotProps={{ input: { startAdornment: (
                      <InputAdornment position="start"><Search size={15} color="#a89f8f" /></InputAdornment>
                    ) } }}
                    sx={{ mb: 1.5 }}
                  />
                  {errorSocios && <Alert severity="error" sx={{ mb: 1.5 }}>{errorSocios}</Alert>}
                  {socios === null ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={20} /></Box>
                  ) : sociosFiltrados.length === 0 ? (
                    <Alert severity="info">No hay socios sin usuario que coincidan.</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                      {sociosFiltrados.map(s => (
                        <Box
                          key={s.id_socio}
                          onClick={() => setSocioId(s.id_socio)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 3, cursor: 'pointer',
                            border: '1.5px solid', borderColor: socioId === s.id_socio ? colors.ink : 'divider',
                            bgcolor: socioId === s.id_socio ? '#eaf3fb' : 'transparent',
                          }}
                        >
                          <Box sx={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, bgcolor: '#f1efe9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <User size={16} color="#a89f8f" />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.nombre_completo}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.rut}</Typography>
                          </Box>
                          <Chip label="Sin usuario" size="small" sx={{ bgcolor: '#fdf1dc', color: colors.accent700, fontWeight: 700, fontSize: 10 }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                  {socios !== null && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>
                      {sociosFiltrados.length} socio{sociosFiltrados.length === 1 ? '' : 's'} disponible{sociosFiltrados.length === 1 ? '' : 's'}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1.5 }}>Datos de acceso</Typography>
                  {socioSeleccionado ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#fdf1dc', borderRadius: 3, p: 1.5 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: '50%', bgcolor: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Car size={18} color={colors.ink} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{socioSeleccionado.nombre_completo}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Rol: Conductor</Typography>
                        </Box>
                      </Box>

                      <TextField
                        fullWidth size="small" label="Usuario" value={username}
                        onChange={e => { setUsername(e.target.value); setUsernameTocado(true); }}
                        helperText={usuarioSugerido ? `Sugerido: ${usuarioSugerido} · Puedes editarlo` : undefined}
                      />
                      <TextField
                        fullWidth size="small" label="Email" value={email}
                        onChange={e => { setEmail(e.target.value); setEmailTocado(true); }}
                        helperText={emailSugerido ? `Sugerido: ${emailSugerido} · Puedes editarlo` : undefined}
                      />
                      <TextField
                        fullWidth size="small" label="Contraseña" type={verPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        slotProps={{ input: { endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setVerPassword(v => !v)} edge="end">
                              {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </IconButton>
                          </InputAdornment>
                        ) } }}
                      />
                      <TextField
                        fullWidth size="small" label="Confirmar contraseña" type={verPassword ? 'text' : 'password'}
                        value={confirmar} onChange={e => setConfirmar(e.target.value)}
                      />
                      <Alert severity="info" sx={{ fontSize: 12.5 }}>
                        Comunica las credenciales directamente al socio. No se envían correos automáticos.
                      </Alert>
                    </Box>
                  ) : (
                    <Alert severity="info">Elegí un socio de la lista para continuar.</Alert>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 640, mx: 'auto' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Briefcase size={16} color={colors.ink} />
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Datos del personal</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth select size="small" label="Rol" value={rolId}
                      onChange={e => setRolId(Number(e.target.value))}
                      helperText={`Roles disponibles: ${rolesPersonal.map(r => r.nombre_rol).join(', ')}`}
                    >
                      {rolesPersonal.map(r => (
                        <MenuItem key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</MenuItem>
                      ))}
                    </TextField>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField fullWidth size="small" label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
                      <TextField fullWidth size="small" label="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} />
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Lock size={16} color={colors.ink} />
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Datos de acceso</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        fullWidth size="small" label="Usuario" value={username}
                        onChange={e => { setUsername(e.target.value); setUsernameTocado(true); }}
                        helperText={usuarioSugerido ? `Sugerido: ${usuarioSugerido} · Puedes editarlo` : undefined}
                      />
                      <TextField
                        fullWidth size="small" label="Email" value={email}
                        onChange={e => { setEmail(e.target.value); setEmailTocado(true); }}
                        helperText={emailSugerido ? `Sugerido: ${emailSugerido} · Puedes editarlo` : undefined}
                      />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        fullWidth size="small" label="Contraseña" type={verPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        slotProps={{ input: { endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setVerPassword(v => !v)} edge="end">
                              {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </IconButton>
                          </InputAdornment>
                        ) } }}
                      />
                      <TextField
                        fullWidth size="small" label="Confirmar contraseña" type={verPassword ? 'text' : 'password'}
                        value={confirmar} onChange={e => setConfirmar(e.target.value)}
                      />
                    </Box>
                    <Alert severity="info" sx={{ fontSize: 12.5 }}>
                      Comunica las credenciales directamente a la persona. No se envían correos automáticos.
                    </Alert>
                  </Box>
                </Box>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button variant="outlined" onClick={volverATipo} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Volver
            </Button>
            <Button
              type="submit" variant="contained" disabled={creando}
              startIcon={creando ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ ml: 'auto', color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}
            >
              {creando ? 'Creando...' : 'Crear usuario →'}
            </Button>
          </DialogActions>
        </Box>
      )}
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
  const [modalCrear, setModalCrear] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('Todos');
  const [pagina, setPagina] = useState(1);

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

  const rolesPresentes = useMemo(
    () => Array.from(new Set(usuarios.map(u => u.rol.nombre_rol))),
    [usuarios]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(u => {
      if (filtroRol !== 'Todos' && u.rol.nombre_rol !== filtroRol) return false;
      if (!q) return true;
      return u.nombre_completo.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
  }, [usuarios, busqueda, filtroRol]);

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
            <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Usuarios y accesos</Typography>
            <Chip label={usuarios.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
            <Chip
              icon={<Lock size={12} />} label="Solo Administrador" size="small"
              sx={{ bgcolor: '#fdf1dc', color: colors.accent700, fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Administra las cuentas y permisos del sindicato.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalCrear(true)}
            sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 }, fontWeight: 700 }}
          >
            Nuevo usuario
          </Button>
          <IconButton onClick={load} sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}>
            <RefreshCw size={16} />
          </IconButton>
        </Box>
      </Box>

      <Alert severity="info">
        ¿Olvidó su contraseña? Restablece la clave y comunícala directamente. No se envían correos automáticos.
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
          label={`Todos ${usuarios.length}`} onClick={() => setFiltroRol('Todos')}
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
                <Card key={u.id_usuario} sx={{ borderRadius: 4 }}>
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

                    <Button
                      size="small" onClick={() => setModalReset(u)} startIcon={<KeyRound size={13} />}
                      sx={{ mt: 0.5, fontSize: 12, fontWeight: 700, color: colors.ink, alignSelf: 'flex-start', px: 0 }}
                    >
                      Resetear clave
                    </Button>
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

      {modalReset && <ModalResetear usuario={modalReset} onClose={() => { setModalReset(null); load(); }} />}
      {modalCrear && (
        <ModalCrearUsuario
          roles={roles}
          onClose={() => setModalCrear(false)}
          onCreado={() => { setModalCrear(false); load(); }}
        />
      )}
    </Box>
  );
}
