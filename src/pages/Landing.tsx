import React, { useState, useEffect, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { GLASS } from '../theme/glassTokens';
import {
  LandingNav,
  LandingHero,
  LandingAnalyticsPreview,
  LandingFeatures,
  LandingPricing,
  LandingFaq,
  LandingPostTypes,
  LandingCta,
  LandingFooter,
  type LandingPlanCard,
} from '../components/landing';

const Landing: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plans, setPlans] = useState<LandingPlanCard[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const dbPlans = await subscriptionService.getAllPlans();

        const mappedPlans: LandingPlanCard[] = dbPlans
          .filter((plan) => plan.active && plan.stripe_price_id)
          .map((plan) => {
            const priceInReais = (plan.amount / 100).toFixed(2);
            const priceFormatted = `R$ ${priceInReais.replace('.', ',')}`;

            const featuresList = [
              `Até ${plan.max_clients} contas Instagram`,
              `${plan.max_posts_per_month.toLocaleString('pt-BR')} posts agendados/mês`,
              `Até ${plan.max_profiles} pessoas com acesso`,
              'Aprovação interna e aprovação do cliente',
              'Links de dashboard para cliente',
              'Agendamento de post, carrossel, reels e stories',
            ];

            if (plan.features && typeof plan.features === 'object') {
              if (plan.features.analytics) featuresList.push('Analytics em tempo real');
              if (plan.features.api_access) featuresList.push('API access');
              if (plan.features.support === 'priority') featuresList.push('Suporte prioritário');
            }

            return {
              id: plan.id,
              name: plan.name.charAt(0).toUpperCase() + plan.name.slice(1),
              price: priceFormatted,
              period: '/mês',
              description:
                plan.name === 'starter'
                  ? 'Para estruturar a operação'
                  : plan.name === 'professional'
                    ? 'Para times e agências em escala'
                    : plan.name === 'business'
                      ? 'Para operação avançada multi-conta'
                      : 'Operação completa',
              features: featuresList,
              popular: plan.name === 'professional',
              gradient:
                plan.name === 'starter'
                  ? `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeLight} 100%)`
                  : plan.name === 'professional'
                    ? `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 50%, #8c2d0d 100%)`
                    : `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, #06B6D4 100%)`,
            };
          })
          .sort((a, b) => {
            const order: { [key: string]: number } = { Starter: 1, Professional: 2, Business: 3 };
            return (order[a.name] || 99) - (order[b.name] || 99);
          });

        setPlans(mappedPlans);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        setPlans([
          {
            id: 'fallback-starter',
            name: 'Starter',
            price: 'R$ 87,90',
            period: '/mês',
            description: 'Para estruturar a operação',
            features: [
              'Até 3 contas Instagram',
              '900 posts agendados/mês',
              'Aprovação interna e cliente',
              'Links de dashboard para cliente',
            ],
            popular: false,
            gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeLight} 100%)`,
          },
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((o) => !o);
  }, []);

  const handleGetStarted = async (planId?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (planId) {
        navigate(`/signup?plan=${planId}`);
      } else {
        navigate('/signup');
      }
      return;
    }

    if (planId) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      navigate('/');
    }
  };

  const handleGetStartedGeneric = async () => {
    await handleGetStarted();
  };

  const scrollToPrecos = () => {
    document.getElementById('precos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box
      sx={{
        bgcolor: '#0F172A',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        '& *': {
          fontFamily: 'inherit',
        },
        '& h1, & h2, & .MuiTypography-h4': {
          fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
        },
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 50%, rgba(247, 66, 17, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(52, 211, 153, 0.08) 0%, transparent 50%),
            #0F172A
          `,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(247, 66, 17, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(247, 66, 17, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          zIndex: 0,
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <LandingNav
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onDrawerToggle={handleDrawerToggle}
          onGetStarted={handleGetStartedGeneric}
        />

        <LandingHero onGetStarted={handleGetStartedGeneric} onViewDemo={scrollToPrecos} />

        <LandingAnalyticsPreview />
        <LandingFeatures />
        <LandingPricing plans={plans} loadingPlans={loadingPlans} onSelectPlan={(id) => handleGetStarted(id)} />
        <LandingFaq />
        <LandingPostTypes />
        <LandingCta onGetStarted={handleGetStartedGeneric} />
        <LandingFooter />
      </Box>
    </Box>
  );
};

export default Landing;
