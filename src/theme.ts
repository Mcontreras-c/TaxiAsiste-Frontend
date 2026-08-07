import { createTheme } from '@mui/material/styles';

// Paleta corporativa TaxiAsiste — tomada del logo del sindicato (amarillo + azul)
export const colors = {
  // Marca (amarillo del logo)
  accent300: '#FFF176',
  accent500: '#FFDE00', // primary
  accent600: '#F2C400',
  accent700: '#C79A00',

  // Secundario (azul del logo)
  ink: '#0072BC', // secondary
  inkSoft: '#1E86D1',

  // Fondos
  paper: '#F8FAFC', // background.default
  surface: '#FFFFFF', // background.paper

  // Semanticos
  success: '#10B981',
  error: '#EF4444',
  info: '#3B82F6',
  warning: '#F59E0B',

  sidebarGradient: 'linear-gradient(160deg, #FFDE00 0%, #1E86D1 46%, #0072BC 100%)',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.accent500,
      light: colors.accent300,
      dark: colors.accent700,
      contrastText: colors.ink,
    },
    secondary: {
      main: colors.ink,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    success: { main: '#10B981' },
    error:   { main: '#EF4444' },
    info:    { main: '#3B82F6' },
    warning: { main: '#F59E0B' },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif",
    h1: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(30,41,59,0.08)',
          boxShadow: '0 1px 3px rgba(30,41,59,.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '.03em' },
      },
    },
  },
});
