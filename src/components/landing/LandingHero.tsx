import React from 'react';
import { Box, Container, Typography, Button, Stack, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import heroMockupImage from '../../assets/favicon_io-aupe/hero-image.png';
import { INSYT_COLORS } from './LandingContent';

const displayFont = '"Cabinet Grotesk", "Poppins", system-ui, sans-serif';
const bodyFont = '"Poppins", system-ui, sans-serif';

const orbitBadges = [
  { label: 'IG', color: '#e1306c', top: '12%', right: '22%' },
  { label: 'WA', color: '#25d366', bottom: '16%', right: '9%' },
  { label: 'IN', color: '#0a66c2', bottom: '27%', right: '0%' },
];

type LandingHeroProps = {
  onGetStarted: () => void;
  onTalkToSales: () => void;
};

const HeroMockup: React.FC = () => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 34, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    sx={{
      position: 'relative',
      width: '100%',
      minHeight: { xs: 330, sm: 430, md: 560 },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mt: { xs: 1, md: 0 },
      px: { xs: 0, sm: 1, md: 0 },
      isolation: 'isolate',
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: { xs: '4% -8% 8%', md: '-2% -14% 2%' },
        borderRadius: '48% 52% 44% 56% / 42% 44% 56% 58%',
        background: `
          radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.98), transparent 24%),
          radial-gradient(circle at 66% 18%, ${alpha(INSYT_COLORS.primaryLight, 0.32)}, transparent 25%),
          radial-gradient(circle at 24% 72%, ${alpha('#5cc8ff', 0.34)}, transparent 34%),
          radial-gradient(circle at 72% 70%, ${alpha('#ffd6a7', 0.62)}, transparent 31%),
          linear-gradient(135deg, rgba(236, 247, 255, 0.94), rgba(255, 238, 232, 0.88) 48%, rgba(244, 249, 255, 0.92))
        `,
        filter: 'blur(0.2px)',
        opacity: 0.98,
        pointerEvents: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 34px 110px -54px rgba(62, 84, 181, 0.55)',
      }}
    />

    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        width: { xs: 260, md: 390 },
        height: { xs: 260, md: 390 },
        right: { xs: '3%', md: '7%' },
        top: { xs: '9%', md: '4%' },
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${alpha('#dff3ff', 0.72)}, ${alpha(INSYT_COLORS.primaryLight, 0.24)})`,
        filter: 'blur(12px)',
        pointerEvents: 'none',
      }}
    />

    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: { xs: '6%', md: '9%' },
        bottom: { xs: '14%', md: '9%' },
        width: { xs: 120, md: 180 },
        height: { xs: 120, md: 180 },
        borderRadius: '36px',
        transform: 'rotate(-12deg)',
        background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.primary, 0.18)}, ${alpha('#ffffff', 0.78)})`,
        border: '1px solid rgba(255,255,255,0.72)',
        boxShadow: '0 18px 52px -36px rgba(247, 66, 17, 0.7)',
        pointerEvents: 'none',
      }}
    />

    <Box
      component={motion.div}
      whileHover={{ y: -8, rotateX: 1.2, rotateY: -1.2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{
        position: 'relative',
        zIndex: 2,
        width: { xs: '116%', sm: '108%', md: '126%' },
        maxWidth: 900,
        ml: { xs: 0, md: 4 },
        transformStyle: 'preserve-3d',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '10%',
          right: '8%',
          bottom: { xs: 8, md: 2 },
          height: { xs: 32, md: 54 },
          borderRadius: '999px',
          background: 'radial-gradient(ellipse at center, rgba(10, 15, 45, 0.34), rgba(10, 15, 45, 0.07) 62%, transparent)',
          filter: 'blur(14px)',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: '22px', md: '30px' },
          boxShadow: '0 42px 120px -56px rgba(10, 15, 45, 0.62)',
          transform: { md: 'translateX(10px)' },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: { xs: '3% 7% 54%', md: '3% 8% 56%' },
            borderRadius: { xs: '18px', md: '24px' },
            background: 'linear-gradient(115deg, rgba(255,255,255,0.18), transparent 34%, rgba(255,255,255,0.08))',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          component="img"
          src={heroMockupImage}
          alt="Mockup do calendário de conteúdo INSYT em um notebook"
          loading="eager"
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'block',
            width: '100%',
            height: 'auto',
            filter: 'drop-shadow(0 30px 54px rgba(10, 15, 45, 0.2)) saturate(1.04)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%)',
          }}
        />
      </Box>
    </Box>

    {orbitBadges.map((badge, index) => (
      <Box
        key={badge.label}
        component={motion.div}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.2 + index * 0.35, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          zIndex: 4,
          top: badge.top,
          right: badge.right,
          bottom: badge.bottom,
          width: { xs: 34, md: 42 },
          height: { xs: 34, md: 42 },
          borderRadius: '50%',
          display: { xs: index === 1 ? 'grid' : 'none', sm: 'grid' },
          placeItems: 'center',
          bgcolor: badge.color,
          color: '#fff',
          fontSize: { xs: '0.68rem', md: '0.76rem' },
          fontWeight: 900,
          border: '3px solid rgba(255,255,255,0.9)',
          boxShadow: '0 16px 34px -18px rgba(10, 15, 45, 0.55)',
        }}
      >
        {badge.label}
      </Box>
    ))}

    <Box
      component={motion.div}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      sx={{
        position: 'absolute',
        zIndex: 4,
        left: { xs: '4%', sm: '5%', md: '9%' },
        bottom: { xs: '9%', sm: '12%', md: '16%' },
        display: { xs: 'none', sm: 'block' },
        px: 1.7,
        py: 1.2,
        borderRadius: '18px',
        bgcolor: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 22px 58px -32px rgba(10, 15, 45, 0.45)',
      }}
    >
      <Typography sx={{ fontSize: '0.72rem', color: '#525663', fontWeight: 700, mb: 0.2 }}>Aprovações hoje</Typography>
      <Typography sx={{ fontFamily: displayFont, fontSize: '1.45rem', lineHeight: 1, fontWeight: 900, color: '#0a0f2d' }}>
        +18
      </Typography>
    </Box>
  </Box>
);

