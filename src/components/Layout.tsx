import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, AppBar, Toolbar, Divider, Breadcrumbs, Link as MLink, Chip,
} from '@mui/material';
import { LogOut, Menu, PanelLeftClose, ChevronRight, WifiOff, User, ListOrdered, Bell, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useConnectionStore } from '../store/connectionStore';
import { NAV_ITEMS, type Rol } from '../config/permisos';
import { colors } from '../theme';
import { getPerfilConductor } from '../api/conductor';
import CambiarPasswordDialog from './CambiarPasswordDialog';
import logo from '../assets/logo.jpg';

const ROL_LABEL: Record<Rol, string> = {
  Administrador: 'Administrador',
  Central:       'Central telefónica',
  Tesorero:      'Tesorero',
  Secretario:    'Secretario',
  Conductor:     'Conductor',
};

const DRAWER_OPEN = 240;
const DRAWER_CLOSED = 72;

export default function Layout() {
  const [open, setOpen] = useState(true);
  const [cambiarPassOpen, setCambiarPassOpen] = useState(false);
  const { usuario, logout } = useAuthStore();
  const conexionInestable = useConnectionStore((s) => s.estado === 'inestable');
  const navigate = useNavigate();
  const location = useLocation();

  const rol = usuario?.rol as Rol | undefined;
  const esConductor = rol === 'Conductor';
  const navFiltrado = NAV_ITEMS.filter(item => rol && item.roles.includes(rol) && item.to !== '/fila-virtual');
  const currentPage = NAV_ITEMS.find(item => item.to === location.pathname);

  // Nombre/RUT del conductor para la tarjeta de perfil del sidebar -- no viene
  // en el usuario del login, asi que se pide aparte solo para este rol.
  const [perfilConductor, setPerfilConductor] = useState<{ nombre: string; rut: string } | null>(null);
  useEffect(() => {
    if (!esConductor) return;
    getPerfilConductor()
      .then(p => setPerfilConductor({ nombre: `${p.socio.nombre} ${p.socio.apellido}`, rut: p.socio.rut }))
      .catch(() => {});
  }, [esConductor]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = usuario?.username
    ? usuario.username.slice(0, 2).toUpperCase()
    : '??';

  const drawerWidth = open ? DRAWER_OPEN : DRAWER_CLOSED;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'width .25s ease',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            overflowX: 'hidden',
            transition: 'width .25s ease',
            background: colors.sidebarGradient,
            color: '#fff',
            border: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2.5, borderBottom: '1px solid rgba(255,255,255,.14)' }}>
          {open ? (
            <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 34, objectFit: 'contain', flex: 1, minWidth: 0 }} />
          ) : (
            <Box sx={{
              width: 34, height: 34, mx: 'auto', borderRadius: 2,
              background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: colors.ink, fontWeight: 700, fontSize: 12 }}>TA</Typography>
            </Box>
          )}
          <IconButton
            onClick={() => setOpen(!open)}
            size="small"
            sx={{ color: 'rgba(255,255,255,.6)', '&:hover': { bgcolor: 'rgba(255,255,255,.1)', color: '#fff' } }}
          >
            {open ? <PanelLeftClose size={16} /> : <Menu size={16} />}
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List sx={{ py: 2, px: 1.25 }}>
            {open && (
              <Typography sx={{ px: 1.5, mb: 1, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>
                Menú
              </Typography>
            )}
            {navFiltrado.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <ListItemButton
                  key={to}
                  component={NavLink}
                  to={to}
                  title={!open ? label : undefined}
                  sx={{
                    borderRadius: 2.5,
                    mb: 0.5,
                    py: 1.1,
                    color: isActive ? '#fff' : 'rgba(255,255,255,.78)',
                    bgcolor: isActive ? 'rgba(255,255,255,.14)' : 'transparent',
                    position: 'relative',
                    '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                    '&::before': isActive ? {
                      content: '""', position: 'absolute', left: -10, top: 8, bottom: 8, width: 3,
                      borderRadius: '0 4px 4px 0',
                      background: `linear-gradient(180deg, ${colors.accent300}, ${colors.accent500})`,
                    } : undefined,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 1.5 : 'auto', color: 'inherit', justifyContent: 'center' }}>
                    <Icon size={19} />
                  </ListItemIcon>
                  {open && <ListItemText slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }}>{label}</ListItemText>}
                </ListItemButton>
              );
            })}
          </List>

          {esConductor && open && (
            <Box sx={{ px: 1.5, pb: 1 }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: 3,
                bgcolor: 'rgba(255,255,255,.1)',
              }}>
                <Box sx={{
                  width: 46, height: 46, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid rgba(255,255,255,.3)',
                }}>
                  {/* Placeholder -- reemplazar por la foto real del socio cuando este disponible. */}
                  <User size={22} color="#fff" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {perfilConductor?.nombre ?? usuario?.username}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                    {perfilConductor ? `RUT: ${perfilConductor.rut}` : ''}
                  </Typography>
                </Box>
              </Box>

              <ListItemButton
                component={NavLink}
                to="/fila-virtual"
                sx={{
                  mt: 1, borderRadius: 2.5, py: 1.1,
                  color: location.pathname === '/fila-virtual' ? '#fff' : 'rgba(255,255,255,.78)',
                  bgcolor: location.pathname === '/fila-virtual' ? 'rgba(255,255,255,.14)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}><ListOrdered size={18} /></ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 600 } } }}>Fila Virtual</ListItemText>
                <ChevronRight size={15} />
              </ListItemButton>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,.14)' }} />
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{
            width: 34, height: 34, fontSize: 13, fontWeight: 700, color: colors.ink,
            background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`,
          }}>
            {initials}
          </Avatar>
          {open && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.username}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
                {rol ? ROL_LABEL[rol] : ''}
              </Typography>
            </Box>
          )}
          <IconButton onClick={() => setCambiarPassOpen(true)} size="small" title="Cambiar contraseña" sx={{ color: 'rgba(255,255,255,.55)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,.1)' } }}>
            <KeyRound size={16} />
          </IconButton>
          <IconButton onClick={handleLogout} size="small" sx={{ color: 'rgba(255,255,255,.55)', '&:hover': { color: '#ff8a8a', bgcolor: 'rgba(255,255,255,.1)' } }}>
            <LogOut size={16} />
          </IconButton>
        </Box>
      </Drawer>

      <CambiarPasswordDialog open={cambiarPassOpen} onClose={() => setCambiarPassOpen(false)} />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255,255,255,.85)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar variant="dense" sx={{ minHeight: 56 }}>
            <Breadcrumbs separator={<ChevronRight size={14} color="#c4bda9" />}>
              <MLink underline="none" sx={{ fontSize: 14, color: 'text.secondary' }}>TaxiAsiste</MLink>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{currentPage?.label ?? 'Inicio'}</Typography>
            </Breadcrumbs>
            {conexionInestable && (
              <Chip
                icon={<WifiOff size={14} />}
                label="Conexión inestable"
                size="small"
                title="Las actualizaciones automáticas (solicitudes, móviles, mapa) están fallando repetidamente."
                sx={{
                  ml: 'auto', fontWeight: 700, fontSize: 11.5,
                  bgcolor: '#fdece2', color: '#c2410c',
                  '& .MuiChip-icon': { color: '#c2410c' },
                }}
              />
            )}
            {esConductor && (
              <IconButton size="small" sx={{ ml: conexionInestable ? 1 : 'auto', color: 'text.secondary' }} title="Notificaciones">
                <Bell size={17} />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflowY: 'auto', p: location.pathname === '/solicitudes' ? 0 : { xs: 3, lg: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
