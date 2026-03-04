import React, { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Heart, 
  MessageCircle, 
  Image, 
  Users, 
  BarChart3 
} from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import CountUp from 'react-countup';
import { subDays, isAfter, parseISO } from 'date-fns';

const METRIC_COLORS = {
  posts:       { main: '#6366f1', light: '#eef2ff', dark: '#4338ca' },
  curtidas:    { main: '#d97706', light: '#fffbeb', dark: '#b45309' },
  comentarios: { main: '#7c3aed', light: '#f5f3ff', dark: '#6d28d9' },
  alcance:     { main: '#0891b2', light: '#ecfeff', dark: '#0e7490' },
  engajamento: { main: '#059669', light: '#ecfdf5', dark: '#047857' },
};

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
  previousPeriodValues?: {
    posts: number;
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  };
  comparisonLabel?: string;
}

type Period = '7d' | '30d' | '90d';

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ 
  metrics, 
  loading = false,
  onPeriodChange,
  periodComparisons,
  previousPeriodValues,
  comparisonLabel
}) => {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('30d');

  const filteredMetrics = useMemo(() => {
    if (!metrics.metricsByMonth || metrics.metricsByMonth.length === 0) {
      return metrics;
    }

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

    if (Math.abs(totals.posts - metrics.totalPosts) > 0 && metrics.totalPosts > 0) {
      return metrics;
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
      palette: METRIC_COLORS.posts,
      change: periodComparisons?.posts || 0,
      previousValue: previousPeriodValues?.posts,
      avgPerPost: null,
    },
    {
      title: 'Curtidas',
      value: filteredMetrics.totalLikes,
      icon: Heart,
      palette: METRIC_COLORS.curtidas,
      change: periodComparisons?.likes || 0,
      previousValue: previousPeriodValues?.likes,
      avgPerPost: filteredMetrics.totalPosts > 0 ? Math.round(filteredMetrics.totalLikes / filteredMetrics.totalPosts) : 0,
    },
    {
      title: 'Comentários',
      value: filteredMetrics.totalComments,
      icon: MessageCircle,
      palette: METRIC_COLORS.comentarios,
      change: periodComparisons?.comments || 0,
      previousValue: previousPeriodValues?.comments,
      avgPerPost: filteredMetrics.totalPosts > 0 ? +(filteredMetrics.totalComments / filteredMetrics.totalPosts).toFixed(1) : 0,
    },
    {
      title: 'Alcance',
      value: filteredMetrics.totalReach || 0,
      icon: Users,
      palette: METRIC_COLORS.alcance,
      change: periodComparisons?.reach || 0,
      previousValue: previousPeriodValues?.reach,
      avgPerPost: filteredMetrics.totalPosts > 0 && filteredMetrics.totalReach ? Math.round(filteredMetrics.totalReach / filteredMetrics.totalPosts) : 0,
    },
    {
      title: 'Engajamento',
      value: filteredMetrics.engagementRate,
      icon: BarChart3,
      palette: METRIC_COLORS.engajamento,
      change: periodComparisons?.engagementRate || 0,
      previousValue: previousPeriodValues?.engagementRate,
      isPercentage: true,
      avgPerPost: null,
    }
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        {cards.map((card, index) => (
          <MetricCard 
            key={card.title} 
            card={card} 
            loading={loading}
            index={index}
            comparisonLabel={comparisonLabel}
          />
        ))}
      </Grid>
    </Box>
  );
};

interface CardData {
  title: string;
  value: number;
  icon: React.FC<any>;
  palette: { main: string; light: string; dark: string };
  change: number;
  previousValue?: number;
  isPercentage?: boolean;
  avgPerPost?: number | null;
}

const MetricCard: React.FC<{
  card: CardData;
  loading: boolean;
  index: number;
  comparisonLabel?: string;
}> = ({ card, loading, index, comparisonLabel }) => {
  const [hovered, setHovered] = useState(false);
  const theme = useTheme();
  
  const cardAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(16px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: index * 60,
    config: { tension: 260, friction: 50 }
  });

  const flipAnimation = useSpring({
    rotateY: hovered ? 180 : 0,
    config: { tension: 280, friction: 28 }
  });

  const IconComponent = card.icon;
  const isPositive = card.change > 0;
  const isNeutral = card.change === 0;
  const changeColor = isNeutral ? theme.palette.text.disabled : isPositive ? '#059669' : '#dc2626';
  const changeBg = isNeutral ? alpha(theme.palette.text.disabled, 0.08) : isPositive ? '#ecfdf5' : '#fef2f2';

  const formattedValue = card.isPercentage 
    ? `${card.value.toFixed(1)}%` 
    : card.value;

  const previousFormatted = card.previousValue != null && card.previousValue > 0
    ? (card.isPercentage ? `${card.previousValue.toFixed(1)}%` : card.previousValue.toLocaleString('pt-BR'))
    : 'N/A';

  return (
    <Grid item xs={6} sm={6} md={4} lg>
      {loading ? (
        <Card sx={{ 
          height: 154,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="text" width={60} height={18} />
            </Box>
            <Skeleton variant="text" width="55%" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="75%" height={22} sx={{ borderRadius: 1 }} />
          </CardContent>
        </Card>
      ) : (
        <animated.div style={cardAnimation}>
          <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
              perspective: '1200px',
              height: 154,
              position: 'relative',
              width: '100%',
              cursor: 'pointer'
            }}
          >
            <animated.div
              style={{
                transform: flipAnimation.rotateY.to(ry => `perspective(1200px) rotateY(${ry}deg)`),
                transformStyle: 'preserve-3d',
                position: 'relative',
                width: '100%',
                height: '100%'
              }}
            >
              {/* Front */}
              <Box sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}>
                <Card sx={{ 
                  height: '100%',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: hovered ? alpha(card.palette.main, 0.35) : 'divider',
                  boxShadow: hovered 
                    ? `0 8px 25px -5px ${alpha(card.palette.main, 0.15)}` 
                    : `0 1px 3px ${alpha('#000', 0.04)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${card.palette.main}, ${card.palette.dark})`,
                    opacity: hovered ? 1 : 0.4,
                    transition: 'opacity 0.3s ease'
                  }} />

                  <CardContent sx={{ 
                    p: 2.5, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    '&:last-child': { pb: 2 }
                  }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box sx={{ 
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: card.palette.light,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'transform 0.3s ease',
                          transform: hovered ? 'scale(1.08)' : 'scale(1)'
                        }}>
                          <IconComponent size={18} color={card.palette.main} strokeWidth={2.2} />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            color: 'text.secondary',
                            fontSize: '0.8rem',
                            letterSpacing: '0.01em'
                          }}
                        >
                          {card.title}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 800, 
                          color: 'text.primary',
                          fontSize: { xs: '1.4rem', sm: '1.65rem' },
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em'
                        }}
                      >
                        {card.isPercentage ? (
                          formattedValue
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
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.75,
                    }}>
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.3,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1.5,
                        bgcolor: changeBg,
                      }}>
                        {isNeutral ? (
                          <Minus size={11} color={changeColor} strokeWidth={2.5} />
                        ) : isPositive ? (
                          <TrendingUp size={11} color={changeColor} strokeWidth={2.5} />
                        ) : (
                          <TrendingDown size={11} color={changeColor} strokeWidth={2.5} />
                        )}
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: changeColor, 
                            fontWeight: 700, 
                            fontSize: '0.7rem', 
                            lineHeight: 1 
                          }}
                        >
                          {isPositive ? '+' : ''}{card.change.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.disabled',
                          fontSize: '0.65rem', 
                          textTransform: 'capitalize', 
                          lineHeight: 1.2 
                        }}
                      >
                        {comparisonLabel || 'vs anterior'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Back */}
              <Box sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}>
                <Card sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${card.palette.main} 0%, ${card.palette.dark} 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  boxShadow: `0 8px 25px -5px ${alpha(card.palette.main, 0.35)}`
                }}>
                  <CardContent sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    '&:last-child': { pb: 2 }
                  }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>
                          {card.title}
                        </Typography>
                        <Box sx={{ 
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(255, 255, 255, 0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <IconComponent size={14} color="white" strokeWidth={2.2} />
                        </Box>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', fontSize: '1.5rem', lineHeight: 1 }}>
                        {card.isPercentage ? formattedValue : (
                          <CountUp 
                            end={typeof card.value === 'number' ? card.value : 0} 
                            duration={1.5} 
                            separator="." 
                            decimals={0}
                          />
                        )}
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      p: 1.25, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(4px)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isPositive ? <TrendingUp size={12} color="white" /> : <TrendingDown size={12} color="white" />}
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.72rem' }}>
                            {isPositive ? '+' : ''}{Math.abs(card.change).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.6rem', textTransform: 'capitalize' }}>
                          {comparisonLabel || 'vs anterior'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.62rem' }}>
                          Anterior
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.62rem' }}>
                          {previousFormatted}
                        </Typography>
                      </Box>
                      {card.avgPerPost != null && card.avgPerPost > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.62rem' }}>
                            Média/post
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.62rem' }}>
                            {typeof card.avgPerPost === 'number' ? card.avgPerPost.toLocaleString('pt-BR') : card.avgPerPost}
                          </Typography>
                        </Box>
                      )}
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