const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onTalkToSales }) => (
  <Box
    component="section"
    id="hero"
    sx={{
      pt: { xs: 13, md: 15 },
      pb: { xs: 7, md: 9 },
      position: 'relative',
      overflow: 'hidden',
      minHeight: { md: 720 },
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <Container
      maxWidth={false}
      sx={{
        maxWidth: 1360,
        mx: 'auto',
        px: { xs: 2.5, md: 3 },
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
            gap: { xs: 5, md: 4, lg: 6 },
            alignItems: 'center',
          }}
        >
          <Box sx={{ maxWidth: { xs: 720, md: 500 }, mx: { xs: 'auto', md: 0 }, textAlign: { xs: 'center', md: 'left' } }}>
            <Chip
              label="Agendamento, aprovação e dashboard para Instagram"
              sx={{
                bgcolor: alpha(INSYT_COLORS.primary, 0.1),
                color: INSYT_COLORS.primary,
                mb: 3,
                fontWeight: 800,
                border: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                fontSize: { xs: '0.72rem', sm: '0.82rem' },
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                py: 2.15,
                fontFamily: bodyFont,
              }}
            />

            <Typography
              component="h1"
              sx={{
                fontFamily: displayFont,
                fontSize: { xs: '2.55rem', sm: '3.45rem', md: '4.55rem' },
                fontWeight: 900,
                lineHeight: { xs: 0.98, md: 0.94 },
                letterSpacing: '-0.065em',
                mb: 2.5,
                color: '#0a0f2d',
              }}
            >
              Organize o Instagram dos clientes{' '}
              <Box component="span" sx={{ color: INSYT_COLORS.primary }}>
                sem virar operação no WhatsApp
              </Box>
            </Typography>

            <Typography
              sx={{
                fontFamily: bodyFont,
                color: '#525663',
                mb: 4,
                fontWeight: 400,
                maxWidth: 720,
                mx: { xs: 'auto', md: 0 },
                lineHeight: 1.65,
                fontSize: { xs: '1.02rem', md: '1.2rem' },
              }}
            >
              Planeje posts, aprove com o cliente, agende publicações e compartilhe resultados em uma rotina única para agências.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mb: 2.25 }}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onGetStarted}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    background: INSYT_COLORS.gradientPrimary,
                    color: INSYT_COLORS.white,
                    px: 4,
                    py: 1.75,
                    borderRadius: GLASS.radius.button,
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '1.03rem',
                    fontFamily: bodyFont,
                    boxShadow: '0 10px 26px rgba(247, 66, 17, 0.34)',
                    '&:hover': {
                      background: INSYT_COLORS.gradientPrimary,
                      transform: 'translateY(-2px)',
                      boxShadow: '0 14px 34px rgba(247, 66, 17, 0.44)',
                    },
                    transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                  }}
                >
                  Começar teste grátis
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onTalkToSales}
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    borderColor: 'rgba(10, 15, 45, 0.18)',
                    color: '#0a0f2d',
                    px: 3.5,
                    py: 1.75,
                    borderRadius: GLASS.radius.button,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1.03rem',
                    fontFamily: bodyFont,
                    bgcolor: '#ffffff',
                    '&:hover': {
                      borderColor: INSYT_COLORS.primary,
                      bgcolor: alpha(INSYT_COLORS.primary, 0.08),
                    },
                  }}
                >
                  Falar no WhatsApp
                </Button>
              </motion.div>
            </Stack>

            <Typography sx={{ color: INSYT_COLORS.gray500, fontSize: '0.88rem' }}>
              3 dias grátis. Sem compromisso no trial. Atendimento consultivo para planos maiores.
            </Typography>
          </Box>

          <HeroMockup />
        </Box>
      </motion.div>
    </Container>
  </Box>
);

export default LandingHero;
