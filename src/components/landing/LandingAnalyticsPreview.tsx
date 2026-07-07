import React from 'react';
import { Box, Container, Typography, Card, Grid, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, agencyPains, workflowSteps } from './LandingContent';

const LandingAnalyticsPreview: React.FC = () => (
  <Box
    component="section"
    sx={{
      py: { xs: 7, md: 10 },
      position: 'relative',
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
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75 }}
      >
        <Box id="workflow" sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, scrollMarginTop: 96 }}>
          <Chip
            label="Como funciona"
            sx={{
              mb: 2,
              bgcolor: '#fff',
              color: INSYT_COLORS.primary,
              border: `1px solid ${alpha(INSYT_COLORS.primary, 0.18)}`,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
              fontSize: { xs: '2.25rem', md: '3.25rem' },
              fontWeight: 800,
              mb: 2,
              color: '#0a0f2d',
            }}
          >
            Uma rotina clara para cada cliente
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: '#525663', maxWidth: 720, mx: 'auto', fontWeight: 400, lineHeight: 1.6 }}
          >
            O INSYT organiza a operação em etapas simples, para o time saber o que falta aprovar, publicar e reportar.
          </Typography>
        </Box>

        <Card
          elevation={0}
          sx={{
            bgcolor: '#ffffff',
            border: '1px solid rgba(82, 86, 99, 0.12)',
            borderRadius: { xs: 4, md: 5 },
            p: { xs: 2.25, md: 3 },
            boxShadow: '0 18px 50px -34px rgba(10, 15, 45, 0.45)',
            mb: { xs: 3, md: 4 },
          }}
        >
          <Grid container spacing={2.25}>
            {workflowSteps.map((step, index) => (
              <Grid item xs={12} md={3} key={step.title}>
                <Box
                  sx={{
                    height: '100%',
                    p: { xs: 2.25, md: 2.5 },
                    borderRadius: 3,
                    bgcolor: index === 1 ? 'rgba(247, 66, 17, 0.06)' : '#fbfbfb',
                    border: `1px solid ${index === 1 ? alpha(INSYT_COLORS.primary, 0.22) : 'rgba(82, 86, 99, 0.1)'}`,
                  }}
                >
                  <Typography
                    sx={{
                      color: INSYT_COLORS.primary,
                      fontWeight: 900,
                      fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                      fontSize: '1.25rem',
                      mb: 2,
                    }}
                  >
                    0{index + 1}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#0a0f2d',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      mb: 1,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography sx={{ color: '#525663', lineHeight: 1.65, fontSize: '0.92rem' }}>
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>

        <Grid container spacing={2.5}>
          {agencyPains.map((item, index) => (
            <Grid item xs={12} md={4} key={item.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: { xs: 2.5, md: 3 },
                    bgcolor: '#ffffff',
                    border: `1px solid ${index === 1 ? alpha(INSYT_COLORS.primary, 0.2) : 'rgba(82, 86, 99, 0.12)'}`,
                    borderRadius: GLASS.radius.card,
                    boxShadow: index === 1
                      ? '0 18px 42px -28px rgba(247, 66, 17, 0.45)'
                      : '0 12px 34px -30px rgba(10, 15, 45, 0.42)',
                  }}
                >
                  <Typography sx={{ color: INSYT_COLORS.primary, fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.16em', textTransform: 'uppercase', mb: 1.5 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ color: '#0a0f2d', fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif', fontWeight: 800, fontSize: '1.35rem', mb: 1.5, lineHeight: 1.15 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: '#525663', lineHeight: 1.75 }}>
                    {item.description}
                  </Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Container>
  </Box>
);

export default LandingAnalyticsPreview;
