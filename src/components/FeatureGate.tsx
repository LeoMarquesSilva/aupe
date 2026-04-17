// FeatureGate - Componente que bloqueia o acesso a uma feature com upsell
// INSYT - Instagram Scheduler

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import { useNavigate } from 'react-router-dom';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { GLASS } from '../theme/glassTokens';
import { STRIPE_ADDONS, formatBRL } from '../config/stripeProducts';

export interface FeatureGateProps {
  featureFlag: string;
  featureName: string;
  description?: string;
  /** Caminho do ícone alternativo. Se não fornecido, usa LockOutlinedIcon. */
  icon?: React.ReactNode;
  /** Rota para contratar o add-on (ex: '/settings?tab=addons'). */
  upsellRoute?: string;
  children: React.ReactNode;
}

/**
 * Envolve o conteúdo de uma página/feature e exibe uma tela de upsell
 * se a feature flag (add-on) não estiver ativa para a organização do usuário.
 *
 * Exemplo:
 *   <FeatureGate featureFlag="fluxo_aprovacao" featureName="Fluxo de Aprovação">
 *     <ApprovalsContent />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
  featureFlag,
  featureName,
  description,
  icon,
  upsellRoute = '/settings?tab=addons',
  children,
}) => {
  const navigate = useNavigate();
  const { enabled, loading } = useFeatureFlag(featureFlag);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress sx={{ color: GLASS.accent.orange }} />
      </Box>
    );
  }

  if (enabled) {
    return <>{children}</>;
  }

  // Preço do add-on universal que bate com essa flag
  const addon = Object.values(STRIPE_ADDONS).find(
    (a) => a.featureFlag === featureFlag,
  );
  const price = addon ? `${formatBRL(addon.amount)}/mês` : '';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          textAlign: 'center',
          background: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          border: `1px solid ${GLASS.border.outer}`,
          borderRadius: GLASS.radius.card,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}
      >
        <Stack spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${GLASS.accent.orange}33, ${GLASS.accent.orange}11)`,
              border: `1px solid ${GLASS.accent.orange}55`,
            }}
          >
            {icon || (
              <LockOutlinedIcon sx={{ fontSize: 36, color: GLASS.accent.orange }} />
            )}
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: GLASS.text.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {featureName}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: GLASS.text.muted,
              maxWidth: 520,
              lineHeight: 1.6,
            }}
          >
            {description ||
              `A feature "${featureName}" não está inclusa no seu plano atual. Ative o add-on para começar a usar agora.`}
          </Typography>

          {price && (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: GLASS.accent.orange,
                mt: 1,
              }}
            >
              {price}
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<UpgradeIcon />}
              onClick={() => navigate(upsellRoute)}
              sx={{
                background: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 100%)`,
                color: '#fff',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                py: 1.25,
                borderRadius: GLASS.radius.button,
                boxShadow: `0 10px 24px -10px ${GLASS.accent.orange}80`,
                '&:hover': {
                  filter: 'brightness(1.08)',
                  boxShadow: `0 14px 28px -10px ${GLASS.accent.orange}99`,
                },
              }}
            >
              Contratar {featureName}
            </Button>
            <Button
              variant="text"
              size="large"
              onClick={() => navigate(-1)}
              sx={{
                color: GLASS.text.muted,
                textTransform: 'none',
              }}
            >
              Voltar
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default FeatureGate;
