import apiClient from './client';
import type { Cuota } from '../types';

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

export interface Balance {
  ingresos: number;
  egresos: number;
  balance: number;
  fecha: string;
}

export const getMovimientos = () =>
  apiClient.get<TesoreriaMovimiento[]>('/tesoreria/').then(r => r.data);

export const getBalance = () =>
  apiClient.get<Balance>('/tesoreria/balance/').then(r => r.data);

export const createMovimiento = (data: Partial<TesoreriaMovimiento>) =>
  apiClient.post<TesoreriaMovimiento>('/tesoreria/', data).then(r => r.data);

export const registrarPagoCuota = (id_cuota: number, observacion?: string) =>
  apiClient.post('/tesoreria/registrar_pago_cuota/', { id_cuota, observacion }).then(r => r.data);

export const pagarMovil = (id_socio: number, monto: number, periodo: string) =>
  apiClient.post('/tesoreria/pagar_movil/', { id_socio, monto, periodo }).then(r => r.data);

export const pagarAtrasos = (id_socio: number) =>
  apiClient.post<{ message: string; cuotas_pagadas: number; total_pagado: number; estado_socio: string }>(
    '/tesoreria/pagar_atrasos/', { id_socio }
  ).then(r => r.data);

export const getCuotas = () =>
  apiClient.get<Cuota[]>('/cuotas/').then(r => r.data);

export interface ResumenMensual {
  mes: string;
  caja_anterior: number;
  ingresos_mes: number;
  egresos_mes: number;
  total_caja: number;
}

export const getResumenMensual = (mes?: string) =>
  apiClient.get<ResumenMensual>('/tesoreria/resumen_mensual/', { params: mes ? { mes } : {} }).then(r => r.data);
