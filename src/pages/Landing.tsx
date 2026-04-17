import React, { useState, useEffect, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { ENTERPRISE_CONTACT_URL } from '../config/stripeProducts';
import { mapAndSortPlansFromDb } from '../config/planPresentation';
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
        setPlans(mapAndSortPlansFromDb(dbPlans as any));
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        setPlans([]);
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
    // Se for ENTERPRISE (A Consultar), redirecionar direto para WhatsApp
    const selectedPlan = planId ? plans.find((p) => p.id === planId) : null;
    if (selectedPlan?.isContactOnly) {
      window.open(ENTERPRISE_CONTACT_URL, '_blank', 'noopener,noreferrer');
      return;
    }

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
