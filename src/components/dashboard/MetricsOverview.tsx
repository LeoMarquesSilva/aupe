import React, { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Skeleton,
  useTheme
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  MessageCircle, 
  Image, 
  Users, 
  Eye, 
  BarChart3 
} from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import CountUp from 'react-countup';
import { subDays, isAfter, parseISO } from 'date-fns';

interface MetricsOverviewProps {
  metrics: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    engagementRate: number;
    totalReach?: number;
    totalImpressions?: number;
    metricsByMonth?: Array<{
      month: string;
      posts: number;
      likes: number;
      comments: number;
      reach?: number;
      impressions?: number;
    }>;
    // Dados adicionais para informações detalhadas
    engagementBreakdown?: {
      likes: number;
      comments: number;
      saved: number;
      shares: number;
      total: number;
    };
    postsByType?: Record<string, number>;
  };
  loading?: boolean;
  onPeriodChange?: (period: string) => void;
  periodComparisons?: {
    posts: number;
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  };
  // Valores absolutos do período anterior para comparação
  previousPeriodValues?: {
    posts: number;
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  };
}

type Period = '7d' | '30d' | '90d';

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ 
  metrics, 
  loading = false,
  onPeriodChange,
  periodComparisons,
  previousPeriodValues
}) => {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  
  // Calcular informações detalhadas para cada métrica
  const getDetailedInfo = (card: any) => {
    const changeValue = Math.abs(card.change);
    const isPositive = card.change > 0;
    
    switch (card.title) {
      case 'Posts':
        return {
          description: 'Total de publicações no período',
          trend: isPositive ? 'Aumento' : 'Redução',
          detail: `${changeValue.toFixed(1)}% ${isPositive ? 'a mais' : 'a menos'} que o período anterior`
        };
      case 'Curtidas':
        return {
          description: 'Total de curtidas recebidas',
          trend: isPositive ? 'Crescimento' : 'Queda',
          detail: `${changeValue.toFixed(1)}% ${isPositive ? 'mais' : 'menos'} engajamento`
        };
      case 'Comentários':
        return {
          description: 'Total de comentários recebidos',
          trend: isPositive ? 'Aumento' : 'Redução',
          detail: `${changeValue.toFixed(1)}% ${isPositive ? 'mais' : 'menos'} interação`
        };
      case 'Alcance':
        return {
          description: 'Pessoas que viram o conteúdo',
          trend: isPositive ? 'Expansão' : 'Contração',
          detail: `${changeValue.toFixed(1)}% ${isPositive ? 'maior' : 'menor'} alcance`
        };
      case 'Engajamento':
        return {
          description: 'Taxa de engajamento média',
          trend: isPositive ? 'Melhoria' : 'Declínio',
          detail: `${changeValue.toFixed(1)}% ${isPositive ? 'melhor' : 'pior'} performance`
        };
      default:
        return {
          description: 'Métrica de performance',
          trend: isPositive ? 'Positivo' : 'Negativo',
          detail: `${changeValue.toFixed(1)}% de variação`
        };
    }
  };
  
  // Se onPeriodChange for fornecido, usar período externo (controlado pelo pai)
  // Caso contrário, usar estado interno

  // Usar métricas diretamente - o filtro de período é aplicado no nível da página
  // Quando usado no SingleClientDashboard, os dados já vêm filtrados
  const filteredMetrics = useMemo(() => {
    // Se não há metricsByMonth, usar métricas diretamente (dados já filtrados)
    if (!metrics.metricsByMonth || metrics.metricsByMonth.length === 0) {
      return metrics;
    }

    // Se há metricsByMonth, aplicar filtro local (para quando usado independentemente)
    const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
    const cutoffDate = subDays(new Date(), days);

    const filtered = metrics.metricsByMonth.filter(item => {
      const itemDate = parseISO(item.month + '-01');
      return isAfter(itemDate, cutoffDate);
    });

    const totals = filtered.reduce((acc, item) => ({
      posts: acc.posts + (item.posts || 0),
      likes: acc.likes + (item.likes || 0),
      comments: acc.comments + (item.comments || 0),
      reach: acc.reach + (item.reach || 0),
      impressions: acc.impressions + (item.impressions || 0),
    }), { posts: 0, likes: 0, comments: 0, reach: 0, impressions: 0 });

    const engagementRate = totals.reach > 0 
      ? ((totals.likes + totals.comments) / totals.reach) * 100 
      : metrics.engagementRate;

    // Se os totais calculados são diferentes dos totais passados, significa que os dados já vêm filtrados
    // Nesse caso, usar os totais passados (mais precisos)
    if (Math.abs(totals.posts - metrics.totalPosts) > 0 && metrics.totalPosts > 0) {
      return metrics; // Dados já filtrados, usar diretamente
    }

    return {
      totalPosts: totals.posts || metrics.totalPosts,
      totalLikes: totals.likes || metrics.totalLikes,
      totalComments: totals.comments || metrics.totalComments,
      totalReach: totals.reach || metrics.totalReach,
      totalImpressions: totals.impressions || metrics.totalImpressions,
      engagementRate: engagementRate || metrics.engagementRate
    };
  }, [metrics, period]);

  const handlePeriodChange = (event: React.MouseEvent<HTMLElement>, newPeriod: Period | null) => {
    if (newPeriod) {
      setPeriod(newPeriod);
      onPeriodChange?.(newPeriod);
    }
  };

  const cards = [
    {
      title: 'Posts',
      value: filteredMetrics.totalPosts,
      icon: Image,
      color: theme.palette.primary.main,
      change: periodComparisons?.posts || 0,
      previousValue: previousPeriodValues?.posts,
      additionalInfo: metrics.postsByType
    },
    {
      title: 'Curtidas',
      value: filteredMetrics.totalLikes,
      icon: Heart,
      color: '#e91e63',
      change: periodComparisons?.likes || 0,
      previousValue: previousPeriodValues?.likes,
      avgPerPost: filteredMetrics.totalPosts > 0 ? (filteredMetrics.totalLikes / filteredMetrics.totalPosts).toFixed(0) : '0',
      saved: metrics.engagementBreakdown?.saved,
      shares: metrics.engagementBreakdown?.shares
    },
    {
      title: 'Comentários',
      value: filteredMetrics.totalComments,
      icon: MessageCircle,
      color: '#9c27b0',
      change: periodComparisons?.comments || 0,
      previousValue: previousPeriodValues?.comments,
      avgPerPost: filteredMetrics.totalPosts > 0 ? (filteredMetrics.totalComments / filteredMetrics.totalPosts).toFixed(1) : '0'
    },
    {
      title: 'Alcance',
      value: filteredMetrics.totalReach || 0,
      icon: Users,
      color: '#2196f3',
      change: periodComparisons?.reach || 0,
      previousValue: previousPeriodValues?.reach,
      avgPerPost: filteredMetrics.totalPosts > 0 && filteredMetrics.totalReach ? (filteredMetrics.totalReach / filteredMetrics.totalPosts).toFixed(0) : '0',
      impressions: filteredMetrics.totalImpressions
    },
    {
      title: 'Engajamento',
      value: `${filteredMetrics.engagementRate.toFixed(1)}%`,
      icon: BarChart3,
      color: '#4caf50',
      change: periodComparisons?.engagementRate || 0,
      previousValue: previousPeriodValues?.engagementRate,
      isPercentage: true,
      totalEngagement: metrics.engagementBreakdown?.total
    }
  ];

  return (
    <Box>
      {/* Cards */}
      <Grid 
        container 
        spacing={3}
        sx={{
          justifyContent: { xs: 'flex-start', lg: 'center' }
        }}
      >
        {cards.map((card, index) => (
          <MetricCard 
            key={index} 
            card={card} 
            loading={loading}
            index={index}
          />
        ))}
      </Grid>
    </Box>
  );
};

