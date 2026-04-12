import React from 'react';
import { Box, Container, Typography, Grid, Card } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, postTypes } from './LandingContent';

const LandingPostTypes: React.FC = () => (
  <Box
    component="section"
    sx={{
      py: { xs: 10, md: 14 },
      position: 'relative',
    }}
  >
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
            fontSize: { xs: '2.25rem', md: '3.25rem' },
            fontWeight: 800,
            mb: 2,
            background: INSYT_COLORS.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Formatos que sua operação precisa
        </Typography>
        <Typography variant="h6" sx={{ color: INSYT_COLORS.gray400, maxWidth: 560, mx: 'auto', fontWeight: 400 }}>
          Um único fluxo para planejar, aprovar e publicar post, carrossel, reels e stories
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {postTypes.map((type, index) => (
          <Grid item xs={6} md={3} key={type.name}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              whileHover={{ scale: 1.04 }}
            >
              <Card
                sx={{
                  textAlign: 'center',
                  p: 4,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: GLASS.radius.card,
                  backdropFilter: `blur(${GLASS.surface.blur})`,
                  boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                  transition: `all ${GLASS.motion.duration.slow} ${GLASS.motion.easing}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: type.gradient,
                    opacity: 0,
                    transition: `opacity ${GLASS.motion.duration.slow} ${GLASS.motion.easing}`,
                  },
                  '&:hover': {
                    borderColor: 'rgba(247, 66, 17, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-6px)',
                    boxShadow: `0 16px 32px ${alpha(type.color, 0.3)}, 0 0 0 1px rgba(255, 255, 255, 0.08) inset`,
                    '&::before': {
                      opacity: 0.1,
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    color: type.color,
                    mb: 2,
                    position: 'relative',
                    zIndex: 1,
                    '& svg': { fontSize: 52 },
                  }}
                >
                  {type.icon}
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                    fontWeight: 700,
                    color: INSYT_COLORS.gray100,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {type.name}
                </Typography>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

export default LandingPostTypes;
