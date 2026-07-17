import {
  LayoutDashboard, Users, Car, PhoneCall, BarChart2, DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Rol = 'Administrador' | 'Central' | 'Tesorero' | 'Conductor';

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
    roles: ['Administrador'],
  },
  {
    to: '/socios',
    label: 'Socios',
    icon: Users,
    roles: ['Administrador', 'Tesorero'],
  },
  {
    to: '/moviles',
    label: 'Móviles',
    icon: Car,
    roles: ['Administrador', 'Central', 'Conductor'],
  },
  {
    to: '/solicitudes',
    label: 'Solicitudes',
    icon: PhoneCall,
    roles: ['Administrador', 'Central', 'Conductor'],
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
];

// Primera ruta disponible según el rol (página de inicio tras login)
export const HOME_POR_ROL: Record<Rol, string> = {
  Administrador: '/dashboard',
  Central:       '/solicitudes',
  Tesorero:      '/socios',
  Conductor:     '/solicitudes',
};

export function tieneAcceso(rol: Rol, ruta: string): boolean {
  const item = NAV_ITEMS.find(n => n.to === ruta);
  if (!item) return false;
  return item.roles.includes(rol);
}
