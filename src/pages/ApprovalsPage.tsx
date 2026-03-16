import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  Button,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Badge,
  ListItemAvatar,
  ListItemText,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
  ThumbUp as ThumbUpIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Link as LinkIcon,
  ViewColumn as KanbanIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import * as TabsRadix from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase, clientService, postService } from '../services/supabaseClient';
import { Client, isApprovalStatus } from '../types';
import {
  listAllActiveApprovalLinks,
  ActiveApprovalLinkWithClient,
  deleteApprovalLink,
  getPostIdsInActiveLinks,
} from '../services/approvalService';
import ApprovalRequestDialog from '../components/ApprovalRequestDialog';
import ApprovalUploadDrawer from '../components/ApprovalUploadDrawer';
import ApprovalKanban from '../components/ApprovalKanban';
import ApprovalPostDetailModal from '../components/ApprovalPostDetailModal';
import ApprovalEditDrawer from '../components/ApprovalEditDrawer';
import type { ApprovalKanbanPostInput } from '../components/ApprovalKanban';

export type { ApprovalKanbanPostInput };

type ScheduledPostRow = {
  id: string;
  caption?: string;
  images?: (string | { url: string })[];
  scheduled_date?: string;
  scheduledDate?: string;
  status?: string;
  approval_status?: string;
  approvalStatus?: string;
  requires_approval?: boolean;
  requiresApproval?: boolean;
  for_approval_only?: boolean;
  forApprovalOnly?: boolean;
  post_type?: string;
  postType?: string;
  video?: string;
};

const ApprovalsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [posts, setPosts] = useState<ScheduledPostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [allApprovalPosts, setAllApprovalPosts] = useState<ApprovalKanbanPostInput[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState<ApprovalKanbanPostInput | null>(null);

  const [links, setLinks] = useState<ActiveApprovalLinkWithClient[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('step1');
  const [postIdsInActiveLinks, setPostIdsInActiveLinks] = useState<Set<string>>(new Set());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [postForEdit, setPostForEdit] = useState<ApprovalKanbanPostInput | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanTypeFilter, setKanbanTypeFilter] = useState<string>('all');
  const [kanbanDateFilter, setKanbanDateFilter] = useState<string>('all');

  const refreshActiveLinkPostIds = useCallback(async () => {
    if (!selectedClientId) {
      setPostIdsInActiveLinks(new Set());
      return;
    }
    try {
      const ids = await getPostIdsInActiveLinks(selectedClientId);
      setPostIdsInActiveLinks(ids);
    } catch {
      setError('Não foi possível atualizar os posts já vinculados a links ativos.');
    }
  }, [selectedClientId]);

  const fetchClients = useCallback(async () => {
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes.');
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    setLinksLoading(true);
    setError(null);
    try {
      const data = await listAllActiveApprovalLinks();
      setLinks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar links.');
      setLinks([]);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const fetchAllApprovalPosts = useCallback(async () => {
    setKanbanLoading(true);
    try {
      const data = await postService.getScheduledPostsWithClient();
      const list = (data || []) as (ApprovalKanbanPostInput & { clients?: Client })[];
      const filtered = list.filter(
        (p) =>
          (p.requiresApproval === true || p.forApprovalOnly === true) &&
          (!p.approvalStatus || isApprovalStatus(p.approvalStatus))
      );
      const withClient = filtered.map((p) => ({
        ...p,
        client: p.clients ?? p.client,
      })) as ApprovalKanbanPostInput[];
      setAllApprovalPosts(withClient);
    } catch {
      setAllApprovalPosts([]);
    } finally {
      setKanbanLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllApprovalPosts();
  }, [fetchAllApprovalPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('approval-kanban-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_posts' },
        () => { fetchAllApprovalPosts(); }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [fetchAllApprovalPosts]);

  // Polling fallback: silently refresh every 30s regardless of realtime
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllApprovalPosts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllApprovalPosts]);

  const kanbanPosts =
    selectedClientId
      ? allApprovalPosts.filter((p) => p.clientId === selectedClientId)
      : allApprovalPosts;

  const filteredKanbanPosts = useMemo(() => {
    const now = new Date();
    const search = kanbanSearch.trim().toLowerCase();

    return kanbanPosts.filter((post) => {
      const postType = post.postType ?? post.post_type ?? '';
      const dateRaw = post.scheduledDate ?? post.scheduled_date;
      const date = dateRaw ? new Date(dateRaw) : null;

      const matchesType = kanbanTypeFilter === 'all' || postType === kanbanTypeFilter;

      let matchesDate = true;
      if (kanbanDateFilter === 'today') {
        if (!date || Number.isNaN(date.getTime())) matchesDate = false;
        else {
          matchesDate =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        }
      } else if (kanbanDateFilter === 'next7') {
        if (!date || Number.isNaN(date.getTime())) matchesDate = false;
        else {
          const in7Days = new Date(now);
          in7Days.setDate(in7Days.getDate() + 7);
          matchesDate = date >= now && date <= in7Days;
        }
      } else if (kanbanDateFilter === 'overdue') {
        matchesDate = !!date && !Number.isNaN(date.getTime()) && date < now;
      } else if (kanbanDateFilter === 'no_date') {
        matchesDate = !dateRaw;
      }

      const clientName = post.client?.name?.toLowerCase() ?? '';
      const caption = post.caption?.toLowerCase() ?? '';
      const matchesSearch =
        !search ||
        caption.includes(search) ||
        clientName.includes(search) ||
        postType.toLowerCase().includes(search);

      return matchesType && matchesDate && matchesSearch;
    });
  }, [kanbanPosts, kanbanSearch, kanbanTypeFilter, kanbanDateFilter]);

  const fetchClientPosts = useCallback(() => {
    if (!selectedClientId) return;
    setPostsLoading(true);
    postService
      .getScheduledPostsByClient(selectedClientId)
      .then((data: any[]) => {
        const list = data || [];
        const pending = list.filter(
          (p) => p.status === 'pending' || (p as any).status === 'pending'
        );
        const eligible = pending.filter((p) => {
          const approvalStatus = (p.approvalStatus ?? p.approval_status) as string | undefined;
          return approvalStatus !== 'approved';
        });
        setPosts(eligible);
      })
      .catch(() => {
        setError('Não foi possível carregar os posts do cliente.');
        setPosts([]);
      })
      .finally(() => setPostsLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setPosts([]);
      setSelectedPostIds(new Set());
      setPostIdsInActiveLinks(new Set());
      return;
    }
    setSelectedPostIds(new Set());
    fetchClientPosts();
    refreshActiveLinkPostIds();
  }, [selectedClientId, fetchClientPosts, refreshActiveLinkPostIds]);

  useEffect(() => {
    // Keep selection valid when posts list changes.
    setSelectedPostIds((prev) => {
      const available = new Set(posts.map((p) => p.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (available.has(id)) next.add(id);
      });
      return next;
    });
  }, [posts]);

  const togglePost = (postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleDialogCreated = () => {
    fetchLinks();
    setSelectedPostIds(new Set());
    fetchClientPosts();
    refreshActiveLinkPostIds();
    fetchAllApprovalPosts();
  };

  const handleGoToLinksTab = () => {
    setActiveTab('links');
  };

  const handleCopy = async (link: ActiveApprovalLinkWithClient) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  };

  const openLink = (link: ActiveApprovalLinkWithClient) => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteLink = async (link: ActiveApprovalLinkWithClient) => {
    if (!window.confirm(`Excluir o link de aprovação para ${link.clientName}? Os posts vinculados deixarão de estar em "aguardando aprovação".`)) return;
    setDeletingLinkId(link.id);
    setError(null);
    try {
      await deleteApprovalLink(link.id);
      await fetchLinks();
      await fetchAllApprovalPosts();
      await refreshActiveLinkPostIds();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir link.');
    } finally {
      setDeletingLinkId(null);
    }
  };

  const pendingPosts = posts;
  const eligiblePosts = pendingPosts.filter((post) => !postIdsInActiveLinks.has(post.id));
  const selectedCount = selectedPostIds.size;

  const getPostImageUrl = (post: ScheduledPostRow) => {
    const arr = post.images ?? [];
    const first = arr[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url;
    return null;
  };

  const getPostTypeLabel = (post: ScheduledPostRow) => {
    const type = post.postType ?? post.post_type;
    if (type === 'reels' || post.video) return 'Reels';
    if (type === 'stories') return 'Story';
    if (Array.isArray(post.images) && post.images.length > 1) return 'Carrossel';
    return 'Post';
  };

  const getScheduledDate = (post: ScheduledPostRow) => {
    const raw = post.scheduledDate ?? post.scheduled_date;
    if (!raw) return '—';
    try {
      return format(new Date(raw), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '—';
    }
  };

  const tabTriggerSx = {
    flex: 1,
    minWidth: 0,
    py: 1.5,
    px: 2,
    border: 'none',
    borderBottom: '3px solid transparent',
    bgcolor: 'transparent',
    color: '#64748b',
    fontFamily: '"Poppins", sans-serif',
    fontWeight: 600,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'color 0.2s ease, border-color 0.2s ease',
    '&:hover': { color: '#1e293b' },
    '&[data-state="active"]': {
      color: '#10b981',
      borderBottomColor: '#10b981',
    },
  };

  return (
    <>
    <Box
      sx={{
        minHeight: '100%',
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${theme.palette.background.default} 12%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="xl" sx={{ py: 3, position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#1e293b',
              mb: 0.5,
            }}
          >
            Aprovação
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', mb: 3, color: '#64748b', fontSize: '0.875rem' }}>
            Gere links para o cliente aprovar ou solicitar ajustes. Acompanhe o status no quadro e gerencie os links ativos.
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TabsRadix.Root value={activeTab} onValueChange={setActiveTab}>
            <Box
              sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
                mb: 0,
              }}
            >
              <TabsRadix.List asChild>
                <Box
                  component="div"
                  sx={{
                    display: 'flex',
                    gap: 0,
                    width: '100%',
                    maxWidth: 560,
                  }}
                >
                  <TabsRadix.Trigger asChild value="step1">
                    <Box component="button" sx={tabTriggerSx} type="button">
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                        <SendIcon sx={{ fontSize: 18 }} />
                        Nova solicitação
                      </Box>
                    </Box>
                  </TabsRadix.Trigger>
                  <TabsRadix.Trigger asChild value="status">
                    <Box component="button" sx={tabTriggerSx} type="button">
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                        <KanbanIcon sx={{ fontSize: 18 }} />
                        Status
                      </Box>
                    </Box>
                  </TabsRadix.Trigger>
                  <TabsRadix.Trigger asChild value="links">
                    <Box component="button" sx={tabTriggerSx} type="button">
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                        <LinkIcon sx={{ fontSize: 18 }} />
                        Links ativos
                      </Box>
                    </Box>
                  </TabsRadix.Trigger>
                </Box>
              </TabsRadix.List>
            </Box>

            <TabsRadix.Content value="step1" style={{ outline: 'none' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
      {/* Passo 1: Enviar para aprovação */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5, fontFamily: '"Poppins", sans-serif' }}>
          Passo 1 — Nova solicitação de aprovação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: '"Poppins", sans-serif' }}>
          Envie os posts para aprovação: selecione o cliente e os posts e gere o link.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FormControl fullWidth size="small" sx={{ mb: 2, minWidth: 200, flex: 1 }} variant="outlined">
            <InputLabel id="approval-client-select-label">Cliente</InputLabel>
            <Select
              labelId="approval-client-select-label"
              value={selectedClientId}
              label="Cliente"
              onChange={(e) => setSelectedClientId(e.target.value)}
              renderValue={(selected) => {
                const client = clients.find((c) => c.id === selected);
                if (!client) return 'Selecione um cliente';
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      src={client.profilePicture || client.logoUrl}
                      alt={client.name}
                      sx={{ width: 24, height: 24, mr: 1 }}
                    >
                      {client.name.charAt(0)}
                    </Avatar>
                    <Typography component="span" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      {client.name}
                    </Typography>
                    <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem', fontFamily: '"Poppins", sans-serif' }}>
                      {client.instagram ? `@${client.instagram}` : ''}
                    </Typography>
                  </Box>
                );
              }}
            >
              <MenuItem value="">
                <em>Selecione um cliente</em>
              </MenuItem>
              {clients.map((client) => {
                const isConnected = !!(client.instagramAccountId && client.accessToken && client.username);
                return (
                  <MenuItem key={client.id} value={client.id}>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Badge
                        color={isConnected ? 'success' : 'error'}
                        variant="dot"
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar
                          src={client.profilePicture || client.logoUrl}
                          alt={client.name}
                          sx={{ width: 24, height: 24 }}
                        >
                          {client.name.charAt(0)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={client.name}
                      secondary={client.instagram ? `@${client.instagram}` : ''}
                      primaryTypographyProps={{ variant: 'body1', fontFamily: '"Poppins", sans-serif' }}
                      secondaryTypographyProps={{ variant: 'body2', fontFamily: '"Poppins", sans-serif' }}
                    />
                    {isConnected ? (
                      <Chip
                        size="small"
                        color="success"
                        label="Conectado"
                        icon={<CheckCircleIcon />}
                        sx={{ ml: 1, fontFamily: '"Poppins", sans-serif' }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        color="error"
                        label="Não conectado"
                        icon={<ErrorIcon />}
                        sx={{ ml: 1, fontFamily: '"Poppins", sans-serif' }}
                      />
                    )}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          {selectedClientId && (
            <Button
              variant="outlined"
              size="medium"
              onClick={() => setUploadDrawerOpen(true)}
              sx={{ mb: 2, fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
            >
              Adicionar conteúdo
            </Button>
          )}
        </Box>

        {selectedClientId && (
          <>
            {postsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : pendingPosts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Nenhum post pendente. Use &quot;Adicionar conteúdo&quot; para criar Post, Carrossel, Story ou Reels e enviar para aprovação.
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Selecione os posts que entrarão nesta solicitação:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSelectedPostIds(new Set(eligiblePosts.map((p) => p.id)))}
                    disabled={eligiblePosts.length === 0}
                    sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
                  >
                    Selecionar elegíveis ({eligiblePosts.length})
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedPostIds(new Set())}
                    disabled={selectedCount === 0}
                    sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
                  >
                    Limpar seleção
                  </Button>
                </Box>
                {eligiblePosts.length === 0 && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    Todos os posts pendentes deste cliente já estão em links ativos de aprovação.
                  </Alert>
                )}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {pendingPosts.map((post) => {
                    const imageUrl = getPostImageUrl(post);
                    const isSelected = selectedPostIds.has(post.id);
                    const isInActiveLink = postIdsInActiveLinks.has(post.id);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={post.id}>
                        <Tooltip title={isInActiveLink ? 'Este post já está em um link de aprovação ativo' : ''}>
                          <Card
                            variant="outlined"
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'stretch',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              borderWidth: isSelected ? 2 : 1,
                              opacity: isInActiveLink ? 0.6 : 1,
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => togglePost(post.id)}
                              disabled={isInActiveLink}
                              sx={{ alignSelf: 'center', py: 0 }}
                            />
                          {imageUrl ? (
                            <CardMedia
                              component="img"
                              sx={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }}
                              image={imageUrl}
                              alt=""
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'grey.200',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {post.video ? (
                                <VideoIcon fontSize="small" color="action" />
                              ) : (
                                <ImageIcon fontSize="small" color="action" />
                              )}
                            </Box>
                          )}
                          <CardContent sx={{ flex: 1, py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ScheduleIcon sx={{ fontSize: 12 }} />
                              {getScheduledDate(post)}
                            </Typography>
                            <Chip
                              label={getPostTypeLabel(post)}
                              size="small"
                              sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                fontSize: '0.75rem',
                              }}
                            >
                              {post.caption || 'Sem legenda'}
                            </Typography>
                            {isInActiveLink && (
                              <Chip
                                label="Já em link"
                                size="small"
                                sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }}
                              />
                            )}
                          </CardContent>
                        </Card>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
                <Button
                  variant="contained"
                  startIcon={<ThumbUpIcon />}
                  onClick={handleOpenDialog}
                  disabled={selectedCount === 0}
                  sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
                >
                  Gerar link de aprovação {selectedCount > 0 ? `(${selectedCount})` : ''}
                </Button>
              </>
            )}
          </>
        )}
      </Paper>
                </motion.div>
              </AnimatePresence>
            </TabsRadix.Content>

            <TabsRadix.Content value="status" style={{ outline: 'none' }}>
              <motion.div
                key="status"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
      <Box sx={{ pt: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
              Status das aprovações
            </Typography>
            <Chip
              size="small"
              label={isRealtimeConnected ? 'Ao vivo' : 'Auto-atualiza'}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 600,
                bgcolor: isRealtimeConnected
                  ? alpha(theme.palette.success.main, 0.15)
                  : alpha(theme.palette.info.main, 0.12),
                color: isRealtimeConnected ? 'success.dark' : 'info.dark',
                '& .MuiChip-label': { px: 1 },
              }}
            />
            {selectedClientId && (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                Filtrado por: {clients.find((c) => c.id === selectedClientId)?.name ?? 'Cliente'}
              </Typography>
            )}
          </Box>
          <Tooltip title="Atualizar kanban">
            <IconButton
              size="small"
              onClick={() => fetchAllApprovalPosts()}
              disabled={kanbanLoading}
              sx={{ color: 'text.secondary' }}
            >
              {kanbanLoading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por cliente, legenda ou tipo"
              value={kanbanSearch}
              onChange={(e) => setKanbanSearch(e.target.value)}
              sx={{ minWidth: 260, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={kanbanTypeFilter}
                label="Tipo"
                onChange={(e) => setKanbanTypeFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="post">Post</MenuItem>
                <MenuItem value="carousel">Carrossel</MenuItem>
                <MenuItem value="stories">Story</MenuItem>
                <MenuItem value="reels">Reel</MenuItem>
                <MenuItem value="roteiro">Roteiro</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={kanbanDateFilter}
                label="Período"
                onChange={(e) => setKanbanDateFilter(e.target.value)}
              >
                <MenuItem value="all">Todas as datas</MenuItem>
                <MenuItem value="today">Hoje</MenuItem>
                <MenuItem value="next7">Próximos 7 dias</MenuItem>
                <MenuItem value="overdue">Atrasados</MenuItem>
                <MenuItem value="no_date">Sem data</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setKanbanSearch('');
                setKanbanTypeFilter('all');
                setKanbanDateFilter('all');
              }}
              sx={{ textTransform: 'none', fontFamily: '"Poppins", sans-serif' }}
            >
              Limpar filtros
            </Button>
            <Chip
              size="small"
              label={`Exibindo ${filteredKanbanPosts.length} de ${kanbanPosts.length}`}
              sx={{ fontFamily: '"Poppins", sans-serif' }}
            />
          </Box>
        </Paper>
        <ApprovalKanban
          posts={filteredKanbanPosts}
          onCardClick={(post) => setSelectedPostForModal(post)}
          loading={kanbanLoading}
        />
      </Box>
              </motion.div>
            </TabsRadix.Content>

            <TabsRadix.Content value="links" style={{ outline: 'none' }}>
              <motion.div
                key="links"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
      <Box sx={{ pt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
            Links de aprovação ativos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
            Links já enviados; o cliente abre o link e aprova ou solicita alterações.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={async () => {
            await fetchLinks();
            await refreshActiveLinkPostIds();
          }}
          size="small"
          disabled={linksLoading}
          sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
        >
          Atualizar
        </Button>
      </Box>

      {linksLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : links.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <ThumbUpIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1 }} />
          <Typography variant="h6" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, mb: 0.5 }}>
            Nenhum link de aprovação ativo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
            No Passo 1 acima, selecione o cliente, marque os posts e clique em &quot;Gerar link de aprovação&quot;. Depois envie o link ao cliente (Passo 2).
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            overflow: 'hidden',
          }}
        >
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>Cliente</TableCell>
                {!isMobile && (
                  <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>Rótulo</TableCell>
                )}
                <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>Gerado em</TableCell>
                <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>Expira em</TableCell>
                {!isMobile && (
                  <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>Criado por</TableCell>
                )}
                <TableCell align="right" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={link.clientPhotoUrl ?? undefined}
                        imgProps={{ referrerPolicy: 'no-referrer' }}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: alpha(theme.palette.secondary.main, 0.2),
                          fontSize: '0.875rem',
                          fontFamily: '"Poppins", sans-serif',
                        }}
                      >
                        {link.clientName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                          {link.clientName}
                        </Typography>
                        {link.clientInstagram && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                            @{link.clientInstagram}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      {link.label ? (
                        <Chip label={link.label} size="small" sx={{ fontFamily: '"Poppins", sans-serif', fontSize: '0.75rem' }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      {format(parseISO(link.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      {format(parseISO(link.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Typography>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', color: 'text.secondary' }}>
                        {link.createdByLabel}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Tooltip title="Abrir link">
                      <IconButton size="small" onClick={() => openLink(link)} sx={{ color: theme.palette.primary.main }}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={copiedId === link.id ? 'Copiado!' : 'Copiar link'}>
                      <IconButton size="small" onClick={() => handleCopy(link)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir link">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLink(link)}
                        disabled={deletingLinkId === link.id}
                        color="error"
                      >
                        {deletingLinkId === link.id ? (
                          <CircularProgress size={18} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
              </motion.div>
            </TabsRadix.Content>
          </TabsRadix.Root>
        </motion.div>
      </Container>
    </Box>

      <ApprovalRequestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        clientId={selectedClientId}
        postIds={Array.from(selectedPostIds)}
        onCreated={handleDialogCreated}
        onGoToLinks={handleGoToLinksTab}
      />

      <ApprovalUploadDrawer
        open={uploadDrawerOpen}
        onClose={() => setUploadDrawerOpen(false)}
        clientId={selectedClientId}
        onSuccess={fetchClientPosts}
      />

      <ApprovalPostDetailModal
        open={!!selectedPostForModal}
        post={selectedPostForModal}
        onClose={() => setSelectedPostForModal(null)}
        onScheduleSuccess={fetchAllApprovalPosts}
        onRemoveFromApproval={fetchAllApprovalPosts}
        onDeletePost={fetchAllApprovalPosts}
        onEditRequest={() => {
          setPostForEdit(selectedPostForModal);
          setSelectedPostForModal(null);
          setEditDrawerOpen(true);
        }}
      />

      <ApprovalEditDrawer
        open={editDrawerOpen}
        post={postForEdit}
        onClose={() => { setEditDrawerOpen(false); setPostForEdit(null); }}
        onSaveSuccess={() => {
          setEditDrawerOpen(false);
          setPostForEdit(null);
          fetchAllApprovalPosts();
        }}
      />
    </>
  );
};

export { ApprovalsPage as default };
