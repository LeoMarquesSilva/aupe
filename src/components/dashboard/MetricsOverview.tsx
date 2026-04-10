import React, { useMemo } from 'react';
import { Typography, Box, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  periodComparisons,
  previousPeriodValues,
  comparisonLabel
}) => {
  const period: Period = '30d';

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

  const items = [
    { title: 'Posts', value: filteredMetrics.totalPosts, change: periodComparisons?.posts || 0 },
    { title: 'Curtidas', value: filteredMetrics.totalLikes, change: periodComparisons?.likes || 0 },
    { title: 'Comentários', value: filteredMetrics.totalComments, change: periodComparisons?.comments || 0 },
    { title: 'Alcance', value: filteredMetrics.totalReach || 0, change: periodComparisons?.reach || 0 },
    { title: 'Engajamento', value: filteredMetrics.engagementRate, change: periodComparisons?.engagementRate || 0, isPercentage: true },
  ];

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        bgcolor: '#fff',
        border: '1px solid #e8eaed',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        p: { xs: 2, md: 2.5 },
        gap: 3,
        flexWrap: 'wrap',
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <Box key={i} sx={{ flex: 1, minWidth: 100 }}>
            <Skeleton variant="text" width={60} height={16} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={80} height={32} sx={{ mb: 0.5 }} />
            <Skeleton variant="rounded" width={56} height={18} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      bgcolor: '#fff',
      border: '1px solid #e8eaed',
      borderRadius: '14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {items.map((item, idx) => {
        const isPositive = item.change > 0;
        const isNeutral = item.change === 0;
        const changeColor = isNeutral ? '#9ca3af' : isPositive ? '#16a34a' : '#dc2626';
        const changeBg = isNeutral ? '#f3f4f6' : isPositive ? '#f0fdf4' : '#fef2f2';

        return (
          <Box
            key={item.title}
            sx={{
              flex: 1,
              minWidth: 0,
              px: { xs: 1.5, md: 2.5 },
              py: { xs: 2, md: 2.5 },
              borderRight: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <Typography sx={{
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#6b7280',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              mb: 0.75,
              lineHeight: 1,
            }}>
              {item.title}
            </Typography>

            <Typography sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 700,
              color: '#0a0f2d',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              mb: 1,
            }}>
              {item.isPercentage ? (
                `${item.value.toFixed(1)}%`
              ) : (
                <CountUp
                  end={typeof item.value === 'number' ? item.value : 0}
                  duration={1.2}
                  separator="."
                  decimals={0}
                />
              )}
            </Typography>

            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              px: 0.6,
              py: 0.2,
              borderRadius: '6px',
              bgcolor: changeBg,
            }}>
              {isNeutral ? (
                <Minus size={10} color={changeColor} strokeWidth={2.5} />
              ) : isPositive ? (
                <TrendingUp size={10} color={changeColor} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={10} color={changeColor} strokeWidth={2.5} />
              )}
              <Typography sx={{
                color: changeColor,
                fontWeight: 600,
                fontSize: '0.68rem',
                lineHeight: 1,
              }}>
                {isPositive ? '+' : ''}{item.change.toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default MetricsOverview;
