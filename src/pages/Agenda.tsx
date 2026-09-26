import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, Alert, CircularProgress, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
} from '@mui/material';
import {
  CalendarClock, RefreshCw, Plus, X, Check, Pencil, Trash2, MapPin, Clock,
  FileText, Upload, Download, File,
} from 'lucide-react';
import {
  getEventosAgenda, createEventoAgenda, updateEventoAgenda, deleteEventoAgenda,
  getDocumentosAgenda, subirDocumentoAgenda, deleteDocumentoAgenda,
  type EventoAgenda, type EventoAgendaInput, type DocumentoAgenda,
} from '../api/agenda';
import { colors } from '../theme';

import { formatoFechaHora } from '../utils/formatoFecha';
const FORM_VACIO: EventoAgendaInput = { titulo: '', descripcion: '', fecha_hora: '', lugar: '' };

function formatoTamano(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const [documentos, setDocumentos]   = useState<DocumentoAgenda[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [subirOpen, setSubirOpen]     = useState(false);
  const [nombreDoc, setNombreDoc]     = useState('');
  const [categoriaDoc, setCategoriaDoc] = useState('');
  const [archivo, setArchivo]         = useState<File | null>(null);
  const [subiendo, setSubiendo]       = useState(false);
  const [errorDoc, setErrorDoc]       = useState<string | null>(null);
  const [eliminandoDoc, setEliminandoDoc] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setEventos(await getEventosAgenda()); }
    catch { setError('No se pudieron cargar los eventos.'); }
    finally { setLoading(false); }
  };

  const loadDocumentos = async () => {
    setLoadingDocs(true);
    try { setDocumentos(await getDocumentosAgenda()); }
    catch { setErrorDoc('No se pudieron cargar los documentos.'); }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => { load(); loadDocumentos(); }, []);

  const abrirSubir = () => {
    setNombreDoc(''); setCategoriaDoc(''); setArchivo(null); setErrorDoc(null);
    setSubirOpen(true);
  };
  const cerrarSubir = () => setSubirOpen(false);

  const handleSubir = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nombreDoc || !archivo) {
      setErrorDoc('Ponle un nombre y elige un archivo.');
      return;
    }
    setSubiendo(true); setErrorDoc(null);
    try {
      await subirDocumentoAgenda(nombreDoc, archivo, categoriaDoc || undefined);
      cerrarSubir();
      await loadDocumentos();
    } catch {
      setErrorDoc('No se pudo subir el documento.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminarDoc = async (d: DocumentoAgenda) => {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    setEliminandoDoc(d.id_documento);
    try {
      await deleteDocumentoAgenda(d.id_documento);
      await loadDocumentos();
    } catch {
      setErrorDoc('No se pudo eliminar el documento.');
    } finally {
      setEliminandoDoc(null);
    }
  };

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
                      {formatoFechaHora(e.fecha_hora, 'medium')}
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileText size={20} color="#3a3327" />
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#2a2519' }}>Documentos</Typography>
          <Chip label={documentos.length} size="small" sx={{ bgcolor: '#f1efe9', color: '#6b6152', fontWeight: 700 }} />
        </Box>
        <Button variant="outlined" size="small" startIcon={<Upload size={14} />} onClick={abrirSubir}
          sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
          Subir documento
        </Button>
      </Box>

      {errorDoc && <Alert severity="error" onClose={() => setErrorDoc(null)}>{errorDoc}</Alert>}

      {loadingDocs ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
          <CircularProgress size={20} sx={{ mr: 1.5 }} /> Cargando...
        </Box>
      ) : documentos.length === 0 ? (
        <Box sx={{
          textAlign: 'center', color: 'text.secondary', py: 5,
          bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider',
        }}>
          Aún no hay documentos digitalizados. Sube actas, estatutos u otros archivos importantes.
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {documentos.map(d => (
              <Box
                key={d.id_documento}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                  borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                }}
              >
                <Box sx={{
                  width: 38, height: 38, borderRadius: 2.5, flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', bgcolor: '#e8ecf9', color: '#3355a8',
                }}>
                  <File size={18} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.nombre}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                    {d.categoria && <Chip label={d.categoria} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#f1efe9', color: '#6b6152' }} />}
                    <Typography sx={{ fontSize: 11.5, color: '#a89f8f' }}>
                      {formatoTamano(d.tamano_bytes)} · Subido por {d.usuario_subio_nombre ?? '—'} ·{' '}
                      {new Date(d.fecha_subida).toLocaleDateString('es-CL', { dateStyle: 'medium' })}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <IconButton size="small" component="a" href={d.archivo} target="_blank" rel="noopener noreferrer"
                    sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Download size={13} />
                  </IconButton>
                  <IconButton
                    size="small" onClick={() => handleEliminarDoc(d)} disabled={eliminandoDoc === d.id_documento}
                    sx={{ border: '1px solid', borderColor: 'divider', color: '#c0392b' }}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Dialog open={subirOpen} onClose={cerrarSubir} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Subir documento
          <IconButton size="small" onClick={cerrarSubir}><X size={18} /></IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubir}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
            <TextField
              fullWidth size="small" label="Nombre del documento *" value={nombreDoc}
              placeholder="Ej: Acta reunión directiva 25-09-2026"
              onChange={e => setNombreDoc(e.target.value)}
              helperText="El nombre con el que aparecerá en la lista — no tiene que ser el nombre del archivo."
            />
            <TextField
              fullWidth size="small" label="Categoría (opcional)" value={categoriaDoc}
              placeholder="Ej: Acta, Estatuto, Circular..."
              onChange={e => setCategoriaDoc(e.target.value)}
            />
            <Button
              variant="outlined" component="label"
              startIcon={<Upload size={15} />}
              sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)', justifyContent: 'flex-start' }}
            >
              {archivo ? archivo.name : 'Elegir archivo...'}
              <input
                ref={fileInputRef} hidden type="file"
                onChange={e => setArchivo(e.target.files?.[0] ?? null)}
              />
            </Button>
            {errorDoc && <Alert severity="error">{errorDoc}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={cerrarSubir} sx={{ color: 'text.secondary', borderColor: 'rgba(20,17,11,.18)' }}>
              Cancelar
            </Button>
            <Button
              fullWidth type="submit" variant="contained" disabled={subiendo}
              startIcon={subiendo ? <CircularProgress size={14} color="inherit" /> : <Upload size={15} />}
              sx={{ color: colors.ink, bgcolor: colors.accent500, '&:hover': { bgcolor: colors.accent600 } }}
            >
              {subiendo ? 'Subiendo...' : 'Subir'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

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
