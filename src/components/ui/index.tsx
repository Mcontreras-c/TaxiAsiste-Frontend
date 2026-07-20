import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface AlertProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function Alert({ message, onRetry, retryLabel = 'Reintentar' }: AlertProps) {
  return (
    <div className="card p-4 flex items-center gap-3 text-sm text-red-600 bg-red-50/80 border-red-100">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline hover:no-underline">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = 'bg-slate-100 text-slate-600' }: BadgeProps) {
  return <span className={`badge ${className}`}>{children}</span>;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  dark:      'btn-dark',
  ghost:     'inline-flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition',
};

const SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${VARIANT[variant]} ${SIZE[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: SearchInputProps) {
  return (
    <div className="relative">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field pl-10"
      />
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Cargando...', className = 'py-16' }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center text-slate-400 ${className}`}>
      <svg className="w-5 h-5 animate-spin mr-2.5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`card shadow-elevated w-full ${maxWidth} p-6 animate-in fade-in`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, count, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-100 rounded-xl">
          <Icon className="w-5 h-5 text-brand-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
            {count !== undefined && (
              <span className="badge bg-slate-100 text-slate-500">{count}</span>
            )}
          </div>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
  percent?: number;
  barColor?: string;
}

export function StatCard({ title, value, sub, icon, accent, iconBg, percent, barColor }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-medium truncate">{title}</p>
          <p className={`text-xl font-bold tracking-tight ${accent}`}>{value}</p>
        </div>
      </div>
      {percent !== undefined && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor ?? 'bg-slate-400'}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  colSpan?: number;
}

export function DataTable({ headers, children, emptyMessage, isEmpty, colSpan }: DataTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-surface-border">
              {headers.map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isEmpty ? (
              <tr>
                <td colSpan={colSpan ?? headers.length} className="text-center py-14 text-slate-400">
                  {emptyMessage ?? 'Sin registros.'}
                </td>
              </tr>
            ) : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-slate-50/70 transition-colors">{children}</tr>;
}

export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 ${className}`}>{children}</td>;
}
