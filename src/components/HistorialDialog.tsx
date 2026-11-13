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
  CREADO:                  { texto: 'Cuenta creada', bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  CONDUCTOR_CREADO:        { texto: 'Conductor creado', bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  EDITADO:                 { texto: 'Editado', bg: 'rgba(96,165,250,.14)', fg: '#60a5fa' },
  BAJA:                    { texto: 'Dado de baja', bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  REACTIVADO:              { texto: 'Reactivado', bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  BLOQUEADO:               { texto: 'Bloqueado', bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  DESBLOQUEADO:            { texto: 'Desbloqueado', bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  CLAVE_RESETEADA:         { texto: 'Clave reseteada', bg: 'rgba(251,146,60,.14)', fg: '#fb923c' },
  CREDENCIALES_REENVIADAS: { texto: 'Credenciales reenviadas', bg: 'rgba(255,222,0,.12)', fg: '#fcd34d' },
  CONFIRMACION_FALLIDA:    { texto: 'Clave incorrecta al confirmar', bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  CONFIRMACION_BLOQUEADA:  { texto: 'Confirmación bloqueada', bg: 'rgba(248,113,113,.14)', fg: '#f87171' },
  BLOQUEO_LEVANTADO:       { texto: 'Bloqueo de pasajero levantado', bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
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
                const est = EVENTOS[e.evento] ?? { texto: e.evento, bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.70)' };
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
