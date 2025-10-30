import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingDown, Visibility, People, ThumbUp, Bookmark, Share } from '@mui/icons-material';

interface ConversionFunnelProps {
  data: {
    impressions: number;
    reach: number;
    engagement: number;
    saves: number;
    shares: number;
  };
}

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ data }) => {
  const steps = [
    {
      name: 'Impressões',
      value: data.impressions,
      icon: <Visibility />,
      color: '#2e7d32',
      description: 'Total de visualizações'
    },
    {
      name: 'Alcance',
      value: data.reach,
      icon: <People />,
      color: '#1976d2',
      description: 'Pessoas únicas alcançadas'
    },
    {
      name: 'Engajamento',
      value: data.engagement,
      icon: <ThumbUp />,
      color: '#ed6c02',
      description: 'Curtidas + Comentários'
    },
    {
      name: 'Salvamentos',
      value: data.saves,
      icon: <Bookmark />,
      color: '#689f38',
      description: 'Conteúdo salvo'
    },
    {
      name: 'Compartilhamentos',
      value: data.shares,
      icon: <Share />,
      color: '#5e35b1',
      description: 'Conteúdo compartilhado'
    }
  ].filter(step => step.value > 0);

  const maxValue = Math.max(...steps.map(step => step.value));

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          🎯 Funil de Conversão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Taxa de conversão (indicador de conteúdo valioso)
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map((step, index) => {
            const percentage = (step.value / maxValue) * 100;
            const conversionRate = index > 0 ? ((step.value / steps[0].value) * 100) : 100;
            
            return (
              <Box key={step.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: step.color }}>
                      {step.icon}
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {step.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color={step.color}>
                      {step.value.toLocaleString('pt-BR')}
                    </Typography>
                    <Chip 
                      label={`${conversionRate.toFixed(1)}%`}
                      size="small"
                      color={conversionRate > 50 ? 'success' : conversionRate > 20 ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                {/* Barra de progresso do funil */}
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 40,
                    background: `linear-gradient(90deg, ${step.color}20 0%, ${step.color}10 100%)`,
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    border: `1px solid ${step.color}30`
                  }}
                >
                  <Box
                    sx={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${step.color} 0%, ${step.color}80 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      transition: 'width 0.8s ease-in-out'
                    }}
                  >
                    {step.description}
                  </Box>
                </Box>
                
                {/* Seta de conversão */}
                {index < steps.length - 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                    <TrendingDown sx={{ color: 'text.secondary', transform: 'rotate(0deg)' }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Resumo das taxas */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Resumo das Taxas de Conversão:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label={`Alcance: ${data.impressions > 0 ? ((data.reach / data.impressions) * 100).toFixed(1) : '0'}%`}
              size="small" 
              color="info"
            />
            <Chip 
              label={`Engajamento: ${data.reach > 0 ? ((data.engagement / data.reach) * 100).toFixed(1) : '0'}%`}
              size="small" 
              color="warning"
            />
            <Chip 
              label={`Salvamento: ${data.reach > 0 ? ((data.saves / data.reach) * 100).toFixed(1) : '0'}%`}
              size="small" 
              color="success"
            />
            <Chip 
              label={`Compartilhamento: ${data.reach > 0 ? ((data.shares / data.reach) * 100).toFixed(1) : '0'}%`}
              size="small" 
              color="secondary"
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ConversionFunnel;