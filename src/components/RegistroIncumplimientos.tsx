import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Tabs, Tab, Table, TableHead, TableBody, TableRow,
  TableCell, Chip, Button, Alert, CircularProgress, Box, Typography,
} from '@mui/material';
import { ShieldAlert, X } from 'lucide-react';
import { getRegistroConductores, type IncumplimientoConductor } from '../api/reservas';
import { getPasajerosConIncumplimientos, levantarBloqueoPasajero } from '../api/solicitudes';
import { useAuthStore } from '../store/authStore';
import type { Pasajero } from '../types';

const celda = { fontSize: 13, py: 1 } as const;
const cabecera = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', py: 1 } as const;

/**
 * Registro de incumplimientos para Central: por conductor (no llego / soltó una
 * reserva con poca anticipacion) y por pasajero (no se presento). Solo registra:
 * no hay sanciones automaticas, salvo el bloqueo del pasajero a la 3.ª vez, que
 * solo un administrador levanta.
 */
export default function RegistroIncumplimientos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pestana, setPestana] = useState<'conductores' | 'pasajeros'>('conductores');
  const [conductores, setConductores] = useState<IncumplimientoConductor[]>([]);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esAdmin = useAuthStore(s => s.usuario?.rol) === 'Administrador';

  const cargar = () => {
    setCargando(true); setError(null);
    Promise.all([getRegistroConductores(), getPasajerosConIncumplimientos()])
      .then(([c, p]) => { setConductores(c); setPasajeros(p); })
      .catch(() => setError('No se pudo cargar el registro.'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { if (open) cargar(); }, [open]);

  const levantar = async (p: Pasajero) => {
    if (!window.confirm(`¿Levantar el bloqueo de ${p.nombre_completo}? Su contador de incumplimientos volverá a 0.`)) return;
    try {
      await levantarBloqueoPasajero(p.id_pasajero);
      cargar();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo levantar el bloqueo.');
    }
  };

  const vacio = (texto: string) => (
    <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>{texto}</Typography>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ShieldAlert size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Incumplimientos</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600 } }}>
          <Tab value="conductores" label={`Conductores (${conductores.length})`} />
          <Tab value="pasajeros" label={`Pasajeros (${pasajeros.length})`} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {cargando && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>}

        {!cargando && pestana === 'conductores' && (
          conductores.length === 0 ? vacio('Ningún conductor tiene incumplimientos registrados.') : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={cabecera}>Móvil</TableCell>
                  <TableCell sx={cabecera}>Conductor</TableCell>
                  <TableCell sx={cabecera} align="center">No llegó</TableCell>
                  <TableCell sx={cabecera} align="center">Soltó tarde</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conductores.map(c => (
                  <TableRow key={c.movil}>
                    <TableCell sx={{ ...celda, fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}>{c.patente}</TableCell>
                    <TableCell sx={celda}>{c.conductor}</TableCell>
                    <TableCell sx={celda} align="center">
                      <Chip size="small" label={c.no_llego} sx={{ fontWeight: 700, bgcolor: c.no_llego ? 'rgba(248,113,113,.14)' : 'rgba(255,255,255,.07)', color: c.no_llego ? '#f87171' : 'rgba(255,255,255,.55)' }} />
                    </TableCell>
                    <TableCell sx={celda} align="center">
                      <Chip size="small" label={c.soltadas_tarde} sx={{ fontWeight: 700, bgcolor: c.soltadas_tarde ? 'rgba(251,146,60,.14)' : 'rgba(255,255,255,.07)', color: c.soltadas_tarde ? '#fb923c' : 'rgba(255,255,255,.55)' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {!cargando && pestana === 'pasajeros' && (
          pasajeros.length === 0 ? vacio('Ningún pasajero tiene incumplimientos.') : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={cabecera}>Pasajero</TableCell>
                  <TableCell sx={cabecera} align="center">Faltas</TableCell>
                  <TableCell sx={cabecera}>Estado</TableCell>
                  {esAdmin && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {pasajeros.map(p => (
                  <TableRow key={p.id_pasajero}>
                    <TableCell sx={celda}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.nombre_completo}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{p.rut}{p.telefono ? ` · ${p.telefono}` : ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ ...celda, fontWeight: 700 }} align="center">{p.incumplimientos}</TableCell>
                    <TableCell sx={celda}>
                      {p.bloqueado_domicilio === 1
                        ? <Chip size="small" label="Bloqueado a domicilio" sx={{ fontWeight: 700, bgcolor: 'rgba(248,113,113,.14)', color: '#f87171' }} />
                        : <Chip size="small" label="Con advertencias" sx={{ fontWeight: 700, bgcolor: 'rgba(251,146,60,.14)', color: '#fb923c' }} />}
                    </TableCell>
                    {esAdmin && (
                      <TableCell sx={celda} align="right">
                        <Button size="small" onClick={() => levantar(p)} sx={{ fontSize: 12 }}>Levantar</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1.5 }}>
          Solo se registra: no hay sanciones automáticas. El pasajero queda bloqueado para pedir móviles a domicilio al
          tercer incumplimiento; en el hospital sí puede pedir uno.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
