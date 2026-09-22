import {
  LayoutDashboard, Users, PhoneCall, BarChart2, DollarSign, Truck, ListOrdered, UserCog, CalendarClock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Rol = 'Administrador' | 'Central' | 'Tesorero' | 'Secretario' | 'Conductor';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Rol[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Administrador', 'Tesorero', 'Secretario'],
  },
  {
    to: '/socios',
    label: 'Socios',
    icon: Users,
    roles: ['Administrador', 'Tesorero', 'Secretario'],
  },
  {
    to: '/solicitudes',
    label: 'Solicitudes',
    icon: PhoneCall,
    roles: ['Administrador', 'Central'],
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: BarChart2,
    roles: ['Administrador', 'Central', 'Tesorero'],
  },
  {
    to: '/tesoreria',
    label: 'Tesorería',
    icon: DollarSign,
    roles: ['Administrador', 'Tesorero'],
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: UserCog,
    roles: ['Administrador'],
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: CalendarClock,
    roles: ['Administrador', 'Secretario'],
  },
  {
    to: '/conductor',
    label: 'Mi Panel',
    icon: Truck,
    roles: ['Conductor'],
  },
  {
    to: '/fila-virtual',
    label: 'Fila Virtual',
    icon: ListOrdered,
    roles: ['Conductor'],
  },
];

// Primera ruta disponible según el rol (página de inicio tras login)
export const HOME_POR_ROL: Record<Rol, string> = {
  Administrador: '/dashboard',
  Central:       '/solicitudes',
  Tesorero:      '/socios',
  Secretario:    '/socios',
  Conductor:     '/conductor',
};

export function tieneAcceso(rol: Rol, ruta: string): boolean {
  const item = NAV_ITEMS.find(n => n.to === ruta);
  if (!item) return false;
  return item.roles.includes(rol);
}
