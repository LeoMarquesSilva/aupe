import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';

type LandingCtaProps = {
  onGetStarted: () => void;
};

const LandingCta: React.FC<LandingCtaProps> = ({ onGetStarted }) => (
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
          Pronto para transformar seu Instagram?
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
          Comece hoje e veja a diferença que a automação inteligente faz
        </Typography>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onGetStarted}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: INSYT_COLORS.white,
              color: GLASS.accent.orangeDark,
              px: 5,
              py: 2.25,
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1.15rem',
              boxShadow: `0 12px 32px ${alpha('#000', 0.3)}`,
              '&:hover': {
                bgcolor: INSYT_COLORS.gray100,
                transform: 'translateY(-2px)',
                boxShadow: `0 16px 40px ${alpha('#000', 0.4)}`,
              },
              transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
            }}
          >
            Começar agora — é grátis
          </Button>
        </motion.div>
      </Box>
    </Container>
  </Box>
);

export default LandingCta;
