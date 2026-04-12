import React from 'react';
import { Box, Container, Typography, Grid, Stack, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';
import { LOGO_PRIMARY, LOGO_ALT_MARKS } from './landingAssets';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const LandingFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        bgcolor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: `blur(${GLASS.surface.blur})`,
        borderTop: '1px solid rgba(247, 66, 17, 0.15)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              src={LOGO_PRIMARY}
              alt="INSYT"
              sx={{ height: 48, width: 'auto', mb: 2, display: 'block' }}
            />
            <Typography variant="body2" sx={{ color: INSYT_COLORS.gray400, lineHeight: 1.75, mb: 2 }}>
              Plataforma de operação para Instagram: agendamento automático, aprovação em fluxo e dashboard compartilhável com clientes.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ opacity: 0.85 }}>
              {LOGO_ALT_MARKS.map((src) => (
                <Box
                  key={src}
                  component="img"
                  src={src}
                  alt=""
                  sx={{ height: 28, width: 'auto', opacity: 0.65 }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={4}>
              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}>
                  Produto
                </Typography>
                <Stack spacing={1}>
                  <Typography
                    variant="body2"
                    component="button"
                    type="button"
                    onClick={() => scrollToId('features')}
                    sx={{
                      color: INSYT_COLORS.gray400,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textAlign: 'left',
                      font: 'inherit',
                      '&:hover': { color: INSYT_COLORS.primaryLight },
                    }}
                  >
                    Recursos
                  </Typography>
                  <Typography
                    variant="body2"
                    component="button"
                    type="button"
                    onClick={() => scrollToId('precos')}
                    sx={{
                      color: INSYT_COLORS.gray400,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textAlign: 'left',
                      font: 'inherit',
                      '&:hover': { color: INSYT_COLORS.primaryLight },
                    }}
                  >
                    Planos
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}>
                  Empresa
                </Typography>
                <Stack spacing={1}>
                  <Typography
                    variant="body2"
                    component="button"
                    type="button"
                    onClick={() => scrollToId('faq')}
                    sx={{
                      color: INSYT_COLORS.gray400,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textAlign: 'left',
                      font: 'inherit',
                      '&:hover': { color: INSYT_COLORS.primaryLight },
                    }}
                  >
                    Dúvidas
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: INSYT_COLORS.gray500,
                    }}
                  >
                    Contato
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}>
                  Legal
                </Typography>
                <Stack spacing={1}>
                  <Typography
                    variant="body2"
                    component="button"
                    type="button"
                    onClick={() => navigate('/privacy-policy')}
                    sx={{
                      color: INSYT_COLORS.gray400,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textAlign: 'left',
                      font: 'inherit',
                      '&:hover': { color: INSYT_COLORS.primaryLight },
                    }}
                  >
                    Privacidade
                  </Typography>
                  <Typography variant="body2" sx={{ color: INSYT_COLORS.gray500 }}>
                    Termos
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Divider sx={{ my: 4, bgcolor: alpha(INSYT_COLORS.primary, 0.2) }} />
        <Typography variant="body2" sx={{ textAlign: 'center', color: INSYT_COLORS.gray500 }}>
          © {new Date().getFullYear()} INSYT. Todos os direitos reservados. Operação de conteúdo com governança.
        </Typography>
      </Container>
    </Box>
  );
};

export default LandingFooter;
