import React from 'react';
import { Box, Container, Typography, Card, Grid } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, analyticsData, performanceData } from './LandingContent';
import { VECTOR_MARK_ICON } from './landingAssets';

const LandingAnalyticsPreview: React.FC = () => (
  <Box
    component="section"
    sx={{
      py: { xs: 10, md: 14 },
      position: 'relative',
    }}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: '40%',
        left: '2%',
        width: { xs: 56, md: 80 },
        height: { xs: 56, md: 80 },
        opacity: 0.08,
        pointerEvents: 'none',
      }}
    >
      <Box component="img" src={VECTOR_MARK_ICON} alt="" sx={{ width: '100%', height: '100%' }} />
    </Box>
    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75 }}
      >
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
            Analytics em tempo real
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: INSYT_COLORS.gray400, maxWidth: 560, mx: 'auto', fontWeight: 400 }}
          >
            Visualize dados, identifique tendências e otimize sua estratégia com insights poderosos
          </Typography>
        </Box>

        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: GLASS.radius.card,
            p: { xs: 2, md: 4 },
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            boxShadow: '0 20px 60px rgba(247, 66, 17, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
          }}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography
                variant="h6"
                sx={{
                  color: INSYT_COLORS.gray200,
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Performance semanal
              </Typography>
              <Box sx={{ height: 280, width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorReachLanding" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={INSYT_COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={INSYT_COLORS.primary} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke={INSYT_COLORS.gray400} />
                    <YAxis stroke={INSYT_COLORS.gray400} />
                    <Tooltip
                      contentStyle={{
                        background: INSYT_COLORS.gray800,
                        border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      stroke={INSYT_COLORS.primary}
                      fill="url(#colorReachLanding)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography
                variant="h6"
                sx={{
                  color: INSYT_COLORS.gray200,
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Crescimento mensal
              </Typography>
              <Box sx={{ height: 280, width: '100%' }}>
                <ResponsiveContainer>
                  <LineChart data={analyticsData}>
                    <XAxis dataKey="name" stroke={INSYT_COLORS.gray400} />
                    <YAxis stroke={INSYT_COLORS.gray400} />
                    <Tooltip
                      contentStyle={{
                        background: INSYT_COLORS.gray800,
                        border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={INSYT_COLORS.secondary}
                      strokeWidth={3}
                      dot={{ fill: INSYT_COLORS.secondary, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke={INSYT_COLORS.accent}
                      strokeWidth={3}
                      dot={{ fill: INSYT_COLORS.accent, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </motion.div>
    </Container>
  </Box>
);

export default LandingAnalyticsPreview;
