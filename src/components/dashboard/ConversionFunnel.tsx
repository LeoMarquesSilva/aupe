import React from 'react';
import { Paper, Typography, Box, Chip, alpha, useTheme } from '@mui/material';
import {
  RemoveRedEye as ImpressionsIcon,
  People as ReachIcon,
  TouchApp as EngagementIcon,
  BookmarkBorder as SaveIcon,
  Share as ShareIcon,
  ArrowDownward as ArrowDownIcon
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

const STEPS_CONFIG = [
  { key: 'impressions', name: 'Impressões', icon: <ImpressionsIcon />, color: '#2563eb', desc: 'Total de visualizações' },
  { key: 'reach', name: 'Alcance', icon: <ReachIcon />, color: '#7c3aed', desc: 'Pessoas únicas alcançadas' },
  { key: 'engagement', name: 'Engajamento', icon: <EngagementIcon />, color: '#d97706', desc: 'Curtidas + Comentários + Salvamentos + Compartilhamentos' },
  { key: 'saves', name: 'Salvamentos', icon: <SaveIcon />, color: '#059669', desc: 'Conteúdo salvo' },
  { key: 'shares', name: 'Compartilhamentos', icon: <ShareIcon />, color: '#0891b2', desc: 'Conteúdo compartilhado' },
] as const;

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ data }) => {
  const theme = useTheme();

  const steps = STEPS_CONFIG
    .map(cfg => ({ ...cfg, value: data[cfg.key] }))
    .filter(step => step.value > 0);

  if (steps.length === 0) return null;

  const maxValue = steps[0].value;

  const rates = {
    reach: data.impressions > 0 ? (data.reach / data.impressions) * 100 : 0,
    engagement: data.reach > 0 ? (data.engagement / data.reach) * 100 : 0,
    saves: data.reach > 0 ? (data.saves / data.reach) * 100 : 0,
    shares: data.reach > 0 ? (data.shares / data.reach) * 100 : 0,
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2.5, pb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
          Funil de Conversão
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
          Da impressão ao engajamento - taxa de conversão do conteúdo
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2.5 }}>
        {steps.map((step, index) => {
          const barWidth = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
          const conversionFromTop = index > 0 ? (step.value / steps[0].value) * 100 : 100;
          const dropFromPrev = index > 0 ? ((1 - step.value / steps[index - 1].value) * 100) : 0;

          return (
            <React.Fragment key={step.key}>
              {index > 0 && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.5,
                  gap: 0.75,
                }}>
                  <ArrowDownIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem', fontWeight: 600 }}>
                    -{dropFromPrev.toFixed(1)}%
                  </Typography>
                </Box>
              )}

              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
              }}>
                <Box sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: alpha(step.color, 0.08),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: step.color,
                  flexShrink: 0,
                  '& .MuiSvgIcon-root': { fontSize: 18 }
                }}>
                  {step.icon}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {step.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: step.color, fontSize: '0.9rem' }}>
                        {step.value.toLocaleString('pt-BR')}
                      </Typography>
                      {index > 0 && (
                        <Typography variant="caption" sx={{
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          color: conversionFromTop >= 50 ? '#059669' : conversionFromTop >= 10 ? '#d97706' : '#dc2626',
                        }}>
                          {conversionFromTop.toFixed(1)}%
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(step.color, 0.08),
                    overflow: 'hidden',
                  }}>
                    <Box sx={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: step.color,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </Box>
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {/* Summary */}
      <Box sx={{
        px: { xs: 2, md: 2.5 },
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.text.primary, 0.015),
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
      }}>
        {[
          { label: `Alcance ${rates.reach.toFixed(1)}%`, ok: rates.reach >= 50 },
          { label: `Engajamento ${rates.engagement.toFixed(1)}%`, ok: rates.engagement >= 3 },
          { label: `Salvamento ${rates.saves.toFixed(1)}%`, ok: rates.saves >= 1 },
          { label: `Compartilhamento ${rates.shares.toFixed(1)}%`, ok: rates.shares >= 0.5 },
        ].map(r => (
          <Chip
            key={r.label}
            label={r.label}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.68rem',
              fontWeight: 600,
              bgcolor: alpha(r.ok ? '#059669' : '#d97706', 0.08),
              color: r.ok ? '#059669' : '#d97706',
              border: '1px solid',
              borderColor: alpha(r.ok ? '#059669' : '#d97706', 0.2),
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default ConversionFunnel;
