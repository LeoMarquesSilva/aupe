import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileImage,
  FilePlus2,
  Film,
  Layers3,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  GlassCard,
  AvatarWithPresence,
  StatusBadge,
  MetricBlock,
  GrowthBadge,
  SparklineMini,
  ActionButton,
} from './glass';
import { GLASS, GlassStatus } from '../theme/glassTokens';

export type ClienteCardStatus = 'Conectado' | 'Desconectado';

interface ClienteCardPremiumProps {
  logo?: string;
  name: string;
  handle: string;
  agendados: number;
  publicados: number;
  status: ClienteCardStatus;
  isSelected?: boolean;
  engagementGrowth?: number;
  sparklineData?: number[];
  onOpen?: () => void;
  onOptimize?: () => void;
  onMenuAction?: (action: 'post' | 'story' | 'reel' | 'carousel') => void;
  onMoreActions?: (event: React.MouseEvent<HTMLElement>) => void;
  onContentMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  onViewScheduled?: () => void;
  onViewDashboard?: () => void;
}

function generateSparkline(current: number): number[] {
  const points = 7;
  const result: number[] = [];
  const base = Math.max(1, current * 0.4);
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend = base + (current - base) * progress;
    const noise = trend * 0.15 * Math.sin(i * 2.3 + current);
    result.push(Math.max(0, Math.round(trend + noise)));
  }
  result[points - 1] = current;
  return result;
}

const menuItems: Array<{
  id: 'post' | 'story' | 'reel' | 'carousel';
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
}> = [
  {
    id: 'post',
    title: 'Criar post',
    description: 'Feed e LinkedIn',
    icon: <FilePlus2 size={15} strokeWidth={1.8} />,
    iconBg: 'rgba(59, 130, 246, 0.08)',
    iconColor: '#3b82f6',
    iconBorder: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'story',
    title: 'Criar story',
    description: 'Stories e CTA',
    icon: <FileImage size={15} strokeWidth={1.8} />,
    iconBg: 'rgba(139, 92, 246, 0.08)',
    iconColor: '#8b5cf6',
    iconBorder: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'reel',
    title: 'Criar reel',
    description: 'Vídeo curto',
    icon: <Film size={15} strokeWidth={1.8} />,
    iconBg: 'rgba(244, 63, 94, 0.08)',
    iconColor: '#f43f5e',
    iconBorder: 'rgba(244, 63, 94, 0.15)',
  },
  {
    id: 'carousel',
    title: 'Criar carrossel',
    description: 'Sequência de slides',
    icon: <Layers3 size={15} strokeWidth={1.8} />,
    iconBg: 'rgba(99, 102, 241, 0.08)',
    iconColor: '#6366f1',
    iconBorder: 'rgba(99, 102, 241, 0.15)',
  },
];

