import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  RemoveRedEye as ImpressionsIcon,
  People as ReachIcon,
  TouchApp as EngagementIcon,
  BookmarkBorder as SaveIcon,
  IosShare as ShareIcon,
} from '@mui/icons-material';

interface ConversionFunnelProps {
  data: {
    impressions: number;
    reach: number;
    engagement: number;
    saves: number;
    shares: number;
  };
}

const STEPS = [
  { key: 'impressions' as const, label: 'Impressões', icon: ImpressionsIcon, color: '#3b82f6' },
  { key: 'reach' as const, label: 'Alcance', icon: ReachIcon, color: '#8b5cf6' },
  { key: 'engagement' as const, label: 'Engajamento', icon: EngagementIcon, color: '#f59e0b' },
  { key: 'saves' as const, label: 'Salvamentos', icon: SaveIcon, color: '#10b981' },
  { key: 'shares' as const, label: 'Compartilhamentos', icon: ShareIcon, color: '#06b6d4' },
];

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
};

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ data }) => {
  const steps = STEPS
    .map(s => ({ ...s, value: data[s.key] }))
    .filter(s => s.value > 0);

  if (steps.length === 0) return null;

  const maxValue = steps[0].value;

  return (
    <Box sx={{
      bgcolor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        px: 2.5,
        py: 1.75,
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#3b82f6',
            flexShrink: 0,
          }} />
          <Typography sx={{
            fontWeight: 600,
            fontSize: '0.82rem',
            color: '#111827',
            letterSpacing: '-0.01em',
          }}>
            Funil de conversão
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.65rem', color: '#d1d5db', fontWeight: 500 }}>
          Impressão → Ação
        </Typography>
      </Box>

      {/* Funnel Steps */}
      <Box sx={{ flex: 1, px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {steps.map((step, idx) => {
          const barWidth = maxValue > 0 ? Math.max((step.value / maxValue) * 100, 4) : 0;
          const convRate = idx > 0 ? (step.value / steps[0].value) * 100 : 100;
          const dropRate = idx > 0 ? (1 - step.value / steps[idx - 1].value) * 100 : 0;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              {/* Drop indicator */}
              {idx > 0 && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.15,
                }}>
                  <Box sx={{
                    width: 1,
                    height: 8,
                    bgcolor: '#e5e7eb',
                  }} />
                  {dropRate > 0 && (
                    <Typography sx={{
                      fontSize: '0.58rem',
                      fontWeight: 600,
                      color: '#d1d5db',
                      ml: 0.75,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      -{dropRate.toFixed(0)}%
                    </Typography>
                  )}
                </Box>
              )}

              {/* Step Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                {/* Icon */}
                <Box sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  bgcolor: `${step.color}0A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon sx={{ fontSize: 15, color: step.color }} />
                </Box>

                {/* Bar + Label */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    mb: 0.4,
                  }}>
                    <Typography sx={{
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: '#6b7280',
                    }}>
                      {step.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                      <Typography sx={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#111827',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {formatNumber(step.value)}
                      </Typography>
                      {idx > 0 && (
                        <Typography sx={{
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          color: convRate >= 30 ? '#059669' : convRate >= 10 ? '#d97706' : '#ef4444',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {convRate.toFixed(1)}%
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{
                    width: '100%',
                    height: 4,
                    borderRadius: 2,
                    bgcolor: '#f3f4f6',
                    overflow: 'hidden',
                  }}>
                    <Box sx={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: step.color,
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </Box>
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {/* Footer Summary */}
      <Box sx={{
        px: 2.5,
        py: 1.5,
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        {[
          { label: 'Alcance', rate: data.impressions > 0 ? (data.reach / data.impressions) * 100 : 0, ok: 50 },
          { label: 'Eng.', rate: data.reach > 0 ? (data.engagement / data.reach) * 100 : 0, ok: 3 },
          { label: 'Salvamento', rate: data.reach > 0 ? (data.saves / data.reach) * 100 : 0, ok: 1 },
        ].filter(r => r.rate > 0 || data[r.label === 'Eng.' ? 'engagement' : r.label === 'Alcance' ? 'reach' : 'saves' as keyof typeof data] > 0).map(r => (
          <Box key={r.label} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 500 }}>
              {r.label}
            </Typography>
            <Typography sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: r.rate >= r.ok ? '#059669' : '#d97706',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {r.rate.toFixed(1)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ConversionFunnel;
