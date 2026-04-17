import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { ENTERPRISE_CONTACT_URL } from '../config/stripeProducts';
import { mapAndSortPlansFromDb } from '../config/planPresentation';
import { LandingPricing, type LandingPlanCard } from '../components/landing';

const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<LandingPlanCard[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [currentSubscriptionPlanId, setCurrentSubscriptionPlanId] = useState<string | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingPlans(true);
      setCurrentSubscriptionPlanId(null);
      setCurrentPlanName(null);
      try {
        const [dbPlans, authRes] = await Promise.all([
          subscriptionService.getAllPlans(),
          supabase.auth.getUser(),
        ]);
        if (!cancelled) {
          setPlans(mapAndSortPlansFromDb(dbPlans as any));
        }

        const user = authRes.data.user;
        if (user && !cancelled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();
          const orgId = profile?.organization_id as string | undefined;
          if (orgId && !cancelled) {
            const sub = await subscriptionService.getSubscriptionByOrganization(orgId);
            if (!cancelled && sub?.plan_id) {
              setCurrentSubscriptionPlanId(sub.plan_id);
              setCurrentPlanName(sub.plan?.name ?? null);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar planos ou assinatura:', error);
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan?.isContactOnly) {
      window.open(ENTERPRISE_CONTACT_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate(`/signup?plan=${planId}`);
      return;
    }

    navigate(`/checkout?plan=${planId}`);
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <LandingPricing
        plans={plans}
        loadingPlans={loadingPlans}
        onSelectPlan={handleSelectPlan}
        currentSubscriptionPlanId={currentSubscriptionPlanId}
        currentPlanName={currentPlanName}
      />
    </Box>
  );
};

export default PlansPage;
