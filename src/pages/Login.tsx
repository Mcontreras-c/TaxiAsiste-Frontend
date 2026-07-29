import { useEffect } from 'react';
import { HOME_POR_ROL, type Rol } from '../config/permisos';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Typography, TextField, Button, Alert, InputAdornment, Paper } from '@mui/material';
import { LogIn, User, Lock } from 'lucide-react';
import logo from '../assets/logo.jpg';
import taxiHero from '../assets/taxiasiste.webp';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, usuario } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isAuthenticated && usuario) {
      navigate(HOME_POR_ROL[usuario.rol as Rol] ?? '/solicitudes');
    }
  }, [isAuthenticated, usuario, navigate]);

  const onSubmit = async (data: FormData) => {
    await login(data.username, data.password);
  };

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Box
        component="img" src={taxiHero} alt=""
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(100deg, ${colors.ink}f2 0%, ${colors.inkSoft}cc 45%, ${colors.accent700}55 100%)`,
      }} />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(0deg, ${colors.ink}cc 0%, transparent 45%, ${colors.ink}66 100%)`,
      }} />
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, zIndex: 1,
        backgroundImage: `repeating-linear-gradient(90deg, ${colors.accent500} 0, ${colors.accent500} 28px, transparent 28px, transparent 52px)`,
        opacity: 0.7,
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box component="header" sx={{ px: { xs: 3, lg: 5 }, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 36, borderRadius: 1.5, boxShadow: 3 }} />
          <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>
            Sistema de gestión del sindicato
          </Typography>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1, maxWidth: 1280, mx: 'auto', width: '100%', px: { xs: 3, lg: 5 }, py: { xs: 4, lg: 6 },
            display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 6, lg: 8 }, alignItems: 'center',
          }}
        >
          <Box sx={{ order: { xs: 2, lg: 1 }, display: 'flex', justifyContent: { xs: 'center', lg: 'flex-start' } }}>
            <Paper elevation={0} sx={{
              width: '100%', maxWidth: 420, p: 4.5, borderRadius: 5,
              boxShadow: '0 20px 50px -12px rgba(0,0,0,.45)',
              border: '1px solid rgba(255,255,255,.08)',
            }}>
              <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 42, mb: 3 }} />
              <Typography variant="h1" sx={{ fontSize: 26, fontWeight: 700, color: '#2a2519' }}>Iniciar sesión</Typography>
              <Box sx={{
                width: 56, height: 5, borderRadius: 3, my: 1.5,
                background: `linear-gradient(90deg, ${colors.accent300}, ${colors.accent600})`,
              }} />
              <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 3 }}>
                Ingresa tus credenciales para continuar
              </Typography>

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                <TextField
                  {...register('username')}
                  label="Usuario" placeholder="admin" fullWidth
                  error={!!errors.username} helperText={errors.username?.message}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><User size={16} color="#a89f8f" /></InputAdornment> } }}
                />
                <TextField
                  {...register('password')}
                  label="Contraseña" placeholder="••••••••" type="password" fullWidth
                  error={!!errors.password} helperText={errors.password?.message}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock size={16} color="#a89f8f" /></InputAdornment> } }}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                  type="submit" disabled={isLoading} size="large" fullWidth
                  startIcon={<LogIn size={17} />}
                  sx={{
                    color: colors.ink, py: 1.25, fontSize: 15,
                    background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})`,
                    boxShadow: '0 8px 20px rgba(245,166,35,.35)',
                    '&:hover': { background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})` },
                  }}
                >
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </Box>

              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#a89f8f', mt: 3.5 }}>
                INACAP 2026 · TaxiAsiste v1.0
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ order: { xs: 1, lg: 2 }, color: '#fff', textAlign: { xs: 'center', lg: 'left' } }}>
            <Typography variant="h2" sx={{
              fontSize: { xs: 34, sm: 44 }, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.1, mb: 2.5,
              textShadow: '0 4px 20px rgba(0,0,0,.35)',
            }}>
              Tu sindicato de taxis,{' '}
              <Box component="span" sx={{
                background: `linear-gradient(90deg, ${colors.accent300}, ${colors.accent500})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                conectado
              </Box>
            </Typography>
            <Box sx={{ width: 64, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.3)', mx: { xs: 'auto', lg: 0 }, mb: 2.5 }} />
            <Typography sx={{ fontSize: 18, color: 'rgba(255,255,255,.85)', lineHeight: 1.6, maxWidth: 440, mx: { xs: 'auto', lg: 0 }, textShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
              Administra socios, móviles, solicitudes y tesorería desde un solo lugar, en tiempo real.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
