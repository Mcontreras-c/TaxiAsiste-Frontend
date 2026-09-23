import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, InputAdornment, Link } from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import logo from '../assets/logo.jpg';
import taxiHero from '../assets/taxiasiste.webp';
import { olvidePassword } from '../api/usuarios';

export default function OlvidePassword() {
  const [email, setEmail]     = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEnviando(true);
    try {
      await olvidePassword(email);
    } finally {
      // Se muestra el mismo mensaje genérico exista o no el correo, y aunque
      // falle la llamada — no debe revelar si el correo está registrado.
      setEnviando(false);
      setEnviado(true);
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box
        component="img" src={taxiHero} alt=""
        sx={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'linear-gradient(160deg, rgba(0,0,0,.55) 0%, rgba(0,20,40,.55) 55%, rgba(0,0,0,.65) 100%)',
      }} />

      <Box sx={{
        position: 'fixed', top: { xs: 20, sm: 28 }, right: { xs: 20, sm: 28 }, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 0.75, opacity: 0.85,
      }}>
        <Box component="img" src={logo} alt="TaxiAsiste" sx={{ height: 20, borderRadius: 0.5 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>TaxiAsiste</Typography>
      </Box>

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
            Recuperar contraseña
          </Typography>
        </Box>

        {enviado ? (
          <>
            <Alert severity="success">
              Si la casilla de correo existe, te llegará un correo con una clave temporal.
            </Alert>
            <Link component={RouterLink} to="/login" sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13.5,
              color: 'rgba(255,255,255,.85)', textDecoration: 'none',
            }}>
              <ArrowBackIcon fontSize="small" /> Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)' }}>
              Ingresa el correo con el que te registraron. Si existe una cuenta con ese correo,
              te enviaremos una clave temporal.
            </Typography>
            <TextField
              type="email" label="Correo" placeholder="tu@correo.cl" fullWidth required
              value={email} onChange={e => setEmail(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon fontSize="small" sx={{ color: 'rgba(255,255,255,.7)' }} />
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
            <Button type="submit" disabled={enviando} variant="contained" color="primary" fullWidth size="large" sx={{ py: 1.4, fontSize: 15.5 }}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </Button>
            <Link component={RouterLink} to="/login" sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13.5, justifyContent: 'center',
              color: 'rgba(255,255,255,.75)', textDecoration: 'none',
            }}>
              <ArrowBackIcon fontSize="small" /> Volver a iniciar sesión
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  );
}
