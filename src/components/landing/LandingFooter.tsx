import React from 'react';
import { Box, Container, Typography, Grid, Stack, Divider, Button, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { INSYT_COLORS } from './LandingContent';
import { LOGO_PRIMARY } from './landingAssets';

const footerColumns = [
  {
    title: 'Produto',
    links: [
      { label: 'Agendamento de postagens', href: '#agendamento' },
      { label: 'Aprovação de post', href: '#aprovacao' },
      { label: 'Dashboard do cliente', href: '#dashboard-cliente' },
      { label: 'Planos', href: '#precos' },
    ],
  },
  {
    title: 'Funcionalidades',
    links: [
      { label: 'Reels, carrossel e story', href: '#agendamento' },
      { label: 'Aprovação interna', href: '#aprovacao' },
      { label: 'Envio para aprovação do cliente', href: '#aprovacao' },
      { label: 'Dados em tempo real por link', href: '#dashboard-cliente' },
    ],
  },
  {
    title: 'Segmentos',
    links: [
      { label: 'Agências de social media', href: '#hero' },
      { label: 'Gestores de tráfego e conteúdo', href: '#agendamento' },
      { label: 'Times de marketing', href: '#dashboard-cliente' },
      { label: 'Clientes com aprovação externa', href: '#faq' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { label: 'Começar teste grátis', href: '#precos' },
      { label: 'Entrar na plataforma', href: '/login' },
      { label: 'Política de privacidade', href: '/privacy-policy' },
      { label: 'Termos de uso', href: '/terms' },
    ],
  },
];

type LandingFooterProps = {
  onGetStarted: () => void;
  onTalkToSales: () => void;
};

const LandingFooter: React.FC<LandingFooterProps> = ({ onGetStarted, onTalkToSales }) => (
    <Box
      component="footer"
      sx={{
        pt: { xs: 6, md: 8 },
        pb: { xs: 4, md: 5 },
        bgcolor: '#0a0f2d',
        borderTop: '1px solid rgba(247, 66, 17, 0.22)',
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 1.1fr) minmax(0, 2fr)' },
            gap: { xs: 4, md: 7 },
            alignItems: 'flex-start',
          }}
        >
          <Box>
            <Box component="img" src={LOGO_PRIMARY} alt="INSYT" sx={{ height: 44, width: 'auto', mb: 2.5, display: 'block' }} />
            <Typography sx={{ color: '#ffffff', fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif', fontWeight: 800, fontSize: '1.25rem', mb: 1.25 }}>
              Gestão de conteúdo no Instagram para agências.
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.75, maxWidth: 440, mb: 2.5 }}>
              Agende posts, organize aprovação de conteúdo e compartilhe dashboards com clientes em um fluxo único.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
              {['Instagram', 'Aprovação', 'Calendário', 'Dashboard'].map((item) => (
                <Chip
                  key={item}
                  label={item}
                  size="small"
                  sx={{
                    color: 'rgba(255,255,255,0.72)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button
                variant="contained"
                onClick={onGetStarted}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: INSYT_COLORS.primary,
                  color: '#fff',
                  borderRadius: 999,
                  px: 2.5,
                  py: 1.15,
                  textTransform: 'none',
                  fontWeight: 800,
                  '&:hover': { bgcolor: INSYT_COLORS.primaryDark },
                }}
              >
                Começar teste grátis
              </Button>
              <Button
                variant="outlined"
                onClick={onTalkToSales}
                startIcon={<WhatsAppIcon />}
                sx={{
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.24)',
                  borderRadius: 999,
                  px: 2.25,
                  py: 1.15,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { borderColor: INSYT_COLORS.primaryLight, bgcolor: 'rgba(255,255,255,0.07)' },
                }}
              >
                WhatsApp
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {footerColumns.map((column) => (
              <Grid item xs={6} sm={3} key={column.title}>
                <Typography sx={{ mb: 2, color: '#ffffff', fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.02em' }}>
                  {column.title}
                </Typography>
                <Stack spacing={1.15}>
                  {column.links.map((link) => (
                    <Button
                      key={`${column.title}-${link.label}`}
                      component="a"
                      href={link.href}
                      sx={{
                        color: 'rgba(255,255,255,0.64)',
                        justifyContent: 'flex-start',
                        p: 0,
                        minWidth: 0,
                        border: 'none',
                        boxShadow: 'none',
                        lineHeight: 1.45,
                        textTransform: 'none',
                        textAlign: 'left',
                        fontSize: '0.86rem',
                        fontWeight: 400,
                        '&:hover': {
                          color: INSYT_COLORS.primaryLight,
                          bgcolor: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {link.label}
                    </Button>
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: { xs: 4, md: 5 }, bgcolor: alpha(INSYT_COLORS.primary, 0.22) }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.52)' }}>
            © {new Date().getFullYear()} INSYT. Todos os direitos reservados.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.52)' }}>
            Operação de conteúdo com governança para Instagram.
          </Typography>
        </Box>
      </Container>
    </Box>
);

export default LandingFooter;
