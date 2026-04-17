import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAppShellLayout } from '../../contexts/AppShellLayoutContext';
import CheckIcon from '@mui/icons-material/Check';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
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
  planCode?: string;
  isContactOnly?: boolean;
};

type LandingPricingProps = {
  plans: LandingPlanCard[];
  loadingPlans: boolean;
  onSelectPlan: (planId: string) => void;
  /** Assinatura ativa/trial no app (`subscription_plans.id`), ex.: em /plans */
  currentSubscriptionPlanId?: string | null;
  /** Nome do plano vindo da subscription (fallback se o id não estiver na lista) */
  currentPlanName?: string | null;
};

/**
 * Tenta separar "R$ 178,00" em ["R$", "178,00"]. Retorna null quando não
 * reconhece — nesses casos (ex.: "A Consultar") renderizamos o valor inteiro
 * em tipografia destacada com cor sólida.
 */
function splitPrice(raw: string): { symbol: string; amount: string } | null {
  const match = raw.match(/^\s*(R\$)\s*(.+)\s*$/i);
  if (!match) return null;
  return { symbol: match[1], amount: match[2] };
}

function isIncludedApprovalFeature(feature: string): boolean {
  return /fluxo de aprova[cç][aã]o incluso/i.test(feature);
}

const CHECK_BG = 'rgba(247, 66, 17, 0.18)';
const CHECK_BG_LIGHT = 'rgba(247, 66, 17, 0.12)';

