import axios from 'axios';

/**
 * Confirmacion con contraseña para acciones sensibles (editar, dar de baja, bloquear...).
 * El servidor rechaza esas acciones con 403 si no llega un permiso reciente en el
 * header X-Confirmacion; el interceptor de client.ts pide la clave (dialogo global),
 * obtiene el permiso y repite la accion solo. El permiso vive solo en memoria.
 */
export const MENSAJE_CONFIRMACION = 'Confirma tu contraseña';

type Solicitante = (error?: string) => Promise<string | null>;

let solicitante: Solicitante | null = null;
let permiso: { token: string; vence: number } | null = null;
let enCurso: Promise<string | null> | null = null;

/** Lo registra el dialogo montado en Layout: devuelve la clave escrita, o null si cancelo. */
export const registrarSolicitante = (fn: Solicitante | null) => { solicitante = fn; };

export const permisoVigente = () => (permiso && permiso.vence > Date.now() ? permiso.token : null);
export const olvidarPermiso = () => { permiso = null; };

const baseURL = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/** Pide la clave y canjea el permiso. Devuelve el token, o null si la persona cancelo. */
export async function obtenerPermiso(): Promise<string | null> {
  const vigente = permisoVigente();
  if (vigente) return vigente;
  // Varias acciones a la vez comparten un solo dialogo.
  enCurso ??= (async () => {
    if (!solicitante) return null;
    let mensajeError: string | undefined;
    for (;;) {
      const clave = await solicitante(mensajeError);
      if (clave === null) return null;
      try {
        // axios "crudo": pasar por apiClient reentraria en su propio interceptor.
        const { data } = await axios.post(
          `${baseURL()}/usuarios/confirmar_identidad/`, { password: clave },
          { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } },
        );
        permiso = { token: data.token, vence: Date.now() + (data.expira_en - 5) * 1000 };
        return data.token as string;
      } catch (e: unknown) {
        mensajeError = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? 'No se pudo verificar la contraseña.';
      }
    }
  })().finally(() => { enCurso = null; });
  return enCurso;
}