const ClienteCardPremium: React.FC<ClienteCardPremiumProps> = ({
  logo,
  name,
  handle,
  agendados,
  publicados,
  status,
  isSelected = false,
  engagementGrowth,
  sparklineData,
  onOpen,
  onOptimize,
  onMenuAction,
  onMoreActions,
  onContentMenu,
  onViewScheduled,
  onViewDashboard,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const glassStatus: GlassStatus = status === 'Conectado' ? 'connected' : 'disconnected';

  const resolvedSparkline = useMemo(
    () => sparklineData && sparklineData.length >= 2 ? sparklineData : generateSparkline(agendados),
    [sparklineData, agendados],
  );

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <GlassCard
      status={glassStatus}
      isSelected={isSelected}
      sx={{ height: '100%' }}
    >
      {/* Header: Avatar + Identity + Actions */}
      <Box sx={{ p: { xs: `${GLASS.spacing.cardPaddingMobile}px`, sm: `${GLASS.spacing.cardPadding}px` }, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <AvatarWithPresence
            src={logo}
            alt={name}
            size={72}
            status={glassStatus}
            fallbackText={name}
          />

          <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
            <Typography
              sx={{
                fontSize: { xs: '1.15rem', sm: '1.3rem' },
                fontWeight: 750,
                color: GLASS.text.heading,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
              }}
            >
              {name}
            </Typography>

            <Typography
              sx={{
                fontSize: '0.8rem',
                color: GLASS.text.muted,
                mt: 0.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              @{handle || 'sem-handle'}
            </Typography>

            <Box sx={{ mt: 0.8 }}>
              <StatusBadge status={glassStatus} />
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMoreActions?.(e);
            }}
            aria-label="Mais ações"
            sx={{
              mt: 0.25,
              color: GLASS.text.muted,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
            }}
          >
            <MoreHorizontal size={20} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Box>

      {/* Metrics */}
      <Box
        sx={{
          flexGrow: 1,
          px: { xs: `${GLASS.spacing.cardPaddingMobile}px`, sm: `${GLASS.spacing.cardPadding}px` },
          pt: { xs: '20px', sm: '28px' },
          pb: { xs: '16px', sm: '24px' },
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: { xs: 2, sm: 4 } }}>
          <MetricBlock
            label="Agendados"
            value={agendados}
            icon={<CalendarDays size={18} strokeWidth={1.6} />}
            iconBg={GLASS.metric.scheduled.iconBg}
            iconColor={GLASS.metric.scheduled.iconColor}
            iconBorder={GLASS.metric.scheduled.iconBorder}
            hoverActionLabel="Ver agendados"
            onHoverAction={onViewScheduled}
          >
            <SparklineMini data={resolvedSparkline} color={GLASS.accent.blue} height={34} />
          </MetricBlock>

          <MetricBlock
            label="Publicados"
            value={publicados}
            icon={<CheckCircle2 size={18} strokeWidth={1.6} />}
            iconBg={GLASS.metric.published.iconBg}
            iconColor={GLASS.metric.published.iconColor}
            iconBorder={GLASS.metric.published.iconBorder}
            hoverActionLabel="Ver relatório"
            onHoverAction={onViewDashboard}
          >
            {engagementGrowth != null && (
              <GrowthBadge value={engagementGrowth} />
            )}
          </MetricBlock>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          px: { xs: `${GLASS.spacing.cardPaddingMobile}px`, sm: `${GLASS.spacing.cardPadding}px` },
          py: `${GLASS.spacing.md}px`,
          borderTop: `1px solid ${GLASS.border.subtle}`,
          bgcolor: GLASS.surface.bgFooter,
          borderRadius: `0 0 ${GLASS.radius.card} ${GLASS.radius.card}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {onOptimize && (
          <ActionButton
            glassVariant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onOptimize();
            }}
            startIcon={<Sparkles size={15} color={GLASS.accent.orangeLight} strokeWidth={2} />}
            sx={{ fontSize: '0.75rem', px: 1.8 }}
          >
            Otimizar Estratégia
          </ActionButton>
        )}

        <Box sx={{ flex: 1 }} />

        <Box ref={menuRef} sx={{ position: 'relative' }}>
          <ActionButton
            glassVariant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              if (onContentMenu) {
                onContentMenu(e);
              } else {
                setIsMenuOpen((prev) => !prev);
              }
            }}
            endIcon={
              <ChevronDown
                size={15}
                strokeWidth={2}
                style={{
                  transition: `transform ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                  transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            }
            sx={{ fontSize: '0.75rem' }}
          >
            Novo Conteúdo
          </ActionButton>

          {isMenuOpen && !onContentMenu && (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                bottom: '110%',
                zIndex: 50,
                width: 260,
                borderRadius: GLASS.radius.inner,
                bgcolor: GLASS.surface.bgStrong,
                backdropFilter: `blur(${GLASS.surface.blurStrong})`,
                WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
                border: `1px solid ${GLASS.border.outer}`,
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
                p: 0.75,
              }}
            >
              {menuItems.map((item) => (
                <Box
                  key={item.id}
                  component="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onMenuAction?.(item.id);
                    setIsMenuOpen(false);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                    width: '100%',
                    p: 1,
                    borderRadius: '12px',
                    border: 'none',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `background ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: item.iconBg,
                      border: `1px solid ${item.iconBorder}`,
                      color: item.iconColor,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 650, color: GLASS.text.heading, lineHeight: 1.2 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: GLASS.text.muted, lineHeight: 1.2 }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <ActionButton
          glassVariant="accent"
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.();
          }}
          startIcon={<CalendarDays size={15} strokeWidth={2} />}
          sx={{ fontSize: '0.75rem' }}
        >
          Calendário
        </ActionButton>
      </Box>
    </GlassCard>
  );
};

export default ClienteCardPremium;