const LandingPricing: React.FC<LandingPricingProps> = ({
  plans,
  loadingPlans,
  onSelectPlan,
  currentSubscriptionPlanId = null,
  currentPlanName = null,
}) => {
  const { pathname } = useLocation();
  const shellLayout = useAppShellLayout();
  /** Página de planos dentro do AppShell (#f6f6f6) — sem faixa escura própria; cards claros como o restante do produto. */
  const isProductShell = pathname === '/plans';

  const planCardColumnWidth = (popular: boolean) => {
    if (!isProductShell) {
      return {
        xs: popular ? 'min(90vw, 340px)' : 'min(86vw, 300px)',
        sm: popular ? 320 : 290,
        md: popular ? 318 : 286,
      };
    }
    if (shellLayout.isMobileShell) {
      return {
        xs: popular ? 'min(calc(100vw - 28px), 340px)' : 'min(calc(100vw - 28px), 300px)',
        sm: popular ? 'clamp(268px, 86vw, 330px)' : 'clamp(248px, 82vw, 300px)',
      };
    }
    return {
      xs: popular ? 'min(calc(100vw - 24px), 340px)' : 'min(calc(100vw - 28px), 300px)',
      sm: popular ? 'clamp(268px, min(46%, 360px), 334px)' : 'clamp(248px, min(42%, 328px), 302px)',
      md: popular ? 'clamp(274px, min(34%, 400px), 340px)' : 'clamp(254px, min(30%, 368px), 308px)',
    };
  };

  const resolvedCurrentPlanName =
    (currentSubscriptionPlanId && plans.find((p) => p.id === currentSubscriptionPlanId)?.name) || currentPlanName || null;

  return (
  <Box
    component="section"
    id="precos"
    sx={{
      py: isProductShell ? { xs: 6, md: 8 } : { xs: 10, md: 16 },
      position: 'relative',
      overflow: 'visible',
      bgcolor: 'transparent',
      color: isProductShell ? 'text.primary' : '#fff',
      '@keyframes insytOrangeGlow': {
        '0%, 100%': { boxShadow: '0 20px 60px -10px rgba(247, 66, 17, 0.45), 0 0 0 1px rgba(247, 66, 17, 0.35) inset' },
        '50%':      { boxShadow: '0 26px 80px -10px rgba(247, 66, 17, 0.65), 0 0 0 1px rgba(247, 66, 17, 0.55) inset' },
      },
      '@keyframes insytOrangeGlowLight': {
        '0%, 100%': { boxShadow: '0 12px 36px -12px rgba(247, 66, 17, 0.35), 0 0 0 1px rgba(247, 66, 17, 0.2) inset' },
        '50%':      { boxShadow: '0 16px 44px -12px rgba(247, 66, 17, 0.45), 0 0 0 1px rgba(247, 66, 17, 0.28) inset' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '& .popular-card': { animation: 'none !important' },
      },
    }}
  >
    <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, overflow: 'visible' }}>
      {isProductShell ? (
        <Box
          sx={{
            maxWidth: 960,
            width: '100%',
            mx: 'auto',
            mb: { xs: 4, md: 6 },
            borderRadius: GLASS.radius.card,
            overflow: 'hidden',
            boxShadow: '0 20px 42px -28px rgba(10, 15, 45, 0.85)',
            border: `1px solid ${GLASS.border.outer}`,
          }}
        >
          <Box
            className="grain-overlay premium-header-bg"
            sx={{
              p: { xs: 3, sm: 3.75, md: 5 },
              textAlign: 'center',
              border: 'none',
              boxShadow: 'none',
              borderRadius: 0,
            }}
          >
            <Typography
              sx={{
                letterSpacing: '0.36em',
                fontSize: { xs: '0.72rem', md: '0.8rem' },
                fontWeight: 700,
                mb: { xs: 1.5, md: 2 },
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Preços
            </Typography>
            <Typography
              variant="h4"
              className="premium-header-title"
              sx={{
                fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                letterSpacing: '-0.03em',
                fontSize: { xs: '1.65rem', sm: '1.9rem', md: '2.35rem' },
                mb: { xs: 1.5, md: 2 },
                lineHeight: 1.15,
              }}
            >
              Planos para sua operação
            </Typography>
            <Typography
              variant="body2"
              className="premium-header-subtitle"
              sx={{
                maxWidth: 640,
                mx: 'auto',
                lineHeight: 1.65,
                fontSize: { xs: '0.95rem', sm: '1.02rem', md: '1.08rem' },
              }}
            >
              Escolha o plano certo para o seu momento. Aumente contas e volume de posts conforme cresce.
            </Typography>
          </Box>
          {resolvedCurrentPlanName && (
            <Box
              sx={{
                px: { xs: 3, sm: 3.75, md: 5 },
                py: { xs: 2.75, md: 3.25 },
                bgcolor: GLASS.surface.bg,
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.28)',
                boxShadow: 'inset 0 1px 0 rgba(10, 15, 45, 0.04)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  fontSize: { xs: '0.68rem', md: '0.72rem' },
                  display: 'block',
                }}
              >
                SEU PLANO ATUAL
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  mt: { xs: 1, md: 1.25 },
                  lineHeight: 1.25,
                  fontSize: { xs: '1.2rem', md: '1.45rem' },
                  fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                  letterSpacing: '-0.02em',
                }}
              >
                {resolvedCurrentPlanName}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box
          className="grain-overlay premium-header-bg"
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: GLASS.radius.card,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 16px 38px -24px rgba(10, 15, 45, 0.8)',
            mb: { xs: 5, md: 8 },
            textAlign: 'center',
            maxWidth: 880,
            mx: 'auto',
          }}
        >
          <Typography
            sx={{
              letterSpacing: '0.32em',
              fontSize: { xs: '0.72rem', md: '0.78rem' },
              fontWeight: 700,
              mb: 1.5,
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.88)',
            }}
          >
            Preços
          </Typography>
          <Typography
            variant="h4"
            className="premium-header-title"
            sx={{
              fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.1rem' },
              mb: 1.25,
              lineHeight: 1.2,
            }}
          >
            Planos para sua operação
          </Typography>
          <Typography
            variant="body2"
            className="premium-header-subtitle"
            sx={{
              maxWidth: 620,
              mx: 'auto',
              lineHeight: 1.65,
              fontSize: { xs: '0.9rem', md: '1rem' },
            }}
          >
            Escolha o plano certo para o seu momento. Aumente contas e volume de posts conforme cresce.
          </Typography>
        </Box>
      )}

      {loadingPlans ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress sx={{ color: INSYT_COLORS.primary }} />
          <Typography sx={{ color: isProductShell ? 'text.secondary' : INSYT_COLORS.gray400, mt: 2 }}>
            Carregando planos...
          </Typography>
        </Box>
      ) : plans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: isProductShell ? 'text.secondary' : INSYT_COLORS.gray400 }}>
            Nenhum plano disponível no momento.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            pt: { xs: 3, md: 6 },
            pb: { xs: 2, md: 6 },
            overflow: 'visible',
          }}
        >
          <Box
            role="region"
            aria-label="Planos disponíveis"
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'stretch',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              gap: { xs: 2, sm: 2.25, md: 2.75 },
              overflowX: 'auto',
              overflowY: 'visible',
              pt: { xs: 5, sm: 5.5, md: 6 },
              scrollSnapType: { xs: 'x mandatory', md: 'x proximity' },
              WebkitOverflowScrolling: 'touch',
              scrollbarGutter: 'stable',
              mx: isProductShell ? 0 : { xs: -1, sm: -1.5 },
              px: isProductShell ? 0 : { xs: 1, sm: 1.5 },
              pb: 2,
              transition: 'gap 0.2s ease-out',
              scrollbarWidth: 'thin',
              scrollbarColor: isProductShell
                ? `${GLASS.accent.orange} rgba(10, 15, 45, 0.14)`
                : `${GLASS.accent.orangeLight} rgba(255, 255, 255, 0.16)`,
              '&::-webkit-scrollbar': {
                height: 11,
              },
              '&::-webkit-scrollbar-track': {
                marginInline: { xs: '10px', sm: '14px', md: '18px' },
                background: isProductShell
                  ? 'linear-gradient(180deg, rgba(10, 15, 45, 0.09) 0%, rgba(10, 15, 45, 0.04) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)',
                borderRadius: 999,
                border: isProductShell
                  ? `1px solid ${GLASS.border.subtle}`
                  : '1px solid rgba(255, 255, 255, 0.14)',
              },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 999,
                background: `linear-gradient(90deg, ${GLASS.accent.orangeLight} 0%, ${GLASS.accent.orange} 38%, ${GLASS.accent.orangeDark} 100%)`,
                border: '2px solid rgba(255, 255, 255, 0.45)',
                boxShadow: '0 1px 4px rgba(247, 66, 17, 0.35)',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: `linear-gradient(90deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 100%)`,
                boxShadow: '0 2px 8px rgba(247, 66, 17, 0.45)',
              },
            }}
          >
            {plans.map((plan, index) => {
              const priceParts = splitPrice(plan.price);
              const isContact = Boolean(plan.isContactOnly);
              const isCurrentPlan = Boolean(
                currentSubscriptionPlanId && plan.id === currentSubscriptionPlanId
              );

              return (
                <Box
                  key={plan.id}
                  sx={{
                    flex: '0 0 auto',
                    width: planCardColumnWidth(plan.popular),
                    maxWidth: plan.popular ? 340 : 308,
                    scrollSnapAlign: 'center',
                    scrollSnapStop: { xs: 'always', md: 'normal' },
                    display: 'flex',
                    alignItems: 'stretch',
                    // Área extra só no card em destaque, para o badge não depender só do padding da faixa
                    pt: plan.popular ? { xs: 0.5, md: 0.5 } : 0,
                    overflow: 'visible',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    style={{ width: '100%', display: 'flex', alignItems: 'stretch' }}
                  >
                    <Card
                      className={plan.popular ? 'popular-card' : undefined}
                      sx={{
                        width: '100%',
                        minHeight: { xs: plan.popular ? 560 : 520, md: plan.popular ? 600 : 540 },
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'visible',
                        px: { xs: 3, md: plan.popular ? 4 : 3.25 },
                        py: { xs: 4, md: plan.popular ? 5 : 4 },
                        borderRadius: GLASS.radius.card,
                        backdropFilter: isProductShell ? 'none' : 'blur(14px)',
                        transformOrigin: 'center',
                        // Sem translateY no estado normal: faixa com overflow-x recorta o topo do card PRO + chip
                        transform: plan.popular
                          ? 'none'
                          : isProductShell
                            ? 'none'
                            : 'scale(0.99)',
                        background: isProductShell
                          ? plan.popular
                            ? 'linear-gradient(155deg, rgba(247,66,17,0.07) 0%, #ffffff 55%, #fafafa 100%)'
                            : GLASS.surface.bg
                          : plan.popular
                            ? 'linear-gradient(155deg, rgba(247,66,17,0.14) 0%, rgba(17,24,39,0.85) 55%, rgba(6,10,26,0.95) 100%)'
                            : 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        border: isProductShell
                          ? plan.popular
                            ? `2px solid ${GLASS.accent.orange}`
                            : `1px solid ${GLASS.border.outer}`
                          : plan.popular
                            ? `2px solid ${GLASS.accent.orange}`
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isProductShell
                          ? plan.popular
                            ? '0 8px 28px -8px rgba(247, 66, 17, 0.22), 0 1px 3px rgba(10, 15, 45, 0.06)'
                            : GLASS.shadow.card
                          : plan.popular
                            ? '0 22px 60px -10px rgba(247, 66, 17, 0.5), 0 0 0 1px rgba(247, 66, 17, 0.35) inset'
                            : '0 10px 30px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.04) inset',
                        opacity: plan.popular ? 1 : isProductShell ? 1 : 0.95,
                        zIndex: plan.popular ? 2 : 1,
                        animation: plan.popular
                          ? isProductShell
                            ? 'insytOrangeGlowLight 3s ease-in-out infinite alternate'
                            : 'insytOrangeGlow 3s ease-in-out infinite alternate'
                          : 'none',
                        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1), box-shadow 320ms ease-out, opacity 320ms ease-out',
                        '&:hover': {
                          opacity: 1,
                          transform: isProductShell
                            ? { xs: 'translateY(-3px)', md: plan.popular ? 'translateY(-4px)' : 'translateY(-3px)' }
                            : {
                                xs: 'translateY(-3px)',
                                md: plan.popular
                                  ? 'translateY(-4px) scale(1.01)'
                                  : 'translateY(-4px) scale(1)',
                              },
                          boxShadow: isProductShell
                            ? plan.popular
                              ? '0 14px 36px -10px rgba(247, 66, 17, 0.3), 0 1px 3px rgba(10, 15, 45, 0.08)'
                              : GLASS.shadow.cardHover
                            : plan.popular
                              ? '0 30px 80px -10px rgba(247, 66, 17, 0.65), 0 0 0 1px rgba(247, 66, 17, 0.5) inset'
                              : '0 18px 45px rgba(247, 66, 17, 0.18), 0 0 0 1px rgba(255,255,255,0.10) inset',
                        },
                      }}
                    >
                      {/* Badge "MAIS POPULAR" */}
                      {plan.popular && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: { xs: -12, sm: -13, md: -14 },
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 3,
                            maxWidth: 'calc(100% - 16px)',
                            display: 'flex',
                            justifyContent: 'center',
                          }}
                        >
                          <Chip
                            label="MAIS POPULAR"
                            size="small"
                            sx={{
                              backgroundColor: GLASS.accent.orange,
                              backgroundImage: 'none',
                              color: INSYT_COLORS.white,
                              fontWeight: 800,
                              fontSize: { xs: '0.62rem', sm: '0.68rem' },
                              letterSpacing: { xs: '0.12em', sm: '0.16em' },
                              height: { xs: 26, sm: 28 },
                              px: { xs: 1.25, sm: 1.5 },
                              boxShadow: '0 8px 20px rgba(247, 66, 17, 0.55)',
                              borderRadius: 999,
                              border: '1px solid rgba(255, 255, 255, 0.35)',
                              whiteSpace: 'normal',
                              textAlign: 'center',
                              '& .MuiChip-label': {
                                px: { xs: 1, sm: 1.25 },
                                lineHeight: 1.2,
                                whiteSpace: 'normal',
                              },
                            }}
                          />
                        </Box>
                      )}

                      {/* Nome + descrição */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="h4"
                          sx={{
                            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            mb: 0.75,
                            fontSize: plan.popular ? '1.85rem' : '1.55rem',
                            color: isProductShell
                              ? plan.popular
                                ? GLASS.accent.orangeDark
                                : INSYT_COLORS.gray900
                              : plan.popular
                                ? INSYT_COLORS.white
                                : INSYT_COLORS.gray100,
                          }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: isProductShell ? INSYT_COLORS.gray600 : INSYT_COLORS.gray400,
                            lineHeight: 1.5,
                            minHeight: 42,
                          }}
                        >
                          {plan.description}
                        </Typography>
                        {isCurrentPlan && (
                          <Chip
                            label="Plano atual"
                            size="small"
                            className={isProductShell ? undefined : 'premium-header-chip'}
                            sx={{
                              mt: 1.25,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              letterSpacing: '0.08em',
                              ...(isProductShell
                                ? {
                                    height: 24,
                                    color: GLASS.accent.orangeDark,
                                    bgcolor: 'rgba(247, 66, 17, 0.1)',
                                    border: `1px solid rgba(247, 66, 17, 0.35)`,
                                  }
                                : {}),
                            }}
                          />
                        )}
                      </Box>

                      <Divider
                        sx={{
                          flexShrink: 0,
                          alignSelf: 'stretch',
                          my: 0,
                          mb: 2.5,
                          borderColor: isProductShell ? GLASS.border.subtle : 'rgba(255, 255, 255, 0.14)',
                        }}
                      />

                      {/* Preço */}
                      <Box sx={{ mb: 3, minHeight: plan.popular ? 80 : 72 }}>
                        {priceParts ? (
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: isProductShell ? INSYT_COLORS.gray600 : INSYT_COLORS.gray400,
                              }}
                            >
                              {priceParts.symbol}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: { xs: plan.popular ? '2.65rem' : '2.25rem', md: plan.popular ? '3.1rem' : '2.6rem' },
                                fontWeight: 900,
                                lineHeight: 1,
                                fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                                fontVariantNumeric: 'tabular-nums',
                                color: isProductShell
                                  ? plan.popular
                                    ? GLASS.accent.orange
                                    : INSYT_COLORS.gray900
                                  : plan.popular
                                    ? INSYT_COLORS.white
                                    : 'rgba(255, 255, 255, 0.95)',
                              }}
                            >
                              {priceParts.amount}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: '0.95rem',
                                color: isProductShell ? INSYT_COLORS.gray600 : INSYT_COLORS.gray400,
                                ml: 0.5,
                              }}
                            >
                              {plan.period || '/mês'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: { xs: plan.popular ? '1.85rem' : '1.65rem', md: plan.popular ? '2.15rem' : '1.95rem' },
                              fontWeight: 900,
                              lineHeight: 1.2,
                              fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                              color: isProductShell
                                ? plan.popular
                                  ? GLASS.accent.orange
                                  : INSYT_COLORS.gray900
                                : plan.popular
                                  ? INSYT_COLORS.white
                                  : 'rgba(255, 255, 255, 0.95)',
                            }}
                          >
                            {plan.price}
                          </Typography>
                        )}
                      </Box>

                      <Divider
                        sx={{
                          flexShrink: 0,
                          alignSelf: 'stretch',
                          my: 0,
                          mb: 2.5,
                          borderColor: isProductShell ? GLASS.border.subtle : 'rgba(255, 255, 255, 0.12)',
                        }}
                      />

                      {/* Bullets */}
                      <Stack spacing={1.5} sx={{ mb: 3.5, flexGrow: 1 }}>
                        {plan.features.map((feature, idx) => {
                          const included = isIncludedApprovalFeature(feature);
                          return (
                            <Box
                              key={idx}
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.25,
                              }}
                            >
                              <Box
                                sx={{
                                  flexShrink: 0,
                                  width: 20,
                                  height: 20,
                                  mt: 0.25,
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: isProductShell ? CHECK_BG_LIGHT : CHECK_BG,
                                  border: `1px solid ${GLASS.accent.orange}`,
                                }}
                              >
                                <CheckIcon sx={{ fontSize: 13, color: GLASS.accent.orange }} />
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isProductShell ? INSYT_COLORS.gray700 : INSYT_COLORS.gray200,
                                  lineHeight: 1.55,
                                  fontSize: '0.9rem',
                                  flex: 1,
                                }}
                              >
                                {feature}
                                {included && (
                                  <Chip
                                    component="span"
                                    label="INCLUSO"
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      height: 18,
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      letterSpacing: '0.1em',
                                      color: GLASS.status.connected.color,
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: `1px solid ${GLASS.status.connected.color}`,
                                      borderRadius: '6px',
                                      '& .MuiChip-label': { px: 0.75 },
                                    }}
                                  />
                                )}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>

                      {/* CTA */}
                      <Button
                        fullWidth
                        disableElevation
                        disabled={isCurrentPlan}
                        onClick={() => onSelectPlan(plan.id)}
                        startIcon={isContact && !isCurrentPlan ? <WhatsAppIcon sx={{ fontSize: 18 }} /> : undefined}
                        sx={{
                          py: 1.5,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          letterSpacing: '0.01em',
                          transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
                          ...(isCurrentPlan
                            ? {
                                color: isProductShell ? 'text.disabled' : 'rgba(255,255,255,0.5)',
                                background: isProductShell ? GLASS.surface.bgHover : 'rgba(255,255,255,0.08)',
                                border: `1px solid ${isProductShell ? GLASS.border.subtle : 'rgba(255,255,255,0.12)'}`,
                                boxShadow: 'none',
                              }
                            : plan.popular
                            ? {
                                color: INSYT_COLORS.white,
                                background: INSYT_COLORS.gradientPrimary,
                                boxShadow: '0 14px 32px rgba(247, 66, 17, 0.45)',
                                border: '1px solid transparent',
                                '&:hover': {
                                  background: INSYT_COLORS.gradientPrimary,
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 20px 42px rgba(247, 66, 17, 0.58)',
                                },
                              }
                            : isContact
                              ? isProductShell
                                ? {
                                    color: GLASS.status.connected.color,
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: `1px solid ${GLASS.status.connected.color}`,
                                    '&:hover': {
                                      background: GLASS.status.connected.color,
                                      color: INSYT_COLORS.white,
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 12px 28px rgba(16, 185, 129, 0.35)',
                                    },
                                  }
                                : {
                                    color: INSYT_COLORS.white,
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: `1px solid ${GLASS.status.connected.color}`,
                                    '&:hover': {
                                      background: GLASS.status.connected.color,
                                      color: INSYT_COLORS.white,
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 12px 28px rgba(16, 185, 129, 0.35)',
                                    },
                                  }
                              : isProductShell
                                ? {
                                    color: GLASS.accent.orange,
                                    background: GLASS.surface.bg,
                                    border: `1px solid ${GLASS.border.outer}`,
                                    '&:hover': {
                                      background: 'rgba(247, 66, 17, 0.06)',
                                      borderColor: GLASS.accent.orange,
                                      color: GLASS.accent.orangeDark,
                                      transform: 'translateY(-2px)',
                                      boxShadow: GLASS.shadow.buttonHover,
                                    },
                                  }
                                : {
                                    color: INSYT_COLORS.white,
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                    '&:hover': {
                                      background: GLASS.accent.orange,
                                      borderColor: GLASS.accent.orange,
                                      color: INSYT_COLORS.white,
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 12px 26px rgba(247, 66, 17, 0.38)',
                                    },
                                  }),
                        }}
                      >
                        {isCurrentPlan ? 'Plano atual' : isContact ? 'Falar com vendas' : 'Escolher plano'}
                      </Button>
                    </Card>
                  </motion.div>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Container>
  </Box>
  );
};

export default LandingPricing;
