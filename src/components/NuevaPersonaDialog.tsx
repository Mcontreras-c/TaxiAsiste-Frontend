import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  IconButton, Alert, CircularProgress,
} from '@mui/material';
import { Plus, X, Car, Briefcase, Lock, Send, Check, ArrowLeft, User } from 'lucide-react';
import { crearConductor, crearUsuario, type RolCuenta } from '../api/usuarios';
import { sugerirUsername } from '../utils/sugerirCredenciales';
import { colors } from '../theme';

type Tipo = 'conductor' | 'personal';

const boton = { color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } } as const;

// Aplana los errores de DRF (campos y campos anidados) al primer mensaje legible.
function primerError(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  const buscar = (v: unknown): string | null => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.length ? buscar(v[0]) : null;
    if (v && typeof v === 'object') {
      for (const x of Object.values(v)) { const r = buscar(x); if (r) return r; }
    }
    return null;
  };
  return buscar(data) ?? porDefecto;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Tarjeta({ onClick, icono, bg, titulo, texto }: {
  onClick: () => void; icono: React.ReactNode; bg: string; titulo: string; texto: string;
}) {
  return (
    <Box onClick={onClick} sx={{
      flex: 1, cursor: 'pointer', borderRadius: 4, p: 3, textAlign: 'center', border: '2px solid', borderColor: 'divider',
      '&:hover': { borderColor: colors.ink, bgcolor: 'rgba(96,165,250,.12)' }, transition: 'border-color .15s, background-color .15s',
    }}>
      <Box sx={{ width: 60, height: 60, borderRadius: '50%', mx: 'auto', mb: 1.5, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icono}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>{texto}</Typography>
    </Box>
  );
}

/**
 * "Nueva persona": un solo lugar para dar de alta a un conductor (socio + vehículo +
 * cuenta, todo o nada) o a personal del sindicato. Las credenciales salen por correo.
 */
export default function NuevaPersonaDialog({ roles, onClose, onCreado }: {
  roles: RolCuenta[]; onClose: () => void; onCreado: () => void;
}) {
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ email: string; enviado: boolean } | null>(null);

  // Datos personales / acceso
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [email2, setEmail2] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTocado, setUsernameTocado] = useState(false);
  const [rolId, setRolId] = useState<number | ''>('');
  // Vehículo
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');

  const rolesPersonal = roles.filter(r => r.nombre_rol !== 'Conductor');
  const sugerido = sugerirUsername(nombre, apellido);
  useEffect(() => { if (!usernameTocado) setUsername(sugerido); }, [sugerido, usernameTocado]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const correo = email.trim();
    if (!nombre.trim() || !apellido.trim()) return setError('Nombre y apellido son requeridos.');
    if (!EMAIL_RE.test(correo)) return setError('Ingresa un correo válido: ahí se envían las credenciales.');
    if (correo.toLowerCase() !== email2.trim().toLowerCase()) return setError('Los dos correos no coinciden.');

    if (tipo === 'conductor') {
      if (!rut.trim()) return setError('El RUT es requerido.');
      if (!patente.trim() || !marca.trim() || !modelo.trim()) return setError('Patente, marca y modelo del vehículo son requeridos.');
    } else if (!rolId) {
      return setError('Elige un rol.');
    } else if (!username.trim()) {
      return setError('El usuario es requerido.');
    }

    setGuardando(true);
    try {
      if (tipo === 'conductor') {
        const r = await crearConductor({
          nombre: nombre.trim(), apellido: apellido.trim(), rut: rut.trim(), email: correo,
          ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
          ...(username.trim() ? { username: username.trim() } : {}),
          vehiculo: {
            patente: patente.trim(), marca: marca.trim(), modelo: modelo.trim(),
            ...(anio ? { anio: Number(anio) } : {}), ...(color.trim() ? { color: color.trim() } : {}),
          },
        });
        setResultado({ email: correo, enviado: r.correo_enviado });
      } else {
        await crearUsuario({ id_rol: Number(rolId), username: username.trim(), email: correo, nombre: nombre.trim(), apellido: apellido.trim() });
        setResultado({ email: correo, enviado: true });
      }
    } catch (err) {
      setError(primerError(err, 'No se pudo crear. Revisa los datos.'));
    } finally { setGuardando(false); }
  };

  if (resultado) {
    return (
      <Dialog open onClose={onCreado} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Send size={20} /><Typography sx={{ fontWeight: 700, fontSize: 17 }}>Persona creada</Typography>
        </DialogTitle>
        <DialogContent>
          {resultado.enviado ? (
            <Alert severity="success" icon={<Check size={18} />}>
              Se enviaron las credenciales a <strong>{resultado.email}</strong>. La contraseña no se muestra en pantalla.
            </Alert>
          ) : (
            <Alert severity="warning">
              La cuenta quedó creada, pero el correo a <strong>{resultado.email}</strong> no salió. Usa «Reenviar
              credenciales» desde su ficha cuando el correo esté bien.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}><Button fullWidth variant="contained" onClick={onCreado}>Listo</Button></DialogActions>
      </Dialog>
    );
  }

  const cabecera = (
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Plus size={20} />
        <Typography sx={{ fontWeight: 700, fontSize: 19 }}>
          {tipo === 'conductor' ? 'Nuevo conductor' : tipo === 'personal' ? 'Nuevo personal' : 'Nueva persona'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {tipo && <Button size="small" startIcon={<ArrowLeft size={14} />} onClick={() => { setTipo(null); setError(null); }} sx={{ color: 'text.secondary' }}>Cambiar tipo</Button>}
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </Box>
    </DialogTitle>
  );

  if (!tipo) {
    return (
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        {cabecera}
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', mb: 2.5 }}>¿A quién vas a dar de alta?</Typography>
          <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Tarjeta onClick={() => setTipo('conductor')} bg="rgba(255,222,0,.12)" icono={<Car size={28} color={colors.ink} />}
              titulo="Conductor (socio)" texto="Datos personales, vehículo y acceso a la app, en un solo paso" />
            <Tarjeta onClick={() => setTipo('personal')} bg="rgba(96,165,250,.14)" icono={<Briefcase size={26} color={colors.ink} />}
              titulo="Personal del sindicato" texto="Administrador, Central, Tesorero, Secretario o Paletero" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 3, color: 'text.secondary' }}>
            <Lock size={13} /><Typography sx={{ fontSize: 12 }}>Solo los administradores pueden dar de alta personas.</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      {cabecera}
      <Box component="form" onSubmit={guardar}>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <User size={16} /><Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Datos personales</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField size="small" label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} />
              <TextField size="small" label="Apellido *" value={apellido} onChange={e => setApellido(e.target.value)} />
              {tipo === 'conductor' && (
                <TextField size="small" label="RUT *" value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-5" />
              )}
              <TextField size="small" label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" />
            </Box>
          </Box>

          {tipo === 'conductor' && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Car size={16} /><Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Vehículo</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5,1fr)' }, gap: 2 }}>
                <TextField size="small" label="Patente *" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())} />
                <TextField size="small" label="Marca *" value={marca} onChange={e => setMarca(e.target.value)} />
                <TextField size="small" label="Modelo *" value={modelo} onChange={e => setModelo(e.target.value)} />
                <TextField size="small" label="Año" type="number" value={anio} onChange={e => setAnio(e.target.value)} />
                <TextField size="small" label="Color" value={color} onChange={e => setColor(e.target.value)} />
              </Box>
            </Box>
          )}

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Lock size={16} /><Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>Acceso</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {tipo === 'personal' && (
                <TextField select size="small" label="Rol *" value={rolId} onChange={e => setRolId(Number(e.target.value))}>
                  {rolesPersonal.map(r => <MenuItem key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</MenuItem>)}
                </TextField>
              )}
              <TextField size="small" label="Usuario" value={username}
                onChange={e => { setUsername(e.target.value); setUsernameTocado(true); }}
                helperText={sugerido ? 'Sugerido a partir del nombre; puedes editarlo' : undefined} />
              <TextField size="small" label="Correo real *" value={email} onChange={e => setEmail(e.target.value)}
                helperText="Ahí llegan la clave provisoria y el link de la app" />
              <TextField size="small" label="Repite el correo *" value={email2} onChange={e => setEmail2(e.target.value)} />
            </Box>
            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              La contraseña se genera sola y se envía únicamente por correo: no se muestra en pantalla.
            </Alert>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button variant="outlined" onClick={onClose} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={guardando} sx={{ ml: 'auto', ...boton }}
            startIcon={guardando ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {guardando ? 'Creando...' : tipo === 'conductor' ? 'Crear conductor' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
