import { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, Alert, CircularProgress, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
} from '@mui/material';
import { CalendarClock, RefreshCw, Plus, X, Check, Pencil, Trash2, MapPin, Clock } from 'lucide-react';
import {
  getEventosAgenda, createEventoAgenda, updateEventoAgenda, deleteEventoAgenda,
  type EventoAgenda, type EventoAgendaInput,
} from '../api/agenda';
import { colors } from '../theme';

const FORM_VACIO: EventoAgendaInput = { titulo: '', descripcion: '', fecha_hora: '', lugar: '' };

function aDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AgendaPage() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [modal, setModal]         = useState<'crear' | 'editar' | null>(null);
  const [editando, setEditando]   = useState<EventoAgenda | null>(null);
  const [form, setForm]           = useState<EventoAgendaInput>(FORM_VACIO);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setEventos(await getEventosAgenda()); }
    catch { setError('No se pudieron cargar los eventos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const abrirCrear = () => { setForm(FORM_VACIO); setFormError(null); setModal('crear'); };
  const abrirEditar = (e: EventoAgenda) => {
    setEditando(e);
    setForm({ titulo: e.titulo, descripcion: e.descripcion ?? '', fecha_hora: aDatetimeLocal(e.fecha_hora), lugar: e.lugar ?? '' });
    setFormError(null);
    setModal('editar');
  };
  const cerrarModal = () => setModal(null);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.titulo || !form.fecha_hora) {
      setFormError('Título y fecha/hora son obligatorios.');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      const payload = { ...form, fecha_hora: new Date(form.fecha_hora).toISOString() };
      if (modal === 'editar' && editando) {
        await updateEventoAgenda(editando.id_evento_agenda, payload);
      } else {
        await createEventoAgenda(payload);
      }
      cerrarModal();
      await load();
    } catch {
      setFormError('Error al guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (e: EventoAgenda) => {
    if (!confirm(`¿Eliminar "${e.titulo}"?`)) return;
    setEliminando(e.id_evento_agenda);
    try {
      await deleteEventoAgenda(e.id_evento_agenda);
      await load();
    } catch {
      setError('No se pudo eliminar el evento.');
    } finally {
      setEliminando(null);
    }
  };

  const ahora = new Date();
  const proximos = eventos.filter(e => new Date(e.fecha_hora) >= ahora);
  const pasados = eventos.filter(e => new Date(e.fecha_hora) < ahora);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarClock size={22} color="#3a3327" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#2a2519' }}>Agenda</Typography>
          <Chip label={proximos.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={abrirCrear}
            sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}>
            Nueva reunión
          </Button>
          <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={load}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
          <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : eventos.length === 0 ? (
        <Box sx={{
          textAlign: 'center', color: 'text.secondary', py: 6,
          bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider',
        }}>
          Aún no hay reuniones ni fechas importantes agendadas.
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
            Próximas ({proximos.length})
          </Typography>
          {proximos.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: '#a89f8f' }}>Sin próximas reuniones.</Typography>
          ) : proximos.map(e => (
            <Card key={e.id_evento_agenda} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2.5, flexShrink: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', bgcolor: '#fdf1dc', color: colors.accent700,
                }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{new Date(e.fecha_hora).getDate()}</Typography>
                  <Typography sx={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                    {new Date(e.fecha_hora).toLocaleDateString('es-CL', { month: 'short' })}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{e.titulo}</Typography>
                  {e.descripcion && <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>{e.descripcion}</Typography>}
                  <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: '#a89f8f' }}>
                      <Clock size={13} />
                      {new Date(e.fecha_hora).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Box>
                    {e.lugar && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: '#a89f8f' }}>
                        <MapPin size={13} /> {e.lugar}
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => abrirEditar(e)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Pencil size={13} />
                  </IconButton>
                  <IconButton
                    size="small" onClick={() => handleEliminar(e)} disabled={eliminando === e.id_evento_agenda}
                    sx={{ border: '1px solid', borderColor: 'divider', color: '#c0392b' }}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}

          {pasados.length > 0 && (
            <>
              <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary', mt: 2 }}>
                Pasadas ({pasados.length})
              </Typography>
              {pasados.map(e => (
                <Card key={e.id_evento_agenda} sx={{ borderRadius: 3, opacity: 0.6 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{e.titulo}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#a89f8f' }}>
                      {new Date(e.fecha_hora).toLocaleDateString('es-CL', { dateStyle: 'medium' })}
                    </Typography>
                    <IconButton size="small" onClick={() => handleEliminar(e)} sx={{ color: '#c0392b' }}>
                      <Trash2 size={13} />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </Box>
      )}

      <Dialog open={modal !== null} onClose={cerrarModal} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {modal === 'editar' ? 'Editar reunión' : 'Nueva reunión'}
          <IconButton size="small" onClick={cerrarModal}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
            <TextField
              fullWidth size="small" label="Título *" value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            />
            <TextField
              fullWidth size="small" label="Fecha y hora *" type="datetime-local" value={form.fecha_hora}
              onChange={e => setForm(f => ({ ...f, fecha_hora: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth size="small" label="Lugar" value={form.lugar ?? ''}
              onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))}
            />
            <TextField
              fullWidth size="small" label="Descripción" multiline minRows={2} value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
            {formError && <Alert severity="error">{formError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={cerrarModal} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button
              fullWidth type="submit" variant="contained" disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Check size={15} />}
              sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