// Componente separado para o card individual
const MetricCard: React.FC<{
  card: any;
  loading: boolean;
  index: number;
}> = ({ card, loading, index }) => {
  // TODOS OS HOOKS DEVEM SER OS PRIMEIROS - ANTES DE QUALQUER OUTRA LÓGICA
  const [hovered, setHovered] = useState(false);
  const theme = useTheme();
  
  const cardAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: index * 50,
    config: { tension: 280, friction: 60 }
  });
  
  const hoverAnimation = useSpring({
    transform: hovered ? 'translateY(-2px)' : 'translateY(0px)',
    config: { tension: 300, friction: 30 }
  });

  const flipAnimation = useSpring({
    rotateY: hovered ? 180 : 0,
    config: { tension: 300, friction: 25 }
  });

  // Agora podemos usar variáveis e lógica
  const IconComponent = card.icon;

  // Renderização condicional dentro do JSX, não early return
  return (
    <Grid item xs={12} sm={6} md={4} lg={2}>
      {loading ? (
        <Card sx={{ 
          height: 160,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none'
        }}>
          <CardContent sx={{ p: 2.5 }}>
            <Skeleton variant="rectangular" width="100%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="50%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={14} />
          </CardContent>
        </Card>
      ) : (
        <animated.div style={cardAnimation}>
        <Box
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          sx={{
            perspective: '1000px',
            height: 160,
            position: 'relative',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <animated.div
            style={{
              transform: flipAnimation.rotateY.to(ry => `perspective(1000px) rotateY(${ry}deg)`),
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          >
            {/* Frente do Card */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: hovered ? card.color : 'divider',
                  boxShadow: 'none',
                  transition: 'border-color 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Header com ícone e valor */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700, 
                          color: 'text.primary',
                          fontSize: { xs: '1.5rem', sm: '1.75rem' },
                          lineHeight: 1.2,
                          mb: 0.5
                        }}
                      >
                        {card.isPercentage ? (
                          card.value
                        ) : (
                          <CountUp 
                            end={typeof card.value === 'number' ? card.value : 0} 
                            duration={1.5} 
                            separator="." 
                            decimals={0}
                          />
                        )}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        fontWeight={500}
                        sx={{ fontSize: '0.8125rem' }}
                      >
                        {card.title}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      bgcolor: `${card.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      ml: 1,
                      transition: 'all 0.3s ease',
                      transform: hovered ? 'scale(1.1)' : 'scale(1)'
                    }}>
                      <IconComponent size={20} color={card.color} />
                    </Box>
                  </Box>
                  
                  {/* Change indicator */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    mt: 2,
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}>
                    {card.change > 0 ? (
                      <TrendingUp size={14} color={theme.palette.success.main} />
                    ) : (
                      <TrendingDown size={14} color={theme.palette.error.main} />
                    )}
                    <Typography 
                      variant="caption" 
                      color={card.change > 0 ? 'success.main' : 'error.main'}
                      fontWeight={600}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ fontSize: '0.75rem' }}
                    >
                      vs anterior
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Verso do Card - Informações Detalhadas */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  bgcolor: card.color,
                  color: 'white',
                  border: 'none',
                  boxShadow: `0 8px 24px ${card.color}40`
                }}
              >
                <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Header do verso */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: 'white',
                          fontSize: '1rem'
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Box sx={{ 
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent size={16} color="white" />
                      </Box>
                    </Box>

                    {/* Valor principal */}
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700,
                        color: 'white',
                        mb: 1.5,
                        fontSize: '1.75rem'
                      }}
                    >
                      {card.isPercentage ? (
                        card.value
                      ) : (
                        <CountUp 
                          end={typeof card.value === 'number' ? card.value : 0} 
                          duration={1.5} 
                          separator="." 
                          decimals={0}
                        />
                      )}
                    </Typography>
                  </Box>

                  {/* Informações detalhadas */}
                  <Box>
                    {(() => {
                      // Calcular informações detalhadas
                      const changeValue = Math.abs(card.change);
                      const isPositive = card.change > 0;
                      const currentValue = typeof card.value === 'number' ? card.value : parseFloat(card.value.replace('%', '').replace('.', ''));
                      const previousValue = card.previousValue || 0;
                      
                      let details: { 
                        description: string; 
                        trend: string; 
                        detail: string;
                        additionalStats?: Array<{ label: string; value: string }>;
                      };
                      
                      switch (card.title) {
                        case 'Posts':
                          const postsByType = card.additionalInfo as Record<string, number> | undefined;
                          const topType = postsByType ? Object.entries(postsByType).sort((a, b) => b[1] - a[1])[0] : null;
                          details = {
                            description: 'Total de publicações no período',
                            trend: isPositive ? 'Aumento' : 'Redução',
                            detail: `${changeValue.toFixed(1)}% ${isPositive ? 'a mais' : 'a menos'} que o período anterior`,
                            additionalStats: [
                              { label: 'Período anterior', value: previousValue > 0 ? previousValue.toString() : 'N/A' },
                              ...(topType ? [{ label: 'Tipo mais usado', value: `${topType[0]}: ${topType[1]}` }] : [])
                            ]
                          };
                          break;
                        case 'Curtidas':
                          const avgLikes = card.avgPerPost || '0';
                          const saved = card.saved || 0;
                          const shares = card.shares || 0;
                          details = {
                            description: 'Total de curtidas recebidas',
                            trend: isPositive ? 'Crescimento' : 'Queda',
                            detail: `${changeValue.toFixed(1)}% ${isPositive ? 'mais' : 'menos'} engajamento`,
                            additionalStats: [
                              { label: 'Média por post', value: `${avgLikes} curtidas` },
                              { label: 'Período anterior', value: previousValue > 0 ? previousValue.toLocaleString('pt-BR') : 'N/A' },
                              ...(saved > 0 ? [{ label: 'Salvos', value: saved.toLocaleString('pt-BR') }] : []),
                              ...(shares > 0 ? [{ label: 'Compartilhamentos', value: shares.toLocaleString('pt-BR') }] : [])
                            ]
                          };
                          break;
                        case 'Comentários':
                          const avgComments = card.avgPerPost || '0';
                          details = {
                            description: 'Total de comentários recebidos',
                            trend: isPositive ? 'Aumento' : 'Redução',
                            detail: `${changeValue.toFixed(1)}% ${isPositive ? 'mais' : 'menos'} interação`,
                            additionalStats: [
                              { label: 'Média por post', value: `${avgComments} comentários` },
                              { label: 'Período anterior', value: previousValue > 0 ? previousValue.toLocaleString('pt-BR') : 'N/A' }
                            ]
                          };
                          break;
                        case 'Alcance':
                          const avgReach = card.avgPerPost || '0';
                          const impressions = card.impressions || 0;
                          details = {
                            description: 'Pessoas que viram o conteúdo',
                            trend: isPositive ? 'Expansão' : 'Contração',
                            detail: `${changeValue.toFixed(1)}% ${isPositive ? 'maior' : 'menor'} alcance`,
                            additionalStats: [
                              { label: 'Média por post', value: `${avgReach} pessoas` },
                              { label: 'Período anterior', value: previousValue > 0 ? previousValue.toLocaleString('pt-BR') : 'N/A' },
                              ...(impressions > 0 ? [{ label: 'Impressões totais', value: impressions.toLocaleString('pt-BR') }] : [])
                            ]
                          };
                          break;
                        case 'Engajamento':
                          const totalEngagement = card.totalEngagement || 0;
                          details = {
                            description: 'Taxa de engajamento média',
                            trend: isPositive ? 'Melhoria' : 'Declínio',
                            detail: `${changeValue.toFixed(1)}% ${isPositive ? 'melhor' : 'pior'} performance`,
                            additionalStats: [
                              { label: 'Período anterior', value: previousValue > 0 ? `${previousValue.toFixed(1)}%` : 'N/A' },
                              ...(totalEngagement > 0 ? [{ label: 'Engajamento total', value: totalEngagement.toLocaleString('pt-BR') }] : [])
                            ]
                          };
                          break;
                        default:
                          details = {
                            description: 'Métrica de performance',
                            trend: isPositive ? 'Positivo' : 'Negativo',
                            detail: `${changeValue.toFixed(1)}% de variação`
                          };
                      }
                      
                      return (
                        <>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.9)',
                              fontSize: '0.75rem',
                              display: 'block',
                              mb: 1.5,
                              lineHeight: 1.4
                            }}
                          >
                            {details.description}
                          </Typography>
                          
                          <Box sx={{ 
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(255, 255, 255, 0.15)',
                            mb: 1.5
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem', fontWeight: 500 }}>
                                Tendência
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {card.change > 0 ? (
                                  <TrendingUp size={14} color="white" />
                                ) : (
                                  <TrendingDown size={14} color="white" />
                                )}
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {details.trend}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '0.6875rem',
                                display: 'block',
                                lineHeight: 1.4,
                                mb: details.additionalStats && details.additionalStats.length > 0 ? 1 : 0
                              }}
                            >
                              {details.detail}
                            </Typography>

                            {/* Estatísticas adicionais */}
                            {details.additionalStats && details.additionalStats.length > 0 && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                {details.additionalStats.map((stat, idx) => (
                                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: 'rgba(255, 255, 255, 0.75)',
                                        fontSize: '0.625rem'
                                      }}
                                    >
                                      {stat.label}:
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.625rem'
                                      }}
                                    >
                                      {stat.value}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: 0.5,
                            mt: 1
                          }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.625rem',
                                textAlign: 'center'
                              }}
                            >
                              Comparado ao período anterior
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </animated.div>
        </Box>
      </animated.div>
      )}
    </Grid>
  );
};

export default MetricsOverview;