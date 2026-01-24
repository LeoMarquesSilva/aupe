import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Badge,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Paper
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  AddBox as PostAddIcon,
  AddPhotoAlternate as StoryAddIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  VideoLibrary as ReelsIcon,
  Schedule as ScheduleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { Client } from '../types';
import { InstagramProfile } from '../services/instagramMetricsService';
import { CacheStatus } from '../services/instagramCacheService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientHeaderProps {
  client: Client;
  profile: InstagramProfile | null;
  onCreatePost: () => void;
  onCreateStory: () => void;
  onCreateReels?: () => void;
  onViewCalendar: () => void;
  cacheStatus?: Omit<CacheStatus, 'clientId' | 'errorMessage'> | null;
  isStale?: boolean;
  formatTimeAgo?: (timestamp: string) => string;
  onForceRefresh?: () => void;
  syncInProgress?: boolean;
  postsStats?: {
    published: number;
    scheduled: number;
  };
  onExportPDF?: () => void;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({
  client,
  profile,
  onCreatePost,
  onCreateStory,
  onCreateReels,
  onViewCalendar,
  cacheStatus,
  isStale = false,
  formatTimeAgo,
  onForceRefresh,
  syncInProgress = false,
  postsStats,
  onExportPDF
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const hasInstagramAuth = client.accessToken && client.instagramAccountId;

  const defaultFormatTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: ptBR
    });
  };

  const getTimeAgo = (timestamp: Date) => {
    const dateStr = timestamp.toISOString();
    return formatTimeAgo ? formatTimeAgo(dateStr) : defaultFormatTimeAgo(dateStr);
  };

  // Função para obter a imagem do avatar - priorizar foto do Instagram
  const getAvatarImage = () => {
    // Priorizar a foto do perfil do Instagram
    if (profile?.profile_picture_url) {
      return profile.profile_picture_url;
    }
    // Fallback para profilePicture do cliente (salvo no banco)
    if (client.profilePicture) {
      return client.profilePicture;
    }
    // Último fallback para o logo do cliente
    return client.logoUrl;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3.5 },
        mb: 4,
        borderRadius: 3,
        background: cacheStatus && hasInstagramAuth
          ? isStale
            ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: cacheStatus && hasInstagramAuth
            ? isStale
              ? `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
              : `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
            : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main || theme.palette.primary.light})`,
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isTablet ? 'column' : 'row',
          alignItems: isTablet ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        {/* Seção do Cliente */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flex: 1 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            badgeContent={
              hasInstagramAuth ? (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: theme.palette.success.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.4)}`
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 14, color: 'white' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: theme.palette.error.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.4)}`
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                    !
                  </Typography>
                </Box>
              )
            }
          >
            <Avatar
              src={getAvatarImage()}
              alt={client.name}
              sx={{
                width: { xs: 56, md: 72 },
                height: { xs: 56, md: 72 },
                border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                bgcolor: theme.palette.primary.main,
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 600
              }}
            >
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
          </Badge>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.5rem', md: '1.75rem' },
                mb: 0.5,
                background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${theme.palette.primary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}
            >
              {client.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <InstagramIcon
                  sx={{
                    fontSize: 18,
                    color: theme.palette.primary.main
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    fontSize: '0.875rem'
                  }}
                >
                  @{client.instagram}
                </Typography>
              </Box>
              {profile && (
                <Chip
                  icon={<InstagramIcon sx={{ fontSize: 16 }} />}
                  label={`${profile.followers_count.toLocaleString('pt-BR')} seguidores`}
                  size="small"
                  sx={{
                    height: 28,
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.dark,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    '& .MuiChip-icon': {
                      color: theme.palette.success.main
                    }
                  }}
                />
              )}
            </Box>
            
            {/* Status do Cache e Estatísticas - Integrado */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {cacheStatus && hasInstagramAuth && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    background: isStale
                      ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)}, ${alpha(theme.palette.warning.main, 0.08)})`
                      : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)}, ${alpha(theme.palette.success.main, 0.08)})`,
                    border: `1px solid ${alpha(isStale ? theme.palette.warning.main : theme.palette.success.main, 0.3)}`,
                    boxShadow: `0 2px 8px ${alpha(isStale ? theme.palette.warning.main : theme.palette.success.main, 0.1)}`
                  }}
                >
                  {(cacheStatus.syncStatus === 'completed' || cacheStatus.syncStatus === 'in_progress') ? (
                    cacheStatus.syncStatus === 'completed' ? (
                      <CheckCircleOutlineIcon
                        sx={{
                          fontSize: 16,
                          color: isStale ? theme.palette.warning.main : theme.palette.success.main
                        }}
                      />
                    ) : (
                      <ScheduleIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
                    )
                  ) : cacheStatus.syncStatus === 'failed' ? (
                    <ErrorOutlineIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                  ) : (
                    <ScheduleIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: isStale ? theme.palette.warning.dark : theme.palette.success.dark
                    }}
                  >
                    {isStale ? 'Desatualizado' : 'Atualizado'} • {getTimeAgo(cacheStatus.lastFullSync)}
                  </Typography>
                  <Chip
                    label={`${cacheStatus.postsCount} posts`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: alpha(isStale ? theme.palette.warning.main : theme.palette.success.main, 0.2),
                      color: isStale ? theme.palette.warning.dark : theme.palette.success.dark,
                      border: `1px solid ${alpha(isStale ? theme.palette.warning.main : theme.palette.success.main, 0.4)}`
                    }}
                  />
                  {onForceRefresh && (
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={onForceRefresh}
                      disabled={syncInProgress}
                      sx={{
                        minWidth: 'auto',
                        px: 1,
                        py: 0.25,
                        fontSize: '0.7rem',
                        textTransform: 'none',
                        color: isStale ? theme.palette.warning.dark : theme.palette.success.dark,
                        '&:hover': {
                          bgcolor: alpha(isStale ? theme.palette.warning.main : theme.palette.success.main, 0.1)
                        }
                      }}
                    >
                      Atualizar
                    </Button>
                  )}
                </Box>
              )}
              
              {/* Estatísticas de Posts */}
              {postsStats && (postsStats.published > 0 || postsStats.scheduled > 0) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.06)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  {postsStats.published > 0 && (
                    <Chip
                      label={`${postsStats.published} publicados`}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.dark,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                      }}
                    />
                  )}
                  {postsStats.scheduled > 0 && (
                    <Chip
                      label={`${postsStats.scheduled} agendados`}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.info.main, 0.15),
                        color: theme.palette.info.dark,
                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Botões de Ação */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center'
          }}
        >
          <Button
            variant="contained"
            startIcon={<PostAddIcon />}
            onClick={onCreatePost}
            sx={{
              px: 3,
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
              }
            }}
          >
            Criar Post
          </Button>
          <Button
            variant="outlined"
            startIcon={<StoryAddIcon />}
            onClick={onCreateStory}
            sx={{
              px: 3,
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              borderWidth: 2,
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              transition: 'all 0.3s ease',
              '&:hover': {
                borderWidth: 2,
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
              }
            }}
          >
            Criar Story
          </Button>
          {onCreateReels && (
            <Button
              variant="outlined"
              startIcon={<ReelsIcon />}
              onClick={onCreateReels}
              sx={{
                px: 3,
                py: 1.25,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                borderWidth: 2,
                borderColor: alpha('#E91E63', 0.3),
                color: '#E91E63',
                bgcolor: alpha('#E91E63', 0.05),
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderWidth: 2,
                  borderColor: '#E91E63',
                  bgcolor: alpha('#E91E63', 0.1),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha('#E91E63', 0.2)}`
                }
              }}
            >
              Criar Reels
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={onViewCalendar}
            sx={{
              px: 3,
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              borderWidth: 2,
              borderColor: alpha(theme.palette.secondary.main || theme.palette.primary.main, 0.3),
              color: theme.palette.secondary.main || theme.palette.primary.main,
              bgcolor: alpha(theme.palette.secondary.main || theme.palette.primary.main, 0.05),
              transition: 'all 0.3s ease',
              '&:hover': {
                borderWidth: 2,
                borderColor: theme.palette.secondary.main || theme.palette.primary.main,
                bgcolor: alpha(theme.palette.secondary.main || theme.palette.primary.main, 0.1),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main || theme.palette.primary.main, 0.2)}`
              }
            }}
          >
            Calendário
          </Button>
          {onExportPDF && (
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={onExportPDF}
              sx={{
                px: 3,
                py: 1.25,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                borderWidth: 2,
                borderColor: alpha('#d32f2f', 0.3),
                color: '#d32f2f',
                bgcolor: alpha('#d32f2f', 0.05),
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderWidth: 2,
                  borderColor: '#d32f2f',
                  bgcolor: alpha('#d32f2f', 0.1),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha('#d32f2f', 0.2)}`
                }
              }}
            >
              Exportar PDF
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default ClientHeader;