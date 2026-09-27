import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Alert, CircularProgress, Box, Typography,
} from '@mui/material';
import { History, X } from 'lucide-react';
import { getHistorial, getHistorialPersona, type EventoHistorial } from '../api/usuarios';
import { formatoFechaHora } from '../utils/formatoFecha';

const celda = { fontSize: 12.5, py: 1, verticalAlign: 'top' } as const;
const cabecera = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', py: 1 } as const;

const EVENTOS: Record<string, { texto: string; bg: string; fg: string }> = {
  CREADO:                  { texto: 'Cuenta creada', bg: '#e4f3ec', fg: '#2f7d5b' },
  CONDUCTOR_CREADO:        { texto: 'Conductor creado', bg: '#e4f3ec', fg: '#2f7d5b' },
  EDITADO:                 { texto: 'Editado', bg: '#e8ecf9', fg: '#3355a8' },
  BAJA:                    { texto: 'Dado de baja', bg: '#fbe9e9', fg: '#c0392b' },
  REACTIVADO:              { texto: 'Reactivado', bg: '#e4f3ec', fg: '#2f7d5b' },
  BLOQUEADO:               { texto: 'Bloqueado', bg: '#fbe9e9', fg: '#c0392b' },
  DESBLOQUEADO:            { texto: 'Desbloqueado', bg: '#e4f3ec', fg: '#2f7d5b' },
  CLAVE_RESETEADA:         { texto: 'Clave reseteada', bg: '#fdece2', fg: '#c2410c' },
  CREDENCIALES_REENVIADAS: { texto: 'Credenciales reenviadas', bg: '#fdf1dc', fg: '#a56a00' },
  CONFIRMACION_FALLIDA:    { texto: 'Clave incorrecta al confirmar', bg: '#fbe9e9', fg: '#c0392b' },
  CONFIRMACION_BLOQUEADA:  { texto: 'Confirmación bloqueada', bg: '#fbe9e9', fg: '#c0392b' },
  BLOQUEO_LEVANTADO:       { texto: 'Bloqueo de pasajero levantado', bg: '#e4f3ec', fg: '#2f7d5b' },
};

const ENTIDAD: Record<string, string> = { USUARIO: 'Cuenta', SOCIO: 'Socio', MOVIL: 'Vehículo', PASAJERO: 'Pasajero' };

/**
 * Quien hizo que: acciones de administracion registradas por el servidor (altas, ediciones,
 * bajas, bloqueos, claves). Con `usuarioId` muestra solo lo de esa persona (cuenta, ficha de
 * socio y vehiculos); sin el, lo mas reciente de todo el sistema. Solo Administrador.
 */
export default function HistorialDialog({ open, onClose, usuarioId, titulo }: {
  open: boolean; onClose: () => void; usuarioId?: number; titulo?: string;
}) {
  const [eventos, setEventos] = useState<EventoHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCargando(true); setError(null);
    (usuarioId ? getHistorialPersona(usuarioId) : getHistorial())
      .then(setEventos)
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setCargando(false));
  }, [open, usuarioId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <History size={20} />
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{titulo ?? 'Registro de actividad'}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {cargando && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>}
        {!cargando && !error && eventos.length === 0 && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>
            Todavía no hay actividad registrada.
          </Typography>
        )}
        {!cargando && eventos.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cabecera}>Cuándo</TableCell>
                <TableCell sx={cabecera}>Quién</TableCell>
                <TableCell sx={cabecera}>Qué</TableCell>
                <TableCell sx={cabecera}>Detalle</TableCell>
                <TableCell sx={cabecera}>Desde</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.map(e => {
                const est = EVENTOS[e.evento] ?? { texto: e.evento, bg: '#f1efe9', fg: '#6b6152' };
                return (
                  <TableRow key={e.id_evento}>
                    <TableCell sx={{ ...celda, whiteSpace: 'nowrap' }}>{formatoFechaHora(e.fecha_hora)}</TableCell>
                    <TableCell sx={celda}>{e.usuario_nombre ?? '—'}</TableCell>
                    <TableCell sx={celda}>
                      <Chip size="small" label={est.texto} sx={{ fontWeight: 700, fontSize: 11, bgcolor: est.bg, color: est.fg }} />
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{ENTIDAD[e.entidad_tipo] ?? e.entidad_tipo}</Typography>
                    </TableCell>
                    <TableCell sx={{ ...celda, maxWidth: 280, wordBreak: 'break-word' }}>{e.detalle ?? '—'}</TableCell>
                    <TableCell sx={{ ...celda, fontFamily: 'Roboto Mono, monospace', fontSize: 11.5 }}>{e.ip_origen ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
