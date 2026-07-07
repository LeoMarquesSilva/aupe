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
  LandingFeatures,
  LandingPricing,
  LandingFaq,
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
    const defaultPlan = plans.find((plan) => plan.popular && !plan.isContactOnly) || plans.find((plan) => !plan.isContactOnly);
    await handleGetStarted(defaultPlan?.id);
  };

  const handleTalkToSales = () => {
    window.open(ENTERPRISE_CONTACT_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      sx={{
        bgcolor: '#f6f6f6',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        '& *': {
          fontFamily: 'inherit',
        },
        '& h1, & h2, & .MuiTypography-h4': {
          fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <LandingNav
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onDrawerToggle={handleDrawerToggle}
          onGetStarted={handleGetStartedGeneric}
          onTalkToSales={handleTalkToSales}
        />

        <LandingHero onGetStarted={handleGetStartedGeneric} onTalkToSales={handleTalkToSales} />

        <LandingFeatures />
        <LandingPricing plans={plans} loadingPlans={loadingPlans} onSelectPlan={(id) => handleGetStarted(id)} />
        <LandingFaq />
        <LandingCta onGetStarted={handleGetStartedGeneric} onTalkToSales={handleTalkToSales} />
        <LandingFooter onGetStarted={handleGetStartedGeneric} onTalkToSales={handleTalkToSales} />
      </Box>
    </Box>
  );
};

export default Landing;
