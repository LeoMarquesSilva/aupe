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
  FormControlLabel,
  Switch,
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
  AssignmentInd as GestorLinkIcon,
} from '@mui/icons-material';
import * as TabsRadix from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase, clientService, postService } from '../services/supabaseClient';
import { Client, isApprovalStatus, normalizeApprovalStatus } from '../types';
import {
  listAllActiveApprovalLinks,
  listAllActiveInternalApprovalLinks,
  ActiveApprovalLinkWithClient,
  ActiveInternalApprovalLinkListItem,
  deleteApprovalLink,
  deleteInternalApprovalLink,
  getPostIdsInActiveLinks,
  getPostIdsInActiveInternalLinks,
} from '../services/approvalService';
import ApprovalRequestDialog from '../components/ApprovalRequestDialog';
import InternalApprovalLinkDialog from '../components/InternalApprovalLinkDialog';
import ApprovalUploadDrawer from '../components/ApprovalUploadDrawer';
import ApprovalKanban from '../components/ApprovalKanban';
import ApprovalPostDetailModal from '../components/ApprovalPostDetailModal';
import ApprovalEditDrawer from '../components/ApprovalEditDrawer';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';
import type { ApprovalKanbanPostInput } from '../components/ApprovalKanban';

export type { ApprovalKanbanPostInput };

type UnifiedActiveApprovalLinkRow =
  | { kind: 'client'; link: ActiveApprovalLinkWithClient }
  | { kind: 'gestor'; link: ActiveInternalApprovalLinkListItem };

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
  requires_internal_approval?: boolean;
  requiresInternalApproval?: boolean;
  internal_approval_status?: string | null;
  internalApprovalStatus?: string | null;
};

function isInternalApprovalReady(post: ScheduledPostRow): boolean {
  const req = post.requiresInternalApproval === true || post.requires_internal_approval === true;
  if (!req) return true;
  const st = post.internalApprovalStatus ?? post.internal_approval_status;
  return st === 'approved';
}

/** Post aguardando revisão do gestor (link interno). */
function needsInternalReview(post: ScheduledPostRow): boolean {
  const req = post.requiresInternalApproval === true || post.requires_internal_approval === true;
  if (!req) return false;
  const st = post.internalApprovalStatus ?? post.internal_approval_status;
  return st === 'pending' || st === null || st === '';
}

function isKanbanPublishedCompletedPost(p: ApprovalKanbanPostInput): boolean {
  if (normalizeApprovalStatus(p.approvalStatus) !== 'approved') return false;
  const s = String(p.status ?? '').toLowerCase();
  return s === 'posted' || s === 'published';
}

const ApprovalsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [posts, setPosts] = useState<ScheduledPostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [postIdsInActiveInternalLinks, setPostIdsInActiveInternalLinks] = useState<Set<string>>(new Set());
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [allApprovalPosts, setAllApprovalPosts] = useState<ApprovalKanbanPostInput[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState<ApprovalKanbanPostInput | null>(null);

  const [unifiedLinks, setUnifiedLinks] = useState<UnifiedActiveApprovalLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('step1');
  const [postIdsInActiveLinks, setPostIdsInActiveLinks] = useState<Set<string>>(new Set());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [postForEdit, setPostForEdit] = useState<ApprovalKanbanPostInput | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [statusClientId, setStatusClientId] = useState<string>('');
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanTypeFilter, setKanbanTypeFilter] = useState<string>('all');
  const [kanbanDateFilter, setKanbanDateFilter] = useState<string>('all');
  const [kanbanHidePublished, setKanbanHidePublished] = useState(() => {
    try {
      return localStorage.getItem('approvalsKanbanHidePublished') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('approvalsKanbanHidePublished', kanbanHidePublished ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, [kanbanHidePublished]);

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

  const refreshInternalLinkPostIds = useCallback(async () => {
    try {
      const ids = await getPostIdsInActiveInternalLinks();
      setPostIdsInActiveInternalLinks(ids);
    } catch {
      setError('Não foi possível atualizar os posts em links de revisão interna.');
    }
  }, []);

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
      const [clientData, internalData] = await Promise.all([
        listAllActiveApprovalLinks(),
        listAllActiveInternalApprovalLinks(),
      ]);
      const merged: UnifiedActiveApprovalLinkRow[] = [
        ...clientData.map((link) => ({ kind: 'client' as const, link })),
        ...internalData.map((link) => ({ kind: 'gestor' as const, link })),
      ].sort(
        (a, b) => new Date(b.link.createdAt).getTime() - new Date(a.link.createdAt).getTime()
      );
      setUnifiedLinks(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar links.');
      setUnifiedLinks([]);
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

  useEffect(() => {
    refreshInternalLinkPostIds();
  }, [refreshInternalLinkPostIds]);

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

  const kanbanPosts = statusClientId
    ? allApprovalPosts.filter((p) => p.clientId === statusClientId)
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

  const kanbanPostsForBoard = useMemo(() => {
    if (!kanbanHidePublished) return filteredKanbanPosts;
    return filteredKanbanPosts.filter((p) => !isKanbanPublishedCompletedPost(p));
  }, [filteredKanbanPosts, kanbanHidePublished]);

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
    refreshInternalLinkPostIds();
    fetchAllApprovalPosts();
  };

  const handleInternalDialogCreated = () => {
    setSelectedPostIds(new Set());
    fetchLinks();
    fetchClientPosts();
    refreshInternalLinkPostIds();
    fetchAllApprovalPosts();
  };

  const handleGoToLinksTab = () => {
    setActiveTab('links');
  };

  const linkRowId = (item: UnifiedActiveApprovalLinkRow) => `${item.kind}-${item.link.id}`;

  const handleCopy = async (item: UnifiedActiveApprovalLinkRow) => {
    try {
      await navigator.clipboard.writeText(item.link.url);
      setCopiedId(linkRowId(item));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  };

  const openLink = (item: UnifiedActiveApprovalLinkRow) => {
    window.open(item.link.url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteLink = async (item: UnifiedActiveApprovalLinkRow) => {
    if (item.kind === 'client') {
      const link = item.link;
      if (
        !window.confirm(
          `Excluir o link de aprovação para ${link.clientName}? Os posts vinculados deixarão de estar em "aguardando aprovação".`
        )
      )
        return;
    } else {
      const link = item.link;
      if (
        !window.confirm(
          `Excluir o link de revisão interna (${link.clientsSummary})? O gestor deixa de acessar este URL; os posts podem ser incluídos noutro link.`
        )
      )
        return;
    }
    setDeletingLinkId(linkRowId(item));
    setError(null);
    try {
      if (item.kind === 'client') {
        await deleteApprovalLink(item.link.id);
      } else {
        await deleteInternalApprovalLink(item.link.id);
      }
      await fetchLinks();
      await fetchAllApprovalPosts();
      await refreshActiveLinkPostIds();
      await refreshInternalLinkPostIds();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir link.');
    } finally {
      setDeletingLinkId(null);
    }
  };

  const pendingPosts = posts;
  const eligiblePosts = pendingPosts.filter(
    (post) => !postIdsInActiveLinks.has(post.id) && isInternalApprovalReady(post)
  );
  const gestorEligiblePosts = useMemo(
    () =>
      pendingPosts.filter(
        (post) =>
          needsInternalReview(post) &&
          !postIdsInActiveInternalLinks.has(post.id) &&
          !postIdsInActiveLinks.has(post.id)
      ),
    [pendingPosts, postIdsInActiveInternalLinks, postIdsInActiveLinks]
  );

  const selectedPosts = useMemo(
    () => pendingPosts.filter((p) => selectedPostIds.has(p.id)),
    [pendingPosts, selectedPostIds]
  );

  const canOpenGestorDialog = useMemo(
    () =>
      selectedPosts.length > 0 &&
      selectedPosts.every((p) => gestorEligiblePosts.some((g) => g.id === p.id)),
    [selectedPosts, gestorEligiblePosts]
  );

  const canOpenClientDialog = useMemo(
    () =>
      selectedPosts.length > 0 &&
      selectedPosts.every((p) => eligiblePosts.some((e) => e.id === p.id)),
    [selectedPosts, eligiblePosts]
  );

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
    color: GLASS.text.muted,
    fontWeight: 510,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'color 0.2s ease, border-color 0.2s ease',
    outline: 'none',
    '&:hover': { color: GLASS.text.heading },
    '&:focus-visible': {
      boxShadow: `inset 0 0 0 2px rgba(247, 66, 17,0.28)`,
      borderRadius: 1,
    },
    '&[data-state="active"]': {
      color: GLASS.accent.orange,
      borderBottomColor: GLASS.accent.orange,
    },
  };

  return (
    <>
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Box
            className="grain-overlay premium-header-bg"
            sx={{
              p: { xs: 2, md: 2.75 },
              borderRadius: GLASS.radius.card,
              border: `1px solid rgba(255, 255, 255, 0.18)`,
              boxShadow: '0 16px 38px -24px rgba(10, 15, 45, 0.8)',
              mb: 2.5,
            }}
          >
            <Typography
              variant="h4"
              className="premium-header-title"
              sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 0.5 }}
            >
              Aprovação
            </Typography>
            <Typography variant="body2" className="premium-header-subtitle">
              Gere links para o cliente aprovar ou solicitar ajustes. Acompanhe o status no quadro e gerencie os links ativos.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TabsRadix.Root value={activeTab} onValueChange={setActiveTab}>
            <Box
              sx={{
                borderBottom: `1px solid ${GLASS.border.outer}`,
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
          borderRadius: GLASS.radius.card,
          border: `1px solid ${GLASS.border.outer}`,
          bgcolor: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
          Passo 1 — Nova solicitação de aprovação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
                    <Typography component="span">
                      {client.name}
                    </Typography>
                    <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
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
                      primaryTypographyProps={{ variant: 'body1' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                    {isConnected ? (
                      <Chip
                        size="small"
                        color="success"
                        label="Conectado"
                        icon={<CheckCircleIcon />}
                        sx={{ ml: 1 }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        color="error"
                        label="Não conectado"
                        icon={<ErrorIcon />}
                        sx={{ ml: 1 }}
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
              sx={{ mb: 2, textTransform: 'none' }}
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
                    sx={{ textTransform: 'none' }}
                  >
                    Selecionar p/ cliente ({eligiblePosts.length})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={() => setSelectedPostIds(new Set(gestorEligiblePosts.map((p) => p.id)))}
                    disabled={gestorEligiblePosts.length === 0}
                    sx={{ textTransform: 'none' }}
                  >
                    Selecionar p/ gestor ({gestorEligiblePosts.length})
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedPostIds(new Set())}
                    disabled={selectedCount === 0}
                    sx={{ textTransform: 'none' }}
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
                    const isInActiveInternalLink = postIdsInActiveInternalLinks.has(post.id);
                    const internalReady = isInternalApprovalReady(post);
                    const needsGestor = needsInternalReview(post);
                    const canSelectForClient = !isInActiveLink && internalReady;
                    const canSelectForGestor =
                      needsGestor && !isInActiveInternalLink && !isInActiveLink;
                    const checkboxEnabled = canSelectForClient || canSelectForGestor;
                    const tooltipTitle = isInActiveLink
                      ? 'Este post já está em um link de aprovação ativo (cliente)'
                      : isInActiveInternalLink
                        ? 'Este post já está em um link de revisão interna ativo'
                        : !internalReady && !needsGestor
                          ? 'Pré-aprovação interna necessária ou status inválido para seleção.'
                          : !internalReady && needsGestor
                            ? ''
                            : '';
                    return (
                      <Grid item xs={12} sm={6} md={4} key={post.id}>
                        <Tooltip title={tooltipTitle}>
                          <Card
                            variant="outlined"
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'stretch',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              borderWidth: isSelected ? 2 : 1,
                              opacity: checkboxEnabled ? 1 : 0.6,
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => togglePost(post.id)}
                              disabled={!checkboxEnabled}
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
                            {isInActiveInternalLink && (
                              <Chip
                                label="Em link gestor"
                                size="small"
                                color="secondary"
                                sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }}
                              />
                            )}
                            {!internalReady && !isInActiveLink && needsGestor && (
                              <Chip
                                label="Aguardando gestor"
                                size="small"
                                color="secondary"
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
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<GestorLinkIcon />}
                    onClick={() => setInternalDialogOpen(true)}
                    disabled={!canOpenGestorDialog}
                    sx={{ textTransform: 'none' }}
                  >
                    Gerar link para o gestor {selectedCount > 0 ? `(${selectedCount})` : ''}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ThumbUpIcon />}
                    onClick={handleOpenDialog}
                    disabled={!canOpenClientDialog}
                    sx={{ textTransform: 'none' }}
                  >
                    Gerar link ao cliente {selectedCount > 0 ? `(${selectedCount})` : ''}
                  </Button>
                </Box>
                {selectedCount > 0 && !canOpenGestorDialog && !canOpenClientDialog && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Selecione apenas posts do mesmo tipo de link: todos para revisão do gestor, ou todos já liberados
                    para envio ao cliente.
                  </Typography>
                )}
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
            <Typography variant="subtitle1" fontWeight={600}>
              Status das aprovações
            </Typography>
            <Chip
              size="small"
              label={isRealtimeConnected ? 'Ao vivo' : 'Auto-atualiza'}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: isRealtimeConnected
                  ? alpha(theme.palette.success.main, 0.15)
                  : alpha(theme.palette.info.main, 0.12),
                color: isRealtimeConnected ? 'success.dark' : 'info.dark',
                '& .MuiChip-label': { px: 1 },
              }}
            />
            {statusClientId && (
              <Typography variant="body2" color="text.secondary">
                Filtrado por: {clients.find((c) => c.id === statusClientId)?.name ?? 'Cliente'}
              </Typography>
            )}
          </Box>
          <Tooltip title="Atualizar kanban">
            <IconButton
              size="small"
              onClick={() => fetchAllApprovalPosts()}
              disabled={kanbanLoading}
              aria-label="Atualizar status do kanban"
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
            borderRadius: GLASS.radius.inner,
            border: `1px solid ${GLASS.border.outer}`,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por cliente, legenda ou tipo"
              value={kanbanSearch}
              onChange={(e) => setKanbanSearch(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 260 }, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 }, flex: { xs: 1, sm: 'unset' } }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={statusClientId}
                label="Cliente"
                onChange={(e) => setStatusClientId(e.target.value)}
              >
                <MenuItem value="">Todos os clientes</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '48%', sm: 170 } }}>
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
            <FormControl size="small" sx={{ minWidth: { xs: '48%', sm: 170 } }}>
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
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={kanbanHidePublished}
                  onChange={(_, v) => setKanbanHidePublished(v)}
                />
              }
              label={<Typography variant="body2">Ocultar publicados</Typography>}
              sx={{ mr: 0, ml: 0 }}
            />
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setStatusClientId('');
                setKanbanSearch('');
                setKanbanTypeFilter('all');
                setKanbanDateFilter('all');
              }}
              sx={{ textTransform: 'none' }}
            >
              Limpar filtros
            </Button>
            <Chip
              size="small"
              label={`Exibindo ${kanbanPostsForBoard.length} de ${kanbanPosts.length}`}
              sx={{ fontWeight: 510 }}
            />
          </Box>
        </Paper>
        <ApprovalKanban
          posts={kanbanPostsForBoard}
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
          <Typography variant="subtitle1" fontWeight={600}>
            Links de aprovação ativos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Links de cliente (aprovação externa) e de gestor (revisão interna) ativos; copie ou revogue quando precisar.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={async () => {
            await fetchLinks();
            await refreshActiveLinkPostIds();
            await refreshInternalLinkPostIds();
          }}
          size="small"
          disabled={linksLoading}
          sx={{ textTransform: 'none' }}
        >
          Atualizar
        </Button>
      </Box>

      {linksLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : unifiedLinks.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: GLASS.radius.card,
            border: `1px dashed ${GLASS.border.outer}`,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: GLASS.shadow.cardInset,
          }}
        >
          <ThumbUpIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Nenhum link ativo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gere um link para o <strong>cliente</strong> (Passo 1–2) ou um link para o <strong>gestor</strong> (revisão interna). Ambos aparecem aqui enquanto não expirarem.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: GLASS.radius.card,
            border: `1px solid ${GLASS.border.outer}`,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            overflowX: 'auto',
          }}
        >
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(247, 66, 17,0.06)' }}>
                {!isMobile && (
                  <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                {!isMobile && (
                  <TableCell sx={{ fontWeight: 600 }}>Rótulo</TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }}>Gerado em</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expira em</TableCell>
                {!isMobile && (
                  <TableCell sx={{ fontWeight: 600 }}>Criado por</TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unifiedLinks.map((item) => {
                const rid = linkRowId(item);
                const isGestor = item.kind === 'gestor';
                const link = item.link;
                const displayName = item.kind === 'gestor' ? item.link.clientsSummary : item.link.clientName;
                const gestorLink = item.kind === 'gestor' ? item.link : null;
                return (
                  <TableRow key={rid} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    {!isMobile && (
                      <TableCell>
                        <Chip
                          label={isGestor ? 'Gestor' : 'Cliente'}
                          size="small"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            ...(isGestor
                              ? {
                                  bgcolor: alpha(theme.palette.secondary.main, 0.18),
                                  color: theme.palette.secondary.dark,
                                  border: 'none',
                                }
                              : {
                                  bgcolor: 'rgba(247, 66, 17,0.1)',
                                  color: GLASS.accent.orangeDark,
                                  border: 'none',
                                }),
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {isMobile && (
                          <Chip
                            label={isGestor ? 'Gestor' : 'Cliente'}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              flexShrink: 0,
                              ...(isGestor
                                ? { bgcolor: alpha(theme.palette.secondary.main, 0.18), color: theme.palette.secondary.dark }
                                : { bgcolor: 'rgba(247, 66, 17,0.1)', color: GLASS.accent.orangeDark }),
                            }}
                          />
                        )}
                        <Avatar
                          src={link.clientPhotoUrl ?? undefined}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: alpha(theme.palette.secondary.main, 0.2),
                            fontSize: '0.875rem',
                          }}
                        >
                          {(displayName && displayName !== '—' ? displayName : '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {displayName}
                          </Typography>
                          {link.clientInstagram && (
                            <Typography variant="caption" color="text.secondary">
                              @{link.clientInstagram}
                            </Typography>
                          )}
                          {gestorLink && !isMobile && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {gestorLink.postCount} post{gestorLink.postCount !== 1 ? 's' : ''} · revisão interna
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {link.label ? (
                            <Chip label={link.label} size="small" sx={{ fontSize: '0.75rem', width: 'fit-content' }} />
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                          {gestorLink && (
                            <Typography variant="caption" color="text.secondary">
                              {gestorLink.postCount} post{gestorLink.postCount !== 1 ? 's' : ''}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    )}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">
                        {format(parseISO(link.createdAt), isMobile ? 'dd/MM' : "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(parseISO(link.expiresAt), isMobile ? 'dd/MM/yy' : "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </Typography>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {link.createdByLabel}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Tooltip title="Abrir link">
                        <IconButton size="small" onClick={() => openLink(item)} sx={{ color: GLASS.accent.orange }}>
                          <OpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={copiedId === rid ? 'Copiado!' : 'Copiar link'}>
                        <IconButton size="small" onClick={() => handleCopy(item)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir link">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteLink(item)}
                          disabled={deletingLinkId === rid}
                          color="error"
                        >
                          {deletingLinkId === rid ? (
                            <CircularProgress size={18} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
              </motion.div>
            </TabsRadix.Content>
          </TabsRadix.Root>
        </motion.div>
      </Container>

      <ApprovalRequestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        clientId={selectedClientId}
        postIds={Array.from(selectedPostIds)}
        onCreated={handleDialogCreated}
        onGoToLinks={handleGoToLinksTab}
      />

      <InternalApprovalLinkDialog
        open={internalDialogOpen}
        onClose={() => setInternalDialogOpen(false)}
        postIds={Array.from(selectedPostIds)}
        onCreated={handleInternalDialogCreated}
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
        onInternalApprovalSuccess={() => {
          fetchAllApprovalPosts();
          fetchClientPosts();
        }}
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
