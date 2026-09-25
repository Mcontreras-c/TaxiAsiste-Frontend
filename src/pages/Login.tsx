import { useEffect, useState } from 'react';
import { HOME_POR_ROL, type Rol } from '../config/permisos';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Typography, TextField, Button, Alert, InputAdornment, IconButton, Link } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
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
  const [verPassword, setVerPassword] = useState(false);

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
    <Box sx={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {/* Imagen de fondo a pantalla completa */}
      <Box
        component="img" src={taxiHero} alt=""
        sx={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'linear-gradient(160deg, rgba(0,0,0,.55) 0%, rgba(0,20,40,.55) 55%, rgba(0,0,0,.65) 100%)',
      }} />

      {/* Marca creadora — chica, esquina superior */}
      <Box sx={{
        position: 'fixed', top: { xs: 20, sm: 28 }, right: { xs: 20, sm: 28 }, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 0.75, opacity: 0.85,
      }}>
        <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 20, borderRadius: 0.5 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>TaxiAsiste</Typography>
      </Box>

      {/* Card con fondo difuso (glassmorphism) sobre la imagen */}
      <Box sx={{
        position: 'relative', zIndex: 2, width: '100%', maxWidth: 420,
        borderRadius: 5, p: { xs: 3.5, sm: 5 },
        backgroundColor: 'rgba(255,255,255,.14)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        border: '1px solid rgba(255,255,255,.25)',
        boxShadow: '0 20px 60px rgba(0,0,0,.35)',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <Box>
          <Typography sx={{
            fontSize: 12.5, fontWeight: 800, color: 'primary.main',
            textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.75,
          }}>
            Agrupación de Taxistas — Cerro Navia · Félix Bulnes
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
            Iniciar sesión
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            {...register('username')}
            label="Usuario" placeholder="admin" fullWidth
            error={!!errors.username} helperText={errors.username?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" sx={{ color: 'rgba(255,255,255,.7)' }} />
                  </InputAdornment>
                ),
                sx: { color: '#fff' },
              },
              inputLabel: { sx: { color: 'rgba(255,255,255,.75)' } },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.5)' },
            }}
          />
          <TextField
            {...register('password')}
            label="Contraseña" placeholder="••••••••" type={verPassword ? 'text' : 'password'} fullWidth
            error={!!errors.password} helperText={errors.password?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" sx={{ color: 'rgba(255,255,255,.7)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setVerPassword(v => !v)} edge="end" size="small"
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      sx={{ color: 'rgba(255,255,255,.75)' }}
                    >
                      {verPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { color: '#fff' },
              },
              inputLabel: { sx: { color: 'rgba(255,255,255,.75)' } },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.5)' },
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
          <Link component={RouterLink} to="/olvide-password" sx={{
            alignSelf: 'center', fontSize: 13, color: 'rgba(255,255,255,.75)', textDecoration: 'none',
          }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </Box>

        <Typography sx={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,.65)' }}>
          TaxiAsiste v1.0
        </Typography>
      </Box>
    </Box>
  );
}
