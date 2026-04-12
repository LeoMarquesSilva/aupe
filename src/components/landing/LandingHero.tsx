import React from 'react';
import { Box, Container, Typography, Button, Stack, Grid, Card, Chip, Avatar, AvatarGroup } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, stats } from './LandingContent';
import { LOGO_PRIMARY, PROFILE_MARK_SOCIAL, VECTOR_MARK_ORANGE, VECTOR_MARK_CORNER } from './landingAssets';

const displayFont = '"Cabinet Grotesk", "Poppins", system-ui, sans-serif';
const bodyFont = '"Poppins", system-ui, sans-serif';

type LandingHeroProps = {
  onGetStarted: () => void;
  onViewDemo: () => void;
};

const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onViewDemo }) => (
  <Box
    component="section"
    id="hero"
    sx={{
      pt: { xs: 18, md: 22 },
      pb: { xs: 10, md: 14 },
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: { xs: '8%', md: '12%' },
        right: { xs: '-12%', md: '4%' },
        width: { xs: 140, md: 220 },
        height: { xs: 140, md: 220 },
        opacity: 0.12,
        pointerEvents: 'none',
      }}
    >
      <Box component="img" src={VECTOR_MARK_ORANGE} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        bottom: { xs: '18%', md: '22%' },
        left: { xs: '-8%', md: '2%' },
        width: { xs: 100, md: 160 },
        height: { xs: 100, md: 160 },
        opacity: 0.1,
        pointerEvents: 'none',
      }}
    >
      <Box component="img" src={VECTOR_MARK_CORNER} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>

    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75 }}
      >
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <Chip
                icon={<CodeIcon sx={{ color: `${INSYT_COLORS.primaryLight} !important` }} />}
                label="Agendamento · Aprovação · Dashboard compartilhável"
                sx={{
                  background: alpha(INSYT_COLORS.primary, 0.2),
                  color: INSYT_COLORS.primaryLight,
                  mb: 3,
                  fontWeight: 600,
                  border: `1px solid ${alpha(INSYT_COLORS.primary, 0.35)}`,
                  fontSize: '0.8125rem',
                  py: 2.25,
                  fontFamily: bodyFont,
                }}
              />
            </motion.div>

            <Typography
              component="h1"
              sx={{
                fontFamily: displayFont,
                fontSize: { xs: '2.35rem', sm: '2.85rem', md: '3.25rem' },
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                mb: 2,
                color: INSYT_COLORS.gray100,
              }}
            >
              Operação de conteúdo no Instagram{' '}
              <Box
                component="span"
                sx={{
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                com governança de ponta a ponta
              </Box>
            </Typography>

            <Typography
              sx={{
                fontFamily: bodyFont,
                color: INSYT_COLORS.gray400,
                mb: 3,
                fontWeight: 400,
                maxWidth: 520,
                lineHeight: 1.65,
                fontSize: { xs: '1.05rem', md: '1.125rem' },
              }}
            >
              Centralize agendamento de posts, carrosséis, reels e stories, aprovação interna e do cliente, e
              compartilhamento de métricas por link. Um fluxo único para escalar contas sem perder previsibilidade.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
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
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    fontFamily: bodyFont,
                    boxShadow: '0 8px 24px rgba(247, 66, 17, 0.4)',
                    '&:hover': {
                      background: INSYT_COLORS.gradientPrimary,
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(247, 66, 17, 0.5)',
                    },
                    transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                  }}
                >
                  Iniciar operação
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onViewDemo}
                  sx={{
                    borderColor: 'rgba(247, 66, 17, 0.45)',
                    color: INSYT_COLORS.gray200,
                    px: 4,
                    py: 1.75,
                    borderRadius: GLASS.radius.button,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    fontFamily: bodyFont,
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: GLASS.accent.orange,
                      bgcolor: 'rgba(247, 66, 17, 0.1)',
                      borderWidth: 2,
                    },
                  }}
                >
                  Ver planos e recursos
                </Button>
              </motion.div>
            </Stack>

            <Box sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: INSYT_COLORS.gray500,
                  fontFamily: bodyFont,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Criado para times e agências
              </Typography>
              <AvatarGroup
                max={6}
                sx={{
                  justifyContent: { xs: 'center', md: 'flex-start' },
                  '& .MuiAvatar-root': {
                    width: 48,
                    height: 48,
                    border: '2px solid rgba(15, 23, 42, 0.9)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                {PROFILE_MARK_SOCIAL.map((src) => (
                  <Avatar key={src} alt="" src={src} imgProps={{ loading: 'lazy' }} />
                ))}
              </AvatarGroup>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, delay: 0.15 }}
                style={{ width: '100%', maxWidth: 420 }}
              >
                <Box
                  component="img"
                  src={LOGO_PRIMARY}
                  alt="INSYT — inteligência para o Instagram"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: { xs: 120, sm: 160, md: 200 },
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.35))',
                  }}
                />
              </motion.div>

              <Grid container spacing={2} sx={{ width: '100%', maxWidth: 440 }}>
                {stats.map((stat, index) => (
                  <Grid item xs={6} key={stat.label}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.35 + index * 0.08 }}
                    >
                      <Card
                        sx={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: GLASS.radius.card,
                          p: 2,
                          textAlign: 'center',
                          backdropFilter: `blur(${GLASS.surface.blur})`,
                          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                          transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            borderColor: 'rgba(247, 66, 17, 0.28)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: INSYT_COLORS.primaryLight,
                            mb: 0.5,
                            display: 'flex',
                            justifyContent: 'center',
                            '& svg': { fontSize: 28 },
                          }}
                        >
                          {stat.icon}
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: displayFont,
                            fontWeight: 800,
                            fontSize: { xs: '1.5rem', sm: '1.75rem' },
                            background: INSYT_COLORS.gradientPrimary,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            mb: 0.25,
                          }}
                        >
                          <CountUp end={stat.value} duration={2} delay={0.4 + index * 0.15} />
                          {stat.suffix}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: INSYT_COLORS.gray400, fontWeight: 600, fontFamily: bodyFont }}
                        >
                          {stat.label}
                        </Typography>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  </Box>
);

export default LandingHero;
