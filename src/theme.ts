import { createTheme } from '@mui/material/styles';

// Paleta ambar -> negro calido, alineada con brand/surface de tailwind.config.js
export const colors = {
  accent300: '#ffe08a',
  accent500: '#f5a623',
  accent600: '#e08e0a',
  accent700: '#b45309',
  ink: '#14110b',
  inkSoft: '#2a2115',
  paper: '#fbf9f4',
  sidebarGradient: 'linear-gradient(160deg, #f5a623 0%, #2a2115 46%, #14110b 100%)',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.accent500,
      light: colors.accent300,
      dark: colors.accent700,
      contrastText: '#1c1300',
    },
    background: {
      default: colors.paper,
      paper: '#ffffff',
    },
    text: {
      primary: '#1c1710',
      secondary: '#6b6152',
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
          border: '1px solid rgba(20,17,11,0.1)',
          boxShadow: '0 1px 3px rgba(20,17,11,.08)',
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
