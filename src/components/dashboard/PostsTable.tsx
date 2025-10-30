import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  TableSortLabel
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  Movie as ReelsIcon,
  TrendingUp as TrendingUpIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Visibility as ReachIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { InstagramPost } from '../../services/instagramMetricsService';

type SortField = 'date' | 'likes' | 'comments' | 'reach' | 'engagement' | 'engagement_rate';
type SortOrder = 'asc' | 'desc';

interface PostsTableProps {
  posts: InstagramPost[];
  onViewDetails: (post: InstagramPost) => void;
  formatTimestamp: (timestamp: string) => string;
}

const PostsTable: React.FC<PostsTableProps> = ({ posts, onViewDetails, formatTimestamp }) => {
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setPage(0); // Reset to first page when sorting
  };

  const getMediaTypeIcon = (post: InstagramPost) => {
    if (post.media_product_type === 'REELS') {
      return <ReelsIcon sx={{ color: '#E91E63' }} />;
    }
    
    switch (post.media_type) {
      case 'IMAGE':
        return <ImageIcon sx={{ color: '#2196F3' }} />;
      case 'VIDEO':
        return <VideoIcon sx={{ color: '#FF9800' }} />;
      case 'CAROUSEL_ALBUM':
        return <CarouselIcon sx={{ color: '#9C27B0' }} />;
      default:
        return <ImageIcon sx={{ color: '#2196F3' }} />;
    }
  };

  const getMediaTypeLabel = (post: InstagramPost) => {
    if (post.media_product_type === 'REELS') {
      return 'Reels';
    }
    
    switch (post.media_type) {
      case 'IMAGE':
        return 'Imagem';
      case 'VIDEO':
        return 'Vídeo';
      case 'CAROUSEL_ALBUM':
        return 'Carrossel';
      default:
        return post.media_type;
    }
  };

  const getMediaTypeColor = (post: InstagramPost) => {
    if (post.media_product_type === 'REELS') {
      return '#E91E63';
    }
    
    switch (post.media_type) {
      case 'IMAGE':
        return '#2196F3';
      case 'VIDEO':
        return '#FF9800';
      case 'CAROUSEL_ALBUM':
        return '#9C27B0';
      default:
        return '#2196F3';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEngagementRate = (post: InstagramPost): number => {
    // Usar o engajamento calculado pelo instagramMetricsService
    if (post.engagement_rate) {
      return post.engagement_rate;
    }
    
    // Fallback: calcular baseado nos dados disponíveis
    const engagement = post.insights?.engagement || 
                     ((post.like_count || 0) + (post.comments_count || 0) + 
                      (post.insights?.saved || 0) + (post.insights?.shares || 0));
    const reach = post.insights?.reach || 0;
    
    return reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;
  };

  const getTotalEngagement = (post: InstagramPost): number => {
    // Usar o engajamento calculado pelo instagramMetricsService
    return post.insights?.engagement || 
           ((post.like_count || 0) + (post.comments_count || 0) + 
            (post.insights?.saved || 0) + (post.insights?.shares || 0));
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 6) return '#4CAF50'; // Verde - Excelente
    if (rate >= 3) return '#FF9800'; // Laranja - Bom
    if (rate >= 1) return '#FFC107'; // Amarelo - Regular
    return '#F44336'; // Vermelho - Baixo
  };

  // Função para ordenar os posts
  const sortedPosts = React.useMemo(() => {
    const postsToSort = [...posts];
    
    return postsToSort.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'likes':
          aValue = a.like_count || 0;
          bValue = b.like_count || 0;
          break;
        case 'comments':
          aValue = a.comments_count || 0;
          bValue = b.comments_count || 0;
          break;
        case 'reach':
          aValue = a.insights?.reach || 0;
          bValue = b.insights?.reach || 0;
          break;
        case 'engagement':
          aValue = getTotalEngagement(a);
          bValue = getTotalEngagement(b);
          break;
        case 'engagement_rate':
          aValue = getEngagementRate(a);
          bValue = getEngagementRate(b);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [posts, sortField, sortOrder]);

  return (
    <Grid item xs={12}>
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChartIcon sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  Posts do Instagram
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Análise detalhada de performance • Clique nos cabeçalhos para ordenar
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`Ordenado por: ${
                  sortField === 'date' ? 'Data' :
                  sortField === 'likes' ? 'Curtidas' :
                  sortField === 'comments' ? 'Comentários' :
                  sortField === 'reach' ? 'Alcance' :
                  sortField === 'engagement' ? 'Engajamento Total' :
                  'Taxa de Engajamento'
                } (${sortOrder === 'desc' ? 'Maior→Menor' : 'Menor→Maior'})`}
                size="small"
                sx={{ 
                  fontWeight: 'medium',
                  backgroundColor: theme.palette.secondary.main,
                  color: 'white',
                  '& .MuiChip-label': {
                    color: 'white'
                  }
                }}
              />
                  <Chip 
                    label={`${posts.length} posts`}
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      fontWeight: 'bold',
                      color: 'white',
                      borderColor: 'white',
                      '& .MuiChip-label': {
                        color: 'white'
                      }
                    }}
                  />
            </Box>
          </Box>
        </Box>
        
        {/* Table */}
        <TableContainer sx={{ maxHeight: 800 }}>
          <Table stickyHeader sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 300
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ImageIcon fontSize="small" />
                    Post
                  </Box>
                </TableCell>
                
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 120
                }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortOrder : 'desc'}
                    onClick={() => handleSort('date')}
                    sx={{
                      '& .MuiTableSortLabel-icon': {
                        color: `${theme.palette.primary.main} !important`,
                      },
                    }}
                  >
                    Data
                  </TableSortLabel>
                </TableCell>
                
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 100
                }}>
                  Tipo
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 100
                }}>
                  <TableSortLabel
                    active={sortField === 'likes'}
                    direction={sortField === 'likes' ? sortOrder : 'desc'}
                    onClick={() => handleSort('likes')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        color: `${theme.palette.error.main} !important`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FavoriteIcon fontSize="small" color="error" />
                      Curtidas
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 120
                }}>
                  <TableSortLabel
                    active={sortField === 'comments'}
                    direction={sortField === 'comments' ? sortOrder : 'desc'}
                    onClick={() => handleSort('comments')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        color: `${theme.palette.primary.main} !important`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CommentIcon fontSize="small" color="primary" />
                      Comentários
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 100
                }}>
                  <TableSortLabel
                    active={sortField === 'reach'}
                    direction={sortField === 'reach' ? sortOrder : 'desc'}
                    onClick={() => handleSort('reach')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        color: `${theme.palette.info.main} !important`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReachIcon fontSize="small" color="info" />
                      Alcance
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 130
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <TableSortLabel
                      active={sortField === 'engagement'}
                      direction={sortField === 'engagement' ? sortOrder : 'desc'}
                      onClick={() => handleSort('engagement')}
                      sx={{
                        flexDirection: 'row-reverse',
                        '& .MuiTableSortLabel-icon': {
                          color: `${theme.palette.success.main} !important`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon fontSize="small" color="success" />
                        Total
                      </Box>
                    </TableSortLabel>
                    <TableSortLabel
                      active={sortField === 'engagement_rate'}
                      direction={sortField === 'engagement_rate' ? sortOrder : 'desc'}
                      onClick={() => handleSort('engagement_rate')}
                      sx={{
                        flexDirection: 'row-reverse',
                        fontSize: '0.75rem',
                        '& .MuiTableSortLabel-icon': {
                          color: `${theme.palette.success.main} !important`,
                        },
                      }}
                    >
                      Taxa %
                    </TableSortLabel>
                  </Box>
                </TableCell>
                
                <TableCell align="center" sx={{ 
                  fontWeight: 'bold', 
                  background: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 120
                }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPosts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((post, index) => {
                  const engagementRate = getEngagementRate(post);
                  const totalEngagement = getTotalEngagement(post);
                  const reach = post.insights?.reach || 0;
                  
                  return (
                    <TableRow 
                      key={post.id}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.1)}`
                        },
                        transition: 'all 0.2s ease-in-out',
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                      }}
                    >
                      {/* Post Preview */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            variant="rounded"
                            src={post.thumbnail_url || post.media_url}
                            alt={post.caption}
                            sx={{ 
                              width: 60, 
                              height: 60,
                              border: `2px solid ${getMediaTypeColor(post)}`,
                              boxShadow: `0 2px 8px ${alpha(getMediaTypeColor(post), 0.3)}`
                            }}
                          >
                            {getMediaTypeIcon(post)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                                mb: 0.5
                              }}
                            >
                              {post.caption && post.caption.length > 80 
                                ? `${post.caption.substring(0, 80)}...` 
                                : post.caption || 'Sem legenda'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {post.id.substring(0, 15)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Data */}
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatTimestamp(post.timestamp)}
                        </Typography>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        <Chip 
                          icon={getMediaTypeIcon(post)}
                          label={getMediaTypeLabel(post)}
                          size="small"
                          sx={{ 
                            backgroundColor: alpha(getMediaTypeColor(post), 0.1),
                            color: getMediaTypeColor(post),
                            fontWeight: 'bold',
                            '& .MuiChip-icon': {
                              color: getMediaTypeColor(post)
                            }
                          }}
                        />
                      </TableCell>

                      {/* Curtidas */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <FavoriteIcon fontSize="small" sx={{ color: '#E91E63' }} />
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {formatNumber(post.like_count || 0)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Comentários */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <CommentIcon fontSize="small" color="primary" />
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {formatNumber(post.comments_count || 0)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Alcance */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <ReachIcon fontSize="small" color="info" />
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {reach > 0 ? formatNumber(reach) : '-'}
                          </Typography>
                        </Box>
                        {reach === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Estimado
                          </Typography>
                        )}
                      </TableCell>

                      {/* Engajamento */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TrendingUpIcon fontSize="small" sx={{ color: getEngagementColor(engagementRate) }} />
                            <Typography variant="body2" fontWeight="bold" color="text.primary">
                              {formatNumber(totalEngagement)}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${engagementRate}%`}
                            size="small"
                            sx={{
                              backgroundColor: alpha(getEngagementColor(engagementRate), 0.1),
                              color: getEngagementColor(engagementRate),
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              height: 20
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* Ações */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Ver detalhes" arrow>
                            <IconButton 
                              size="small" 
                              onClick={() => onViewDetails(post)}
                              sx={{ 
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { 
                                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              <VisibilityIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver no Instagram" arrow>
                            <IconButton 
                              size="small"
                              component="a"
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                '&:hover': { 
                                  backgroundColor: alpha(theme.palette.secondary.main, 0.2),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              <LinkIcon fontSize="small" color="secondary" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ 
          p: 2, 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8)
        }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedPosts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Posts por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            sx={{
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 0,
                paddingRight: 0
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontWeight: 'medium'
              }
            }}
          />
        </Box>

        {/* Empty State */}
        {posts.length === 0 && (
          <Box sx={{ 
            p: 6, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Box sx={{ 
              p: 3, 
              borderRadius: '50%', 
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }}>
              <ImageIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />
            </Box>
            <Typography variant="h6" color="text.secondary">
              Nenhum post encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Não há posts disponíveis para exibir no momento.
            </Typography>
          </Box>
        )}
      </Paper>
    </Grid>
  );
};

export default PostsTable;