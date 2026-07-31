import { createTheme } from '@mui/material/styles';

// Paleta corporativa TaxiAsiste
export const colors = {
  // Marca (ambar)
  accent300: '#FFD54D',
  accent500: '#FFB300', // primary
  accent600: '#E5A100',
  accent700: '#B37400',

  // Secundario / textos oscuros (slate)
  ink: '#1E293B', // secondary
  inkSoft: '#334155',

  // Fondos
  paper: '#F8FAFC', // background.default
  surface: '#FFFFFF', // background.paper

  // Semanticos
  success: '#10B981',
  error: '#EF4444',
  info: '#3B82F6',
  warning: '#F59E0B',

  sidebarGradient: 'linear-gradient(160deg, #FFB300 0%, #334155 46%, #1E293B 100%)',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: '#FFB300',
      light: colors.accent300,
      dark: colors.accent700,
      contrastText: '#1E293B',
    },
    secondary: {
      main: '#1E293B',
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
