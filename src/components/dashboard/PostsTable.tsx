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
  Instagram as InstagramIcon
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
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        {/* Header - Minimalista */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <InstagramIcon sx={{ color: '#E1306C', fontSize: 20 }} />
            <Typography variant="h6" fontWeight={600}>
              Posts do Instagram
            </Typography>
            <Chip 
              label={posts.length}
              size="small"
              sx={{ 
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: 'primary.main',
                color: 'white'
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Ordenado por:
            </Typography>
            <Chip 
              label={
                sortField === 'date' ? 'Data' :
                sortField === 'likes' ? 'Curtidas' :
                sortField === 'comments' ? 'Comentários' :
                sortField === 'reach' ? 'Alcance' :
                sortField === 'engagement' ? 'Engajamento' :
                'Taxa de Engajamento'
              }
              size="small"
              sx={{ 
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: 'action.selected',
                border: '1px solid',
                borderColor: 'divider'
              }}
            />
            <Chip 
              icon={sortOrder === 'desc' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingUpIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />}
              label={sortOrder === 'desc' ? '↓' : '↑'}
              size="small"
              sx={{ 
                height: 22,
                minWidth: 32,
                fontSize: '0.75rem',
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: 'divider'
              }}
            />
          </Box>
        </Box>
        
        {/* Table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 300,
                  py: 1.5
                }}>
                  Post
                </TableCell>
                
                <TableCell sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 120,
                  py: 1.5
                }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortOrder : 'desc'}
                    onClick={() => handleSort('date')}
                    sx={{
                      '& .MuiTableSortLabel-icon': {
                        opacity: sortField === 'date' ? 1 : 0.3,
                      },
                    }}
                  >
                    Data
                  </TableSortLabel>
                </TableCell>
                
                <TableCell sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 100,
                  py: 1.5
                }}>
                  Tipo
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 100,
                  py: 1.5
                }}>
                  <TableSortLabel
                    active={sortField === 'likes'}
                    direction={sortField === 'likes' ? sortOrder : 'desc'}
                    onClick={() => handleSort('likes')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        opacity: sortField === 'likes' ? 1 : 0.3,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                      <FavoriteIcon fontSize="small" sx={{ color: '#E91E63', fontSize: 16 }} />
                      <Typography component="span" variant="body2" fontWeight={600}>
                        Curtidas
                      </Typography>
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 120,
                  py: 1.5
                }}>
                  <TableSortLabel
                    active={sortField === 'comments'}
                    direction={sortField === 'comments' ? sortOrder : 'desc'}
                    onClick={() => handleSort('comments')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        opacity: sortField === 'comments' ? 1 : 0.3,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                      <CommentIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 16 }} />
                      <Typography component="span" variant="body2" fontWeight={600}>
                        Comentários
                      </Typography>
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 100,
                  py: 1.5
                }}>
                  <TableSortLabel
                    active={sortField === 'reach'}
                    direction={sortField === 'reach' ? sortOrder : 'desc'}
                    onClick={() => handleSort('reach')}
                    sx={{
                      flexDirection: 'row-reverse',
                      '& .MuiTableSortLabel-icon': {
                        opacity: sortField === 'reach' ? 1 : 0.3,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                      <ReachIcon fontSize="small" sx={{ color: 'info.main', fontSize: 16 }} />
                      <Typography component="span" variant="body2" fontWeight={600}>
                        Alcance
                      </Typography>
                    </Box>
                  </TableSortLabel>
                </TableCell>
                
                <TableCell align="right" sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 130,
                  py: 1.5
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <TableSortLabel
                      active={sortField === 'engagement'}
                      direction={sortField === 'engagement' ? sortOrder : 'desc'}
                      onClick={() => handleSort('engagement')}
                      sx={{
                        flexDirection: 'row-reverse',
                        '& .MuiTableSortLabel-icon': {
                          opacity: sortField === 'engagement' ? 1 : 0.3,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <TrendingUpIcon fontSize="small" sx={{ color: 'success.main', fontSize: 16 }} />
                        <Typography component="span" variant="body2" fontWeight={600}>
                          Engajamento
                        </Typography>
                      </Box>
                    </TableSortLabel>
                    <TableSortLabel
                      active={sortField === 'engagement_rate'}
                      direction={sortField === 'engagement_rate' ? sortOrder : 'desc'}
                      onClick={() => handleSort('engagement_rate')}
                      sx={{
                        flexDirection: 'row-reverse',
                        fontSize: '0.7rem',
                        '& .MuiTableSortLabel-icon': {
                          opacity: sortField === 'engagement_rate' ? 1 : 0.3,
                          fontSize: '0.875rem'
                        },
                      }}
                    >
                      <Typography component="span" variant="caption" fontWeight={500}>
                        Taxa %
                      </Typography>
                    </TableSortLabel>
                  </Box>
                </TableCell>
                
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  bgcolor: 'grey.50',
                  minWidth: 100,
                  py: 1.5
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
                          bgcolor: 'action.hover'
                        },
                        transition: 'background-color 0.2s ease',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {/* Post Preview */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{ 
                              width: 50, 
                              height: 50,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                          >
                            {(post.thumbnail_url || post.media_url) ? (
                              <Box
                                component="img"
                                src={post.thumbnail_url || post.media_url}
                                alt={post.caption}
                                sx={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : null}
                            {(!post.thumbnail_url && !post.media_url) && (
                              <Box sx={{ color: 'text.secondary' }}>
                                {getMediaTypeIcon(post)}
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.4,
                                mb: 0.25
                              }}
                            >
                              {post.caption && post.caption.length > 60 
                                ? `${post.caption.substring(0, 60)}...` 
                                : post.caption || 'Sem legenda'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {getMediaTypeIcon(post)}
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {getMediaTypeLabel(post)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Data */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {formatTimestamp(post.timestamp)}
                        </Typography>
                      </TableCell>

                      {/* Tipo - Removido, já está no preview */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          icon={getMediaTypeIcon(post)}
                          label={getMediaTypeLabel(post)}
                          size="small"
                          sx={{ 
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            bgcolor: alpha(getMediaTypeColor(post), 0.1),
                            color: getMediaTypeColor(post),
                            border: '1px solid',
                            borderColor: alpha(getMediaTypeColor(post), 0.3),
                            '& .MuiChip-icon': {
                              color: getMediaTypeColor(post),
                              fontSize: 14
                            }
                          }}
                        />
                      </TableCell>

                      {/* Curtidas */}
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <FavoriteIcon fontSize="small" sx={{ color: '#E91E63', fontSize: 16 }} />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {formatNumber(post.like_count || 0)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Comentários */}
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <CommentIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 16 }} />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {formatNumber(post.comments_count || 0)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Alcance */}
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <ReachIcon fontSize="small" sx={{ color: 'info.main', fontSize: 16 }} />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {reach > 0 ? formatNumber(reach) : '-'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Engajamento */}
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TrendingUpIcon fontSize="small" sx={{ color: getEngagementColor(engagementRate), fontSize: 16 }} />
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {formatNumber(totalEngagement)}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${engagementRate.toFixed(1)}%`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor: alpha(getEngagementColor(engagementRate), 0.1),
                              color: getEngagementColor(engagementRate),
                              border: '1px solid',
                              borderColor: alpha(getEngagementColor(engagementRate), 0.3)
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* Ações */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Ver detalhes">
                            <IconButton 
                              size="small" 
                              onClick={() => onViewDetails(post)}
                              sx={{ 
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                '&:hover': { 
                                  bgcolor: 'action.hover',
                                  borderColor: 'primary.main'
                                }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver no Instagram">
                            <IconButton 
                              size="small"
                              component="a"
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                '&:hover': { 
                                  bgcolor: 'action.hover',
                                  borderColor: '#E1306C'
                                }
                              }}
                            >
                              <InstagramIcon fontSize="small" sx={{ color: '#E1306C' }} />
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
          px: 2,
          py: 1.5, 
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={sortedPosts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            sx={{
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 0,
                paddingRight: 0,
                minHeight: 44
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
                fontWeight: 500
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