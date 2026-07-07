import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';

type LandingCtaProps = {
  onGetStarted: () => void;
  onTalkToSales: () => void;
};

const LandingCta: React.FC<LandingCtaProps> = ({ onGetStarted, onTalkToSales }) => (
  <Box
    component="section"
    sx={{
      py: { xs: 10, md: 16 },
      position: 'relative',
      background: `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, ${GLASS.accent.orange} 50%, #8c2d0d 100%)`,
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
        `,
      }}
    />
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
            fontSize: { xs: '2.1rem', md: '3.25rem' },
            fontWeight: 800,
            mb: 2,
            color: INSYT_COLORS.white,
          }}
        >
          Teste o fluxo completo com um cliente real
        </Typography>
        <Typography
          variant="h5"
          sx={{
            mb: 5,
            color: alpha(INSYT_COLORS.white, 0.92),
            fontWeight: 400,
            fontSize: { xs: '1.05rem', md: '1.25rem' },
          }}
        >
          Comece com 3 dias grátis ou fale com a equipe para montar uma operação consultiva para sua agência.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onGetStarted}
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: '#0a0f2d',
                color: INSYT_COLORS.white,
                px: 5,
                py: 2.25,
                borderRadius: GLASS.radius.button,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1.15rem',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: `0 14px 36px ${alpha('#000', 0.34)}`,
                '&:hover': {
                  bgcolor: '#131940',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 18px 44px ${alpha('#000', 0.46)}`,
                },
                transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              }}
            >
              Começar teste grátis
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={onTalkToSales}
              startIcon={<WhatsAppIcon />}
              sx={{
                color: INSYT_COLORS.white,
                borderColor: 'rgba(255,255,255,0.42)',
                px: 4,
                py: 2.25,
                borderRadius: GLASS.radius.button,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1.05rem',
                '&:hover': {
                  borderColor: INSYT_COLORS.white,
                  bgcolor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              Falar com vendas
            </Button>
          </motion.div>
        </Box>
      </Box>
    </Container>
  </Box>
);

export default LandingCta;
