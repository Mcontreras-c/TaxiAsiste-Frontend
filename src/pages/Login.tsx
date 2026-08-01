import { useEffect } from 'react';
import { HOME_POR_ROL, type Rol } from '../config/permisos';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Container, Grid, Typography, TextField, Button, Alert, InputAdornment } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login';
import logo from '../assets/logo.jpg';
import taxiHero from '../assets/taxiasiste.webp';
import { useAuthStore } from '../store/authStore';

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
    <Grid container sx={{ minHeight: '100vh' }}>
      {/* Lado imagen — puramente visual */}
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          minHeight: { xs: 260, md: '100vh' },
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Box
          component="img" src={taxiHero} alt=""
          sx={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover', display: 'block' }}
        />
      </Grid>

      {/* Lado formulario */}
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#ffffff',
          backgroundImage:
            'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          minHeight: { xs: '100vh', md: 'auto' },
        }}
      >
        <Container maxWidth="sm" sx={{ py: { xs: 6, md: 0 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: { xs: 0, sm: 6 } }}>
            <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 44 }} />

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main', mb: 1.5 }}>
                Iniciar sesión
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Tu sindicato de taxis, conectado. Administra socios, móviles, solicitudes
                y tesorería desde un solo lugar, en tiempo real.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                {...register('username')}
                label="Usuario" placeholder="admin" fullWidth
                error={!!errors.username} helperText={errors.username?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                {...register('password')}
                label="Contraseña" placeholder="••••••••" type="password" fullWidth
                error={!!errors.password} helperText={errors.password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit" disabled={isLoading}
                variant="contained" color="primary" fullWidth size="large"
                startIcon={<LoginIcon />}
                sx={{ py: 1.4, fontSize: 15.5 }}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </Box>

            <Typography sx={{ textAlign: 'center', fontSize: 12, color: 'text.secondary' }}>
              INACAP 2026 · TaxiAsiste v1.0
            </Typography>
          </Box>
        </Container>
      </Grid>
    </Grid>
  );
}
