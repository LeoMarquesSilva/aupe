import React from 'react';
import { Box, Container, Typography, Grid, Card } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, features } from './LandingContent';

const LandingFeatures: React.FC = () => (
  <Box
    component="section"
    id="features"
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
          Tecnologia e dados
        </Typography>
        <Typography variant="h6" sx={{ color: INSYT_COLORS.gray400, maxWidth: 640, mx: 'auto', fontWeight: 400 }}>
          Funcionalidades poderosas construídas com as melhores tecnologias do mercado
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={feature.title}>
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: GLASS.radius.card,
                  p: 4,
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
                    height: '4px',
                    background: feature.gradient,
                  },
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(247, 66, 17, 0.3)',
                    boxShadow: '0 20px 40px rgba(247, 66, 17, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
                  },
                }}
              >
                <Box
                  sx={{
                    mb: 3,
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: 2,
                    background: alpha(INSYT_COLORS.primary, 0.1),
                    color: INSYT_COLORS.primaryLight,
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                    fontWeight: 800,
                    mb: 2,
                    color: INSYT_COLORS.gray100,
                    fontSize: { xs: '1.35rem', md: '1.5rem' },
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography variant="body1" sx={{ color: INSYT_COLORS.gray400, lineHeight: 1.8, fontSize: '1.02rem' }}>
                  {feature.description}
                </Typography>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

export default LandingFeatures;
