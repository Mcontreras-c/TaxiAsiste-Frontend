import { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Button, Alert, CircularProgress, Collapse, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  InputAdornment, Card, CardContent,
} from '@mui/material';
import {
  Users, Plus, AlertTriangle, X, Search, Phone, MapPin,
  Car, ChevronDown, ChevronRight, Lock, Unlock, Pencil, Check, Download, UserX, UserCheck,
} from 'lucide-react';
import { exportarAExcel } from '../utils/exportarExcel';
import {
  getSocios, createSocio, updateSocio, desbloquearSocio, bloquearSocio, darDeBajaSocio, reactivarSocio,
} from '../api/socios';
import { getMoviles, createMovil, updateMovil } from '../api/moviles';
import type { Socio, Movil } from '../types';
import { colors } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';
import ConfirmarBajaDialog from '../components/ConfirmarBajaDialog';
import { useAuthStore } from '../store/authStore';

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  ACTIVO:    { bg: '#e4f3ec', fg: '#2f7d5b' },
  INACTIVO:  { bg: '#f1efe9', fg: '#6b6152' },
  BLOQUEADO: { bg: '#fbe9e9', fg: '#c0392b' },
};

const MOVIL_ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  DISPONIBLE:  { bg: '#e4f3ec', fg: '#2f7d5b' },
  EN_SERVICIO: { bg: '#e8ecf9', fg: '#3355a8' },
  EN_VIAJE:    { bg: '#f1e7fb', fg: '#7128b8' },
  BLOQUEADO:   { bg: '#fbe9e9', fg: '#c0392b' },
  INACTIVO:    { bg: '#f1efe9', fg: '#6b6152' },
};

const gradientBtnSx = {
  color: colors.ink,
  background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
  '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
};

interface SocioFormData {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
}

const SOCIO_EMPTY: SocioFormData = { rut: '', nombre: '', apellido: '', telefono: '', direccion: '' };

const SOCIO_CAMPOS: { label: string; key: keyof SocioFormData; placeholder: string }[] = [
  { label: 'RUT *',      key: 'rut',       placeholder: '12345678-9' },
  { label: 'Nombre *',   key: 'nombre',    placeholder: 'Juan' },
  { label: 'Apellido *', key: 'apellido',  placeholder: 'Pérez' },
  { label: 'Teléfono',   key: 'telefono',  placeholder: '912345678' },
  { label: 'Dirección',  key: 'direccion', placeholder: 'Av. Principal 123' },
];

interface VehiculoFormData {
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
}

const VEHICULO_EMPTY: VehiculoFormData = { patente: '', marca: '', modelo: '', anio: '', color: '' };

const VEHICULO_CAMPOS: { label: string; key: keyof VehiculoFormData; placeholder: string; width: number }[] = [
  { label: 'Patente', key: 'patente', placeholder: 'ABCD12',  width: 130 },
  { label: 'Marca',   key: 'marca',   placeholder: 'Toyota',  width: 130 },
  { label: 'Modelo',  key: 'modelo',  placeholder: 'Corolla', width: 130 },
  { label: 'Año',     key: 'anio',    placeholder: '2020',    width: 90 },
  { label: 'Color',   key: 'color',   placeholder: 'Blanco',  width: 110 },
];

