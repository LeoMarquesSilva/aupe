import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  Button,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';

export type LandingPlanCard = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  gradient: string;
};

type LandingPricingProps = {
  plans: LandingPlanCard[];
  loadingPlans: boolean;
  onSelectPlan: (planId: string) => void;
};

const LandingPricing: React.FC<LandingPricingProps> = ({ plans, loadingPlans, onSelectPlan }) => (
  <Box
    component="section"
    id="precos"
    sx={{
      py: { xs: 10, md: 14 },
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: `blur(${GLASS.surface.blur})`,
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
          Planos e preços
        </Typography>
        <Typography variant="h6" sx={{ color: INSYT_COLORS.gray400, maxWidth: 560, mx: 'auto', fontWeight: 400 }}>
          Escolha o plano ideal para suas necessidades. Todos incluem teste gratuito.
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        {loadingPlans ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress sx={{ color: INSYT_COLORS.primary }} />
              <Typography sx={{ color: INSYT_COLORS.gray400, mt: 2 }}>Carregando planos...</Typography>
            </Box>
          </Grid>
        ) : plans.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ color: INSYT_COLORS.gray400 }}>Nenhum plano disponível no momento.</Typography>
            </Box>
          </Grid>
        ) : (
          plans.map((plan, index) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    background: plan.popular ? 'rgba(247, 66, 17, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                    border: plan.popular
                      ? `2px solid ${GLASS.accent.orange}`
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: GLASS.radius.card,
                    p: 4,
                    backdropFilter: `blur(${GLASS.surface.blur})`,
                    boxShadow: plan.popular
                      ? `0 0 40px -10px rgba(247, 66, 17, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset`
                      : '0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                    position: 'relative',
                    transition: `all ${GLASS.motion.duration.slow} ${GLASS.motion.easing}`,
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      background: plan.popular ? 'rgba(247, 66, 17, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 20px 40px rgba(247, 66, 17, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
                    },
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="Mais popular"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        background: INSYT_COLORS.gradientPrimary,
                        color: INSYT_COLORS.white,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    />
                  )}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                        fontWeight: 800,
                        mb: 1,
                        color: INSYT_COLORS.gray100,
                      }}
                    >
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: INSYT_COLORS.gray400 }}>
                      {plan.description}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          background: plan.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {plan.price}
                      </Typography>
                      <Typography variant="body1" sx={{ color: INSYT_COLORS.gray400, ml: 1 }}>
                        {plan.period}
                      </Typography>
                    </Box>
                  </Box>
                  <Stack spacing={2} sx={{ mb: 4 }}>
                    {plan.features.map((feature, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <CheckCircleIcon
                          sx={{
                            color: INSYT_COLORS.success,
                            fontSize: 20,
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ color: INSYT_COLORS.gray300, lineHeight: 1.6 }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Button
                    fullWidth
                    variant={plan.popular ? 'contained' : 'outlined'}
                    onClick={() => onSelectPlan(plan.id)}
                    sx={{
                      background: plan.popular ? INSYT_COLORS.gradientPrimary : 'transparent',
                      color: plan.popular ? INSYT_COLORS.white : GLASS.accent.orange,
                      borderColor: GLASS.accent.orange,
                      borderWidth: 2,
                      py: 1.5,
                      borderRadius: GLASS.radius.button,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '1rem',
                      boxShadow: plan.popular ? '0 4px 14px rgba(247, 66, 17, 0.4)' : 'none',
                      '&:hover': {
                        background: plan.popular ? INSYT_COLORS.gradientPrimary : 'rgba(247, 66, 17, 0.1)',
                        borderColor: GLASS.accent.orange,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(247, 66, 17, 0.3)',
                      },
                      transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                    }}
                  >
                    Começar agora
                  </Button>
                </Card>
              </motion.div>
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  </Box>
);

export default LandingPricing;
