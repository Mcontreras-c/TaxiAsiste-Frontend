// ── Auth ──────────────────────────────────────────────────────────────────────
export interface UsuarioAuth {
  id_usuario: number;
  username: string;
  email: string;
  rol: 'Administrador' | 'Central' | 'Tesorero' | 'Conductor';
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: UsuarioAuth;
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion: string;
  activo: number;
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
export interface Usuario {
  id_usuario: number;
  rol: Rol;
  username: string;
  email: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

// ── Socios ────────────────────────────────────────────────────────────────────
export interface Socio {
  id_socio: number;
  usuario: number | null;
  rut: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  telefono: string | null;
  direccion: string | null;
  estado_socio: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_ingreso: string;
  fecha_egreso: string | null;
  cuotas_vencidas: number;
}

// ── Cuotas ────────────────────────────────────────────────────────────────────
export interface Cuota {
  id_cuota: number;
  socio: number;
  periodo: string;
  monto: number;
  estado_pago: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'EXENTO';
  fecha_vencimiento: string;
  fecha_pago: string | null;
  observacion: string | null;
}

// ── Bloqueos ──────────────────────────────────────────────────────────────────
export interface Bloqueo {
  id_bloqueo: number;
  socio: number;
  usuario_registra: number | null;
  motivo: string;
  tipo_bloqueo: 'CUOTA_VENCIDA' | 'DISCIPLINARIO' | 'MANUAL' | 'OTRO';
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: number;
}

// ── Móviles ───────────────────────────────────────────────────────────────────
export interface Movil {
  id_movil: number;
  socio: number;
  socio_nombre: string;
  socio_telefono: string | null;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  estado_operativo: 'DISPONIBLE' | 'EN_SERVICIO' | 'BLOQUEADO' | 'INACTIVO';
  fecha_registro: string;
  // Pendiente de implementar en el backend (tracking GPS en tiempo real).
  lat?: number | null;
  lng?: number | null;
}

// ── Fila Base ─────────────────────────────────────────────────────────────────
export interface FilaBase {
  id_fila: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  posicion: number;
  fecha_ingreso: string;
  fecha_llamado: string | null;
  fecha_salida: string | null;
  estado: 'EN_ESPERA' | 'LLAMADO' | 'RETIRADO';
}

// ── Pasajeros ─────────────────────────────────────────────────────────────────
export interface Pasajero {
  id_pasajero: number;
  rut: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  telefono: string | null;
  direccion_frecuente: string | null;
  fecha_registro: string;
  activo: number;
}

// ── Solicitudes ───────────────────────────────────────────────────────────────
export type EstadoSolicitud = 'PENDIENTE' | 'ASIGNADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
export type CanalEntrada = 'TELEFONO' | 'APP' | 'PRESENCIAL';

export interface Solicitud {
  id_solicitud: number;
  folio: string;
  pasajero: number | null;
  pasajero_nombre: string | null;
  movil: number | null;
  movil_patente: string | null;
  usuario_central: number | null;
  origen: string;
  destino: string;
  fecha_hora: string;
  estado: EstadoSolicitud;
  canal_entrada: CanalEntrada;
  observaciones: string | null;
  fecha_asignacion: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
}

// ── Tesorería ─────────────────────────────────────────────────────────────────
export interface TesoreriaMovimiento {
  id_movimiento: number;
  usuario_registra: number | null;
  usuario_nombre: string | null;
  cuota: number | null;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: 'CUOTA' | 'MULTA' | 'GASTO_OPERACIONAL' | 'OTRO';
  descripcion: string;
  monto: number;
  fecha: string;
}

// ── Resumen Tesorero ──────────────────────────────────────────────────────────
export interface DetalleMovilCuota {
  id_movil: number;
  patente: string;
  estado_movil: string;
  id_socio: number;
  rut: string;
  socio: string;
  estado_socio: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  id_cuota: number | null;
  monto: number;
  estado_pago: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'EXENTO' | 'SIN_CUOTA';
  fecha_pago: string | null;
  cuotas_vencidas: number;
  monto_adeudado: number;
}

export interface ResumenTesorero {
  periodo: string;
  total_moviles: number;
  pagados: number;
  pendientes: number;
  cobrado: number;
  porcentaje: number;
  detalle: DetalleMovilCuota[];
}

// ── Reportes ──────────────────────────────────────────────────────────────────
export interface Dashboard {
  socios: { activos: number; bloqueados: number };
  moviles: { disponibles: number; en_servicio: number };
  solicitudes: { hoy: number; pendientes: number; en_curso: number; completadas_hoy: number };
  cuotas: { pendientes: number; vencidas: number };
  fecha: string;
}

export interface SolicitudPorEstado {
  estado: EstadoSolicitud;
  total: number;
}
