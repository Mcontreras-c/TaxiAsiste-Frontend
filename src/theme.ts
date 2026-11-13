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

  // Escena oscura de la interfaz de vidrio
  fondo: '#0b1220',
  fondoClaro: '#0f1a2e',
  vidrio: 'rgba(255,255,255,0.06)',
  vidrioFuerte: 'rgba(255,255,255,0.10)',
  bordeVidrio: 'rgba(255,255,255,0.12)',
  textoSuave: 'rgba(255,255,255,0.62)',
  textoTenue: 'rgba(255,255,255,0.42)',

  // Fondos de compatibilidad (algunas pantallas aun los importan)
  paper: '#0b1220',
  surface: '#111c30',

  // Semanticos (versiones claras para fondo oscuro)
  success: '#34d399',
  error: '#f87171',
  info: '#60a5fa',
  warning: '#fbbf24',

  sidebarGradient: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
};

const VIDRIO_PANEL = {
  background: 'linear-gradient(150deg, rgba(255,255,255,0.085), rgba(255,255,255,0.03))',
  border: `1px solid ${colors.bordeVidrio}`,
  boxShadow: '0 10px 34px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.09)',
  backdropFilter: 'blur(18px) saturate(140%)',
  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.accent500,
      light: colors.accent300,
      dark: colors.accent700,
      contrastText: '#0b1220',
    },
    secondary: {
      main: colors.inkSoft,
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.fondo,
      paper: '#111c30',
    },
    success: { main: colors.success },
    error:   { main: colors.error },
    info:    { main: colors.info },
    warning: { main: colors.warning },
    text: {
      primary: '#ffffff',
      secondary: colors.textoSuave,
      disabled: colors.textoTenue,
    },
    divider: 'rgba(255,255,255,0.10)',
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif",
    h1: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { colorScheme: 'dark' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 12 },
        contained: { boxShadow: 'none' },
        outlined: { borderColor: 'rgba(255,255,255,0.22)', color: '#fff', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' } },
        text: { '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' } },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: false } },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: { root: { ...VIDRIO_PANEL, borderRadius: 22 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...VIDRIO_PANEL,
          background: 'linear-gradient(150deg, rgba(30,44,70,0.96), rgba(15,26,46,0.96))',
          borderRadius: 22,
        },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { ...VIDRIO_PANEL, background: 'rgba(17,28,48,0.96)', borderRadius: 14 } },
    },
    MuiPopover: {
      styleOverrides: { paper: { ...VIDRIO_PANEL, background: 'rgba(17,28,48,0.96)', borderRadius: 14 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { background: 'rgba(15,26,46,0.96)', border: `1px solid ${colors.bordeVidrio}`, fontSize: 12 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.14)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.28)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.accent500 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: colors.textoSuave, '&.Mui-focused': { color: colors.accent500 } } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
        head: { color: colors.textoSuave, fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.04)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '.03em' },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: colors.accent500, height: 3, borderRadius: 3 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 14, backdropFilter: 'blur(10px)' } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.10)' } },
    },
    MuiListItemButton: {
      styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' } } },
    },
  },
});