// ---------- Tarjeta de vehiculo (dentro del desplegable de cada socio) ----------
function TarjetaVehiculo({
  socio, movil, onVehiculoCreado, onVehiculoActualizado, puedeEditar,
}: {
  socio: Socio;
  movil: Movil | undefined;
  onVehiculoCreado: (m: Movil) => void;
  onVehiculoActualizado: (m: Movil) => void;
  puedeEditar: boolean;
}) {
  const [form, setForm] = useState<VehiculoFormData>(VEHICULO_EMPTY);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const iniciarEdicion = () => {
    setForm({
      patente: movil?.patente ?? '',
      marca: movil?.marca ?? '',
      modelo: movil?.modelo ?? '',
      anio: movil?.anio ? String(movil.anio) : '',
      color: movil?.color ?? '',
    });
    setEditando(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patente) { setError('La patente es obligatoria.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        patente: form.patente.toUpperCase(),
        marca: form.marca || null,
        modelo: form.modelo || null,
        anio: form.anio ? Number(form.anio) : null,
        color: form.color || null,
      };
      if (movil) {
        const actualizado = await updateMovil(movil.id_movil, payload);
        onVehiculoActualizado(actualizado);
      } else {
        const nuevo = await createMovil({ ...payload, socio: socio.id_socio, estado_operativo: 'DISPONIBLE' });
        onVehiculoCreado(nuevo);
      }
      setEditando(false);
    } catch (err: any) {
      setError(err?.response?.data?.patente?.[0] ?? 'Error al guardar el vehículo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBloqueo = async () => {
    if (!movil) return;
    setCambiandoEstado(true);
    try {
      const nuevoEstado = movil.estado_operativo === 'BLOQUEADO' ? 'DISPONIBLE' : 'BLOQUEADO';
      const actualizado = await updateMovil(movil.id_movil, { estado_operativo: nuevoEstado });
      onVehiculoActualizado(actualizado);
    } finally {
      setCambiandoEstado(false);
    }
  };

  if (editando) {
    return (
      <Box sx={{ p: 3, bgcolor: '#faf8f2' }}>
        <Box component="form" onSubmit={guardar} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {VEHICULO_CAMPOS.map(({ label, key, placeholder, width }) => (
            <TextField
              key={key} size="small" label={label} placeholder={placeholder} value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              sx={{ width, bgcolor: 'background.paper' }}
            />
          ))}
          <Button type="submit" variant="contained" disabled={saving} startIcon={<Check size={15} />} sx={gradientBtnSx}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="outlined" onClick={() => setEditando(false)} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
            Cancelar
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1.5, maxWidth: 480 }}>{error}</Alert>}
      </Box>
    );
  }

  if (!movil) {
    return (
      <Box sx={{
        p: 3, bgcolor: '#faf8f2', display: 'flex', alignItems: 'center', gap: 2,
        border: '1.5px dashed', borderColor: 'rgba(20,17,11,.15)', borderRadius: 3, m: 2,
      }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
          bgcolor: '#f1efe9', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Car size={20} color="#a89f8f" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Sin vehículo registrado</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Este socio todavía no tiene un móvil asociado.</Typography>
        </Box>
        {puedeEditar && (
          <Button variant="contained" startIcon={<Plus size={15} />} onClick={iniciarEdicion} sx={gradientBtnSx}>
            Agregar vehículo
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{
      m: 2, p: 2.5, bgcolor: 'background.paper', borderRadius: 3,
      border: '1px solid', borderColor: 'divider',
      display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
      boxShadow: '0 1px 3px rgba(20,17,11,.06)',
    }}>
      <Box sx={{
        width: 52, height: 52, borderRadius: 3, flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(245,166,35,.3)',
      }}>
        <Car size={24} color={colors.ink} />
      </Box>

      <Box sx={{ minWidth: 110 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
          Patente
        </Typography>
        <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, fontSize: 17 }}>{movil.patente}</Typography>
      </Box>

      <Divider orientation="vertical" flexItem />

      <Box sx={{ minWidth: 140 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
          Vehículo
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
          {[movil.marca, movil.modelo].filter(Boolean).join(' ') || '—'} {movil.anio ?? ''}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 90 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
          Color
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{movil.color ?? '—'}</Typography>
      </Box>

      <Chip
        label={movil.estado_operativo.replace('_', ' ')} size="small"
        sx={{ bgcolor: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.bg, color: MOVIL_ESTADO_STYLE[movil.estado_operativo]?.fg, fontWeight: 700, fontSize: 10.5 }}
      />

      {puedeEditar && (
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={iniciarEdicion} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Pencil size={14} />
          </IconButton>
          <Button
            size="small" variant="outlined" disabled={cambiandoEstado} onClick={toggleBloqueo}
            startIcon={movil.estado_operativo === 'BLOQUEADO' ? <Unlock size={14} /> : <Lock size={14} />}
            sx={{
              color: movil.estado_operativo === 'BLOQUEADO' ? '#2f7d5b' : '#c0392b',
              borderColor: movil.estado_operativo === 'BLOQUEADO' ? '#2f7d5b' : '#c0392b',
            }}
          >
            {movil.estado_operativo === 'BLOQUEADO' ? 'Desbloquear móvil' : 'Bloquear móvil'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default function SociosPage() {
  const { usuario } = useAuthStore();
  const puedeEditar = usuario?.rol === 'Administrador';

  const [socios, setSocios]       = useState<Socio[]>([]);
  const [moviles, setMoviles]     = useState<Movil[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [expandido, setExpandido] = useState<number | null>(null);

  // Modal crear/editar socio (comparten formulario)
  const [modal, setModal]           = useState<'crear' | 'editar' | null>(null);
  const [socioEditando, setSocioEditando] = useState<Socio | null>(null);
  const [form, setForm]             = useState<SocioFormData>(SOCIO_EMPTY);
  const [vehiculoForm, setVehiculoForm] = useState<VehiculoFormData>(VEHICULO_EMPTY);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [desbloqueando, setDesbloqueando] = useState<number | null>(null);
  const [bloqueando, setBloqueando] = useState<number | null>(null);
  // Los inactivos (dados de baja) quedan ocultos salvo que se pida verlos.
  const [verInactivos, setVerInactivos] = useState(false);
  const [socioBaja, setSocioBaja] = useState<Socio | null>(null);
  const [bajando, setBajando] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);
  const [reactivando, setReactivando] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([getSocios(), getMoviles()]);
      setSocios(s);
      setMoviles(m);
    } catch {
      setError('No se pudieron cargar los socios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalInactivos = socios.filter(s => s.estado_socio === 'INACTIVO').length;
  const activos = socios.filter(s => s.estado_socio !== 'INACTIVO');

  const filtered = (verInactivos ? socios : activos).filter(s =>
    `${s.nombre} ${s.apellido} ${s.rut}`.toLowerCase().includes(search.toLowerCase())
  );

  const confirmarBaja = async () => {
    if (!socioBaja) return;
    setBajando(true); setErrorBaja(null);
    try {
      await darDeBajaSocio(socioBaja.id_socio);
      setSocioBaja(null);
      await load();
    } catch (err: any) {
      setErrorBaja(err?.response?.data?.detail ?? 'No se pudo dar de baja al socio.');
    } finally {
      setBajando(false);
    }
  };

  const reactivar = async (s: Socio) => {
    setReactivando(s.id_socio); setError(null);
    try {
      await reactivarSocio(s.id_socio);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo reactivar al socio.');
    } finally {
      setReactivando(null);
    }
  };

  const movilDe = (idSocio: number) => moviles.find(m => m.socio === idSocio);

  const morosos = activos.filter(s => (s.cuotas_vencidas ?? 0) > 0).length;
  const totalVencidas = activos.reduce((acc, s) => acc + (s.cuotas_vencidas ?? 0), 0);

  const exportar = () => {
    exportarAExcel('TaxiAsiste_Socios', [{
      nombre: 'Socios',
      columnas: [
        { header: 'RUT', key: 'rut', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 24 },
        { header: 'Teléfono', key: 'telefono', width: 14 },
        { header: 'Dirección', key: 'direccion', width: 28 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Ingreso', key: 'ingreso', width: 12 },
        { header: 'Cuotas vencidas', key: 'cuotas', width: 14 },
        { header: 'Patente', key: 'patente', width: 12 },
        { header: 'Vehículo', key: 'vehiculo', width: 20 },
      ],
      filas: filtered.map(s => {
        const m = movilDe(s.id_socio);
        return {
          rut: s.rut,
          nombre: s.nombre_completo,
          telefono: s.telefono ?? '—',
          direccion: s.direccion ?? '—',
          estado: s.estado_socio,
          ingreso: new Date(s.fecha_ingreso).toLocaleDateString('es-CL'),
          cuotas: s.cuotas_vencidas ?? 0,
          patente: m?.patente ?? '—',
          vehiculo: m ? [m.marca, m.modelo].filter(Boolean).join(' ') : '—',
        };
      }),
    }]);
  };

  const abrirCrear = () => {
    setForm(SOCIO_EMPTY);
    setVehiculoForm(VEHICULO_EMPTY);
    setFormError(null);
    setModal('crear');
  };

  const abrirEditar = (s: Socio) => {
    setSocioEditando(s);
    setForm({
      rut: s.rut, nombre: s.nombre_completo.split(' ')[0] ?? '', apellido: s.nombre_completo.split(' ').slice(1).join(' '),
      telefono: s.telefono ?? '', direccion: s.direccion ?? '',
    });
    setFormError(null);
    setModal('editar');
  };

  const cerrarModal = () => setModal(null);

  const handleDesbloquear = async (s: Socio) => {
    if (!confirm(`¿Desbloquear a ${s.nombre_completo}? Vuelve a estar ACTIVO de inmediato.`)) return;
    setDesbloqueando(s.id_socio);
    try {
      await desbloquearSocio(s.id_socio);
      await load();
    } catch {
      setError('No se pudo desbloquear al socio.');
    } finally {
      setDesbloqueando(null);
    }
  };

  const handleBloquear = async (s: Socio) => {
    const motivo = prompt(`Motivo del bloqueo de ${s.nombre_completo}:`);
    if (motivo === null) return;
    setBloqueando(s.id_socio);
    try {
      await bloquearSocio(s.id_socio, motivo);
      await load();
    } catch {
      setError('No se pudo bloquear al socio.');
    } finally {
      setBloqueando(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rut || !form.nombre || !form.apellido) {
      setFormError('RUT, nombre y apellido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (modal === 'editar' && socioEditando) {
        await updateSocio(socioEditando.id_socio, {
          rut: form.rut, nombre: form.nombre, apellido: form.apellido,
          telefono: form.telefono || null, direccion: form.direccion || null,
        });
      } else {
        const nuevoSocio = await createSocio({
          rut: form.rut, nombre: form.nombre, apellido: form.apellido,
          telefono: form.telefono || null, direccion: form.direccion || null,
          estado_socio: 'ACTIVO',
        });
        if (vehiculoForm.patente) {
          await createMovil({
            socio: nuevoSocio.id_socio,
            patente: vehiculoForm.patente.toUpperCase(),
            marca: vehiculoForm.marca || null,
            modelo: vehiculoForm.modelo || null,
            anio: vehiculoForm.anio ? Number(vehiculoForm.anio) : null,
            color: vehiculoForm.color || null,
            estado_operativo: 'DISPONIBLE',
          });
        }
      }
      cerrarModal();
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.rut?.[0] ?? err?.response?.data?.patente?.[0] ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Users size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Socios</Typography>
          <Chip label={activos.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download size={15} />} onClick={exportar}
            sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
            Exportar
          </Button>
          {puedeEditar && (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={abrirCrear}
              sx={{ ...gradientBtnSx, boxShadow: '0 4px 10px rgba(245,166,35,.25)' }}>
              Nuevo socio
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{activos.length}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Total socios</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c2410c' }}>{morosos}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Con cuotas vencidas</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#c0392b' }}>{totalVencidas}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>Cuotas vencidas totales</Typography>
        </CardContent></Card>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Buscar por nombre o RUT..." value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220, maxWidth: 360, bgcolor: 'background.paper', borderRadius: 2 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="#a89f8f" /></InputAdornment> } }}
        />
        {(totalInactivos > 0 || verInactivos) && (
          <Chip
            icon={<UserX size={13} />}
            label={`Ver inactivos (${totalInactivos})`}
            onClick={() => setVerInactivos(v => !v)}
            sx={{
              fontWeight: 600,
              bgcolor: verInactivos ? colors.ink : '#f1efe9',
              color: verInactivos ? '#fff' : 'text.secondary',
              '& .MuiChip-icon': { color: verInactivos ? '#fff' : '#6b6152' },
            }}
          />
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {filtered.length === 0 ? (
            <Box sx={{
              textAlign: 'center', color: 'text.secondary', py: 6,
              bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider',
            }}>
              No hay socios registrados.
            </Box>
          ) : (
            <>
              <Box sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '28px 2fr 1.3fr 1.6fr 110px 100px 170px 220px',
                gap: 1.5, px: 2.5, pb: 0.5,
              }}>
                {['', 'Socio', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas', ''].map((h, i) => (
                  <Typography key={i} sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                    {h}
                  </Typography>
                ))}
              </Box>

              {filtered.map(s => {
                const abierto = expandido === s.id_socio;
                return (
                  <Box key={s.id_socio}>
                    <Box
                      onClick={() => setExpandido(abierto ? null : s.id_socio)}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '28px 1fr 40px', md: '28px 2fr 1.3fr 1.6fr 110px 100px 170px 220px' },
                        alignItems: 'center', gap: 1.5,
                        bgcolor: 'background.paper',
                        border: '1px solid', borderColor: abierto ? colors.accent500 : 'divider',
                        borderRadius: abierto ? '16px 16px 0 0' : 4,
                        px: 2.5, py: 1.75, cursor: 'pointer',
                        boxShadow: abierto ? '0 4px 14px rgba(245,166,35,.12)' : '0 1px 2px rgba(20,17,11,.04)',
                        transition: 'box-shadow .15s ease, border-color .15s ease',
                        '&:hover': { boxShadow: '0 4px 14px rgba(20,17,11,.08)' },
                      }}
                    >
                      <Box sx={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: abierto ? colors.accent500 : '#f1efe9', color: abierto ? colors.ink : '#a89f8f',
                        transition: 'background-color .15s ease',
                      }}>
                        {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <InitialsAvatar nombre={s.nombre_completo} size={38} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{s.nombre_completo}</Typography>
                          <Typography sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: 11.5, color: 'text.secondary' }}>{s.rut}</Typography>
                        </Box>
                      </Box>

                      <Typography sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, fontSize: 13, color: 'text.secondary' }}>
                        {s.telefono ? (<><Phone size={12} color="#a89f8f" /> {s.telefono}</>) : '—'}
                      </Typography>

                      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                        {s.direccion ? (
                          <>
                            <MapPin size={12} color="#a89f8f" style={{ flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 13, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.direccion}
                            </Typography>
                          </>
                        ) : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>—</Typography>}
                      </Box>

                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Chip
                          label={s.estado_socio} size="small"
                          sx={{ bgcolor: ESTADO_STYLE[s.estado_socio]?.bg, color: ESTADO_STYLE[s.estado_socio]?.fg, fontWeight: 700, fontSize: 10.5 }}
                        />
                      </Box>

                      <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 12, color: '#a89f8f' }}>
                        {new Date(s.fecha_ingreso).toLocaleDateString('es-CL')}
                      </Typography>

                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        {(s.cuotas_vencidas ?? 0) > 0 ? (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label={`${s.cuotas_vencidas} Cuota${s.cuotas_vencidas === 1 ? '' : 's'} Pendiente${s.cuotas_vencidas === 1 ? '' : 's'}`}
                            size="small"
                            sx={{
                              bgcolor: '#fdece2', color: '#c2410c', fontWeight: 700, fontSize: 10.5,
                              '& .MuiChip-icon': { color: '#c2410c' },
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2f7d5b' }}>Al día</Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        {s.estado_socio === 'INACTIVO' ? (
                          puedeEditar && (
                            <Button
                              size="small" variant="outlined" color="success"
                              disabled={reactivando === s.id_socio}
                              onClick={e => { e.stopPropagation(); reactivar(s); }}
                              startIcon={<UserCheck size={13} />}
                              sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                            >
                              Reactivar
                            </Button>
                          )
                        ) : s.estado_socio === 'BLOQUEADO' ? (
                          <Button
                            size="small" variant="outlined" color="success"
                            disabled={desbloqueando === s.id_socio}
                            onClick={e => { e.stopPropagation(); handleDesbloquear(s); }}
                            startIcon={<Unlock size={13} />}
                            sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                          >
                            Desbloquear
                          </Button>
                        ) : (
                          <Button
                            size="small" variant="outlined" color="error"
                            disabled={bloqueando === s.id_socio}
                            onClick={e => { e.stopPropagation(); handleBloquear(s); }}
                            startIcon={<Lock size={13} />}
                            sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                          >
                            Bloquear
                          </Button>
                        )}
                        {puedeEditar && (
                          <IconButton
                            size="small" onClick={e => { e.stopPropagation(); abrirEditar(s); }}
                            sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                          >
                            <Pencil size={13} />
                          </IconButton>
                        )}
                        {puedeEditar && s.estado_socio !== 'INACTIVO' && (
                          <IconButton
                            size="small" title="Dar de baja"
                            onClick={e => { e.stopPropagation(); setErrorBaja(null); setSocioBaja(s); }}
                            sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: '#c0392b' }}
                          >
                            <UserX size={13} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    <Collapse in={abierto} timeout="auto" unmountOnExit>
                      <Box sx={{
                        border: '1px solid', borderTop: 'none', borderColor: colors.accent500,
                        borderRadius: '0 0 16px 16px', overflow: 'hidden',
                      }}>
                        <TarjetaVehiculo
                          socio={s}
                          movil={movilDe(s.id_socio)}
                          puedeEditar={puedeEditar}
                          onVehiculoCreado={nuevo => setMoviles(prev => [...prev, nuevo])}
                          onVehiculoActualizado={actualizado =>
                            setMoviles(prev => prev.map(m => (m.id_movil === actualizado.id_movil ? actualizado : m)))
                          }
                        />
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      )}

      <Dialog open={modal !== null} onClose={cerrarModal} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          {modal === 'editar' ? 'Editar socio' : 'Nuevo socio'}
          <IconButton size="small" onClick={cerrarModal}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
            {SOCIO_CAMPOS.map(({ label, key, placeholder }) => (
              <TextField
                key={key} fullWidth size="small" label={label} placeholder={placeholder}
                value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            ))}

            {modal === 'crear' && (
              <>
                <Divider sx={{ my: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Car size={13} /> VEHÍCULO (OPCIONAL)
                  </Typography>
                </Divider>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {VEHICULO_CAMPOS.map(({ label, key, placeholder, width }) => (
                    <TextField
                      key={key} size="small" label={label} placeholder={placeholder}
                      value={vehiculoForm[key]} onChange={e => setVehiculoForm(f => ({ ...f, [key]: e.target.value }))}
                      sx={{ width }}
                    />
                  ))}
                </Box>
              </>
            )}

            {formError && <Alert severity="error">{formError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={cerrarModal} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button fullWidth type="submit" variant="contained" disabled={saving} sx={gradientBtnSx}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmarBajaDialog
        open={!!socioBaja}
        titulo={socioBaja ? `¿Dar de baja a ${socioBaja.nombre_completo}?` : ''}
        detalles={[
          'Queda inactivo con fecha de egreso de hoy.',
          'Su cuenta de acceso y su móvil quedan inactivos, y sale de la fila virtual.',
          'No se borra nada: se conserva el historial de viajes, cuotas y pagos.',
          'Puedes reactivarlo cuando quieras.',
        ]}
        loading={bajando}
        error={errorBaja}
        onConfirmar={confirmarBaja}
        onClose={() => setSocioBaja(null)}
      />
    </Box>
  );
}
