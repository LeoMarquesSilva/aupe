import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Box,
  IconButton,
  Tooltip,
  TableSortLabel,
  Link
} from '@mui/material';
import {
  OpenInNew as OpenIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  PlayArrow as ReelsIcon,
  TrendingUp,
  Visibility,
  ThumbUp
} from '@mui/icons-material';

interface TopPost {
  id: string;
  type: string;
  reach: number;
  impressions: number;
  engagement: number;
  engagement_rate: number;
  thumbnail_url: string;
  permalink: string;
  caption: string;
  timestamp: string;
}

interface TopPerformingPostsProps {
  posts: TopPost[];
  title?: string;
  maxPosts?: number;
}

type SortField = 'engagement' | 'reach' | 'impressions' | 'engagement_rate';
type SortDirection = 'asc' | 'desc';

const TopPerformingPosts: React.FC<TopPerformingPostsProps> = ({ 
  posts, 
  title = "🏆 Top Performing Posts",
  maxPosts = 10 
}) => {
  const [sortField, setSortField] = useState<SortField>('engagement_rate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPosts = [...posts]
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    })
    .slice(0, maxPosts);

  const getMediaTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reels': return <ReelsIcon sx={{ color: '#e91e63' }} />;
      case 'vídeo': return <VideoIcon sx={{ color: '#ff9800' }} />;
      case 'carrossel': return <CarouselIcon sx={{ color: '#4caf50' }} />;
      default: return <ImageIcon sx={{ color: '#1976d2' }} />;
    }
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 10) return 'success';
    if (rate >= 5) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ordenado por engajamento, alcance ou impressões
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>Post</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'engagement'}
                    direction={sortField === 'engagement' ? sortDirection : 'desc'}
                    onClick={() => handleSort('engagement')}
                  >
                    Engajamento
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'reach'}
                    direction={sortField === 'reach' ? sortDirection : 'desc'}
                    onClick={() => handleSort('reach')}
                  >
                    Alcance
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'impressions'}
                    direction={sortField === 'impressions' ? sortDirection : 'desc'}
                    onClick={() => handleSort('impressions')}
                  >
                    Impressões
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'engagement_rate'}
                    direction={sortField === 'engagement_rate' ? sortDirection : 'desc'}
                    onClick={() => handleSort('engagement_rate')}
                  >
                    Taxa %
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Data</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPosts.map((post, index) => (
                <TableRow 
                  key={post.id}
                  sx={{ 
                    '&:hover': { backgroundColor: 'action.hover' },
                    backgroundColor: index < 3 ? 'success.light' : 'inherit',
                    opacity: index < 3 ? 0.1 : 1
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {index < 3 && (
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index === 0 ? 'warning' : index === 1 ? 'info' : 'success'}
                          sx={{ minWidth: 40 }}
                        />
                      )}
                      <Avatar
                        src={post.thumbnail_url}
                        variant="rounded"
                        sx={{ width: 48, height: 48 }}
                      >
                        {getMediaTypeIcon(post.type)}
                      </Avatar>
                      <Box sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {post.caption}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getMediaTypeIcon(post.type)}
                      <Typography variant="caption">
                        {post.type}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <ThumbUp sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight="bold">
                        {post.engagement.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Visibility sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {post.reach.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {post.impressions.toLocaleString('pt-BR')}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Chip
                      label={`${post.engagement_rate.toFixed(1)}%`}
                      size="small"
                      color={getEngagementColor(post.engagement_rate)}
                      icon={<TrendingUp />}
                    />
                  </TableCell>
                  
                  <TableCell align="center">
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(post.timestamp)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Tooltip title="Ver no Instagram">
                      <IconButton
                        size="small"
                        component={Link}
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Resumo estatístico */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Resumo dos Top Posts:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label={`Engajamento médio: ${Math.round(sortedPosts.reduce((sum, post) => sum + post.engagement, 0) / sortedPosts.length).toLocaleString('pt-BR')}`}
              size="small" 
              color="primary"
            />
            <Chip 
              label={`Taxa média: ${(sortedPosts.reduce((sum, post) => sum + post.engagement_rate, 0) / sortedPosts.length).toFixed(1)}%`}
              size="small" 
              color="success"
            />
            <Chip 
              label={`Melhor tipo: ${sortedPosts[0]?.type || 'N/A'}`}
              size="small" 
              color="warning"
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TopPerformingPosts;