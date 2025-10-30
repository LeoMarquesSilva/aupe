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
  };
  loading?: boolean;
  onPeriodChange?: (period: string) => void;
}

type Period = '7d' | '30d' | '90d';

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ 
  metrics, 
  loading = false,
  onPeriodChange 
}) => {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('30d');

  // Calcular métricas filtradas por período
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

    return {
      totalPosts: totals.posts,
      totalLikes: totals.likes,
      totalComments: totals.comments,
      totalReach: totals.reach,
      totalImpressions: totals.impressions,
      engagementRate
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
      change: Math.random() * 20 - 10 // Simulado
    },
    {
      title: 'Curtidas',
      value: filteredMetrics.totalLikes,
      icon: Heart,
      color: '#e91e63',
      change: Math.random() * 20 - 10
    },
    {
      title: 'Comentários',
      value: filteredMetrics.totalComments,
      icon: MessageCircle,
      color: '#9c27b0',
      change: Math.random() * 20 - 10
    },
    {
      title: 'Alcance',
      value: filteredMetrics.totalReach || 0,
      icon: Users,
      color: '#2196f3',
      change: Math.random() * 20 - 10
    },
    {
      title: 'Impressões',
      value: filteredMetrics.totalImpressions || 0,
      icon: Eye,
      color: '#00bcd4',
      change: Math.random() * 20 - 10
    },
    {
      title: 'Engajamento',
      value: `${filteredMetrics.engagementRate.toFixed(1)}%`,
      icon: BarChart3,
      color: '#4caf50',
      change: Math.random() * 20 - 10,
      isPercentage: true
    }
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h5" fontWeight="bold">
          Métricas de Performance
        </Typography>
        
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                }
              }
            }
          }}
        >
          <ToggleButton value="7d">7 dias</ToggleButton>
          <ToggleButton value="30d">30 dias</ToggleButton>
          <ToggleButton value="90d">90 dias</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Cards */}
      <Grid container spacing={3}>
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
  const theme = useTheme();
  const IconComponent = card.icon;
  
  // Animação com react-spring
  const cardAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: index * 100,
    config: { tension: 280, friction: 60 }
  });

  const [hovered, setHovered] = useState(false);
  
  const hoverAnimation = useSpring({
    transform: hovered ? 'translateY(-4px)' : 'translateY(0px)',
    boxShadow: hovered 
      ? `0 8px 25px ${card.color}25` 
      : '0 2px 10px rgba(0,0,0,0.1)',
    config: { tension: 300, friction: 30 }
  });

  if (loading) {
    return (
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <Card sx={{ height: 140 }}>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="rectangular" width="100%" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} />
          </CardContent>
        </Card>
      </Grid>
    );
  }

  return (
    <Grid item xs={12} sm={6} md={4} lg={2}>
      <animated.div style={cardAnimation}>
        <animated.div style={hoverAnimation}>
          <Card 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{ 
              height: 140,
              cursor: 'pointer',
              border: `1px solid ${card.color}20`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${card.color}, ${card.color}80)`,
              }
            }}
          >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: card.color, 
                      mb: 0.5,
                      fontSize: { xs: '1.5rem', sm: '1.75rem' }
                    }}
                  >
                    {card.isPercentage ? (
                      card.value
                    ) : (
                      <CountUp 
                        end={typeof card.value === 'number' ? card.value : 0} 
                        duration={1.5} 
                        separator="," 
                      />
                    )}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight={600}
                    sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    {card.title}
                  </Typography>
                </Box>
                
                <Avatar sx={{ 
                  backgroundColor: `${card.color}15`, 
                  color: card.color,
                  width: 40,
                  height: 40
                }}>
                  <IconComponent size={20} />
                </Avatar>
              </Box>
              
              {/* Change indicator */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                mt: 'auto'
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
                >
                  {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  vs anterior
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </animated.div>
      </animated.div>
    </Grid>
  );
};

export default MetricsOverview;