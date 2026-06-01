import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Badge as BadgeIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  PhotoSizeSelectActual as BackgroundIcon,
  Palette as PaletteIcon,
  RateReview as BriefIcon,
  Save as SaveIcon,
  ViewCarousel as CarouselIcon,
} from '@mui/icons-material';
import { Client, ClientBrandAsset, ClientBrandAssetType, ClientBrandKit, ImageStudioBrief, ImageStudioCreativePlan } from '../types';
import { clientService } from '../services/supabaseClient';
import { clientBrandAssetService } from '../services/clientBrandAssetService';
import { generateBrandImages } from '../services/openAiImageService';
import ClientManager from '../components/ClientManager';
import AppSnackbar from '../components/AppSnackbar';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

const assetLabels: Record<ClientBrandAssetType, string> = {
  logo: 'Logo principal',
  logo_dark: 'Logo escura',
  logo_light: 'Logo clara',
  reference: 'Referência',
  product: 'Produto',
  background: 'Fundo',
  template: 'Template',
};

const defaultBrief: ImageStudioBrief = {
  format: 'feed',
  platform: 'instagram',
  objective: 'brand',
  postType: 'single',
  topic: '',
  audience: '',
  offer: '',
  tone: 'Profissional, claro e comercial sem parecer genérico.',
  slideCount: 5,
  imageCount: 1,
  cta: 'Fale com a gente',
  inImageTextMode: 'short',
  notes: '',
};

function newEmptyKit(client?: Client): ClientBrandKit {
  return {
    clientId: client?.id || '',
    brandName: client?.name || '',
    instagramHandle: client?.instagram || '',
    visualStyle: client?.brandGuidelines || '',
    primaryColor: client?.brandPrimaryColor || '',
    secondaryColor: client?.brandSecondaryColor || '',
    fontBody: client?.brandFontNotes || '',
    toneOfVoice: '',
    audience: '',
    valueProposition: '',
    logoUsage: 'Usar a logo real preservada, preferencialmente em área de respiro, sem redesenhar.',
    promptGuardrails: 'Evitar marcas de terceiros, textos aleatórios, watermark e aparência de banco de imagem genérico.',
    assets: [],
    isActive: true,
  };
}

function countCompletedKitFields(kit: ClientBrandKit | null): number {
  if (!kit) return 0;
  const fields = [
    kit.brandName,
    kit.visualStyle,
    kit.primaryColor,
    kit.toneOfVoice,
    kit.audience,
    kit.valueProposition,
    kit.logoUsage,
  ];
  const hasLogo = kit.assets?.some((asset) => asset.assetType.startsWith('logo'));
  return fields.filter((v) => !!v?.trim()).length + (hasLogo ? 1 : 0);
}

const CreateBrandImage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [brandKitDialogOpen, setBrandKitDialogOpen] = useState(false);

  const [brandKit, setBrandKit] = useState<ClientBrandKit | null>(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [uploadingAssetType, setUploadingAssetType] = useState<ClientBrandAssetType | null>(null);

  const [brief, setBrief] = useState<ImageStudioBrief>(defaultBrief);
  const [quality, setQuality] = useState<string>('medium');
  const [generating, setGenerating] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState('');
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [creativePlan, setCreativePlan] = useState<ImageStudioCreativePlan | null>(null);

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const brandScore = countCompletedKitFields(brandKit);
  const brandProgress = Math.round((brandScore / 8) * 100);
  const logoAsset = brandKit?.assets?.find((asset) => asset.assetType === 'logo')
    || brandKit?.assets?.find((asset) => asset.assetType === 'logo_light')
    || brandKit?.assets?.find((asset) => asset.assetType === 'logo_dark');

  const identityReady = !!selectedClientId && !!brandKit && brandScore >= 4;
  const canGenerate =
    identityReady &&
    brief.topic.trim().length > 0 &&
    brief.audience.trim().length > 0 &&
    brief.cta.trim().length > 0;

  const shownAssetGroups = useMemo(
    () => ([
      ['logo', 'logo_light', 'logo_dark'],
      ['reference', 'product', 'background', 'template'],
    ] as ClientBrandAssetType[][]),
    [],
  );
  const expectedImageCount = useMemo(() => {
    if (brief.format === 'carousel') {
      return Math.max(2, brief.slideCount || 5);
    }
    return Math.min(4, Math.max(1, brief.imageCount || 1));
  }, [brief.format, brief.imageCount, brief.slideCount]);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  }, []);

  const patchKit = (patch: Partial<ClientBrandKit>) => {
    setBrandKit((prev) => ({ ...(prev || newEmptyKit(selectedClient)), ...patch, clientId: selectedClientId }));
  };

  const patchBrief = (patch: Partial<ImageStudioBrief>) => {
    setBrief((prev) => {
      const next = { ...prev, ...patch };
      if (patch.format) {
        const carousel = patch.format === 'carousel';
        next.postType = carousel ? 'carousel' : 'single';
        next.imageCount = carousel ? Math.max(2, next.slideCount || 5) : Math.min(4, Math.max(1, next.imageCount || 1));
      }
      if (patch.slideCount && next.format === 'carousel') {
        next.imageCount = patch.slideCount;
      }
      return next;
    });
  };

  const loadClients = useCallback(async () => {
    try {
      const list = await clientService.getClients();
      setClients(list);
      const fromUrl = searchParams.get('clientId');
      if (fromUrl && list.some((c) => c.id === fromUrl)) {
        setSelectedClientId(fromUrl);
      }
    } catch (e) {
      console.error(e);
      showNotification('Erro ao carregar clientes', 'error');
    }
  }, [searchParams, showNotification]);

  const loadBrandKit = useCallback(async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setKitLoading(true);
    try {
      const saved = await clientBrandAssetService.getBrandKit(clientId);
      setBrandKit(saved || newEmptyKit(client));
      setBrandKitDialogOpen(!saved);
      setBrief((prev) => ({
        ...prev,
        audience: prev.audience || saved?.audience || '',
        tone: saved?.toneOfVoice || prev.tone,
      }));
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Erro ao carregar Brand Kit', 'error');
      setBrandKit(newEmptyKit(client));
    } finally {
      setKitLoading(false);
    }
  }, [clients, showNotification]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!selectedClientId) {
      setBrandKit(null);
      return;
    }
    loadBrandKit(selectedClientId);
  }, [selectedClientId, loadBrandKit]);

  const handleSaveKit = async () => {
    if (!selectedClientId || !brandKit) {
      showNotification('Selecione um cliente antes de salvar o Brand Kit', 'warning');
      return;
    }
    setSavingKit(true);
    try {
      const saved = await clientBrandAssetService.saveBrandKit({ ...brandKit, clientId: selectedClientId });
      setBrandKit(saved);
      setBrandKitDialogOpen(false);
      const refreshed = await clientService.getClients();
      setClients(refreshed);
      showNotification('Brand Kit salvo', 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Erro ao salvar Brand Kit', 'error');
    } finally {
      setSavingKit(false);
    }
  };

  const ensureSavedKit = async (): Promise<ClientBrandKit> => {
    if (!selectedClientId || !brandKit) throw new Error('Selecione um cliente');
    if (brandKit.id) return brandKit;
    const saved = await clientBrandAssetService.saveBrandKit({ ...brandKit, clientId: selectedClientId });
    setBrandKit(saved);
    return saved;
  };

  const handleUploadAsset = async (assetType: ClientBrandAssetType, file: File | undefined) => {
    if (!file) return;
    setUploadingAssetType(assetType);
    try {
      const savedKit = await ensureSavedKit();
      const asset = await clientBrandAssetService.uploadBrandAsset(file, selectedClientId, savedKit.id!, assetType);
      setBrandKit((prev) => prev ? { ...prev, assets: [...(prev.assets || []), asset] } : prev);
      showNotification(`${assetLabels[assetType]} enviado`, 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Erro ao enviar asset', 'error');
    } finally {
      setUploadingAssetType(null);
    }
  };

  const handleDeleteAsset = async (asset: ClientBrandAsset) => {
    try {
      await clientBrandAssetService.deleteBrandAsset(asset);
      setBrandKit((prev) => prev ? { ...prev, assets: (prev.assets || []).filter((item) => item.id !== asset.id) } : prev);
      showNotification('Asset removido', 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Erro ao remover asset', 'error');
    }
  };

  const handleBackgroundFile = (file: File | undefined) => {
    if (!file) return;
    if (backgroundPreviewUrl) {
      URL.revokeObjectURL(backgroundPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setBackgroundFile(file);
    setBackgroundPreviewUrl(previewUrl);
    patchBrief({
      backgroundImageUrl: undefined,
      backgroundImageName: file.name,
    });
  };

  const handleRemoveBackground = () => {
    if (backgroundPreviewUrl) {
      URL.revokeObjectURL(backgroundPreviewUrl);
    }
    setBackgroundFile(null);
    setBackgroundPreviewUrl('');
    patchBrief({
      backgroundImageUrl: undefined,
      backgroundImageName: undefined,
    });
  };

  const handleGenerate = async () => {
    if (!selectedClientId || !canGenerate) {
      showNotification('Complete o Brand Kit e o briefing antes de gerar', 'warning');
      return;
    }
    setGenerating(true);
    setResultUrls([]);
    setCreativePlan(null);
    try {
      await handleSaveKit();
      let backgroundImageUrl = brief.backgroundImageUrl;
      if (backgroundFile) {
        setBackgroundUploading(true);
        const uploaded = await clientBrandAssetService.uploadBriefBackgroundImage(backgroundFile, selectedClientId);
        backgroundImageUrl = uploaded.publicUrl;
        patchBrief({ backgroundImageUrl, backgroundImageName: backgroundFile.name });
      }
      const normalizedBrief: ImageStudioBrief = {
        ...brief,
        backgroundImageUrl,
        backgroundImageName: brief.backgroundImageName || backgroundFile?.name,
        imageCount: brief.format === 'carousel' ? Math.max(2, brief.slideCount || 5) : Math.min(4, Math.max(1, brief.imageCount || 1)),
      };
      const res = await generateBrandImages({
        clientId: selectedClientId,
        brief: normalizedBrief,
        quality,
      });
      setResultUrls(res.images.map((i) => i.publicUrl));
      setCreativePlan(res.creativePlan || null);
      showNotification(
        res.mode === 'composite'
          ? 'Post gerado com Brand Kit e logo aplicada sem redesenhar'
          : 'Post gerado com Brand Kit',
        'success',
      );
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Falha na geração', 'error');
    } finally {
      setBackgroundUploading(false);
      setGenerating(false);
    }
  };

  useEffect(() => () => {
    if (backgroundPreviewUrl) {
      URL.revokeObjectURL(backgroundPreviewUrl);
    }
  }, [backgroundPreviewUrl]);

  const handleAddClient = (c: Client) => {
    setSelectedClientId(c.id);
    setClientDialogOpen(false);
    setClients((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
    showNotification('Cliente adicionado', 'success');
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
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
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '16px',
                display: 'grid',
                placeItems: 'center',
                color: GLASS.accent.orange,
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <AutoAwesomeIcon />
            </Box>
            <Box>
              <Typography variant="h4" className="premium-header-title">
                Estúdio de imagens
              </Typography>
              <Typography variant="body2" className="premium-header-subtitle">
                Brand Kit, briefing guiado e geração de posts completos para cada cliente.
              </Typography>
            </Box>
          </Stack>
          <Chip
            label="GPT Images + Brand Kit"
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.26)',
              bgcolor: 'rgba(255,255,255,0.12)',
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            <Card elevation={0} sx={{ borderRadius: GLASS.radius.card, border: `1px solid ${GLASS.border.outer}`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                        Cliente
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Workspace da marca
                      </Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setClientDialogOpen(true)} sx={{ textTransform: 'none' }}>
                      Novo
                    </Button>
                  </Stack>

                  <FormControl fullWidth>
                    <InputLabel id="client-select-label">Cliente</InputLabel>
                    <Select
                      labelId="client-select-label"
                      label="Cliente"
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value as string)}
                    >
                      {clients.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar src={c.profilePicture || c.logoUrl} sx={{ width: 30, height: 30 }}>
                              {c.name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>{c.name}</Typography>
                              {c.instagram && <Typography variant="caption" color="text.secondary">@{c.instagram}</Typography>}
                            </Box>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!selectedClientId ? (
                    <Alert severity="info">Selecione um cliente para iniciar o Brand Kit.</Alert>
                  ) : kitLoading ? (
                    <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary">Carregando Brand Kit...</Typography>
                    </Stack>
                  ) : (
                    <Paper elevation={0} sx={{ p: 2, borderRadius: GLASS.radius.inner, bgcolor: alpha(GLASS.accent.orange, 0.06), border: `1px solid ${alpha(GLASS.accent.orange, 0.18)}` }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={logoAsset?.fileUrl || selectedClient?.logoUrl} sx={{ width: 48, height: 48, bgcolor: '#fff' }}>
                          <BadgeIcon />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={800}>
                            {brandKit?.brandName || selectedClient?.name || 'Brand Kit'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {brandProgress}% configurado
                          </Typography>
                          <LinearProgress variant="determinate" value={brandProgress} sx={{ mt: 0.8, height: 7, borderRadius: 999 }} />
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        <Button
                          size="small"
                          variant={brandKit?.id ? 'outlined' : 'contained'}
                          startIcon={<PaletteIcon />}
                          onClick={() => setBrandKitDialogOpen(true)}
                          sx={{
                            textTransform: 'none',
                            ...(brandKit?.id
                              ? {}
                              : { bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark } }),
                          }}
                        >
                          {brandKit?.id ? 'Editar Brand Kit' : 'Criar Brand Kit'}
                        </Button>
                        {brandKit?.id && (
                          <Chip size="small" color="success" label="Salvo" sx={{ fontWeight: 700 }} />
                        )}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={2.5}>
            <Card elevation={0} sx={{ borderRadius: GLASS.radius.card, border: `1px solid ${GLASS.border.outer}`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
              <CardContent>
                <Stack spacing={2.25}>
                  <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <BriefIcon sx={{ color: GLASS.accent.orange }} />
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 850, letterSpacing: '-0.03em' }}>
                          Briefing do post
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Responda como faria para um designer. O prompt final é montado automaticamente.
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label={brief.format === 'carousel' ? `${brief.slideCount || 5} slides` : `${brief.imageCount || 1} imagem(ns)`}
                      icon={brief.format === 'carousel' ? <CarouselIcon /> : <ImageIcon />}
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>

                  {!identityReady && (
                    <Alert severity="warning">
                      Complete pelo menos nome, estilo visual, tom/público e um asset de logo/referência para gerar com consistência.
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Formato</InputLabel>
                        <Select label="Formato" value={brief.format} onChange={(e) => patchBrief({ format: e.target.value as ImageStudioBrief['format'] })}>
                          <MenuItem value="feed">Feed 1:1</MenuItem>
                          <MenuItem value="story">Story 9:16</MenuItem>
                          <MenuItem value="carousel">Carrossel</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Objetivo</InputLabel>
                        <Select label="Objetivo" value={brief.objective} onChange={(e) => patchBrief({ objective: e.target.value as ImageStudioBrief['objective'] })}>
                          <MenuItem value="brand">Marca / posicionamento</MenuItem>
                          <MenuItem value="educate">Educar</MenuItem>
                          <MenuItem value="sell">Vender</MenuItem>
                          <MenuItem value="announce">Anunciar</MenuItem>
                          <MenuItem value="engage">Engajar</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Qualidade</InputLabel>
                        <Select label="Qualidade" value={quality} onChange={(e) => setQuality(e.target.value)}>
                          <MenuItem value="low">Baixa (rápida)</MenuItem>
                          <MenuItem value="medium">Média</MenuItem>
                          <MenuItem value="high">Alta</MenuItem>
                          <MenuItem value="auto">Auto</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    label="Qual é a ideia central?"
                    value={brief.topic}
                    onChange={(e) => patchBrief({ topic: e.target.value })}
                    placeholder="Ex.: campanha para divulgar consultoria de tráfego pago para clínicas odontológicas"
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth multiline minRows={3} label="Quem precisa ver isso?" value={brief.audience} onChange={(e) => patchBrief({ audience: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth multiline minRows={3} label="Oferta, produto ou promessa" value={brief.offer || ''} onChange={(e) => patchBrief({ offer: e.target.value })} />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="CTA" value={brief.cta} onChange={(e) => patchBrief({ cta: e.target.value })} placeholder="Ex.: Chame no direct" />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Texto na arte</InputLabel>
                        <Select label="Texto na arte" value={brief.inImageTextMode} onChange={(e) => patchBrief({ inImageTextMode: e.target.value as ImageStudioBrief['inImageTextMode'] })}>
                          <MenuItem value="none">Sem texto</MenuItem>
                          <MenuItem value="short">Texto curto</MenuItem>
                          <MenuItem value="per-slide">Texto por slide</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    {brief.format === 'carousel' ? (
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Quantidade de slides</InputLabel>
                          <Select label="Quantidade de slides" value={brief.slideCount || 5} onChange={(e) => patchBrief({ slideCount: Number(e.target.value) })}>
                            {[3, 4, 5, 6, 7, 8, 9, 10].map((x) => <MenuItem key={x} value={x}>{x} slides</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    ) : (
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Quantidade</InputLabel>
                          <Select label="Quantidade" value={brief.imageCount} onChange={(e) => patchBrief({ imageCount: Number(e.target.value) })}>
                            {[1, 2, 3, 4].map((x) => <MenuItem key={x} value={x}>{x} imagem{x > 1 ? 's' : ''}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    <Grid item xs={12} md={8}>
                      <TextField fullWidth label="Tom desta peça" value={brief.tone} onChange={(e) => patchBrief({ tone: e.target.value })} />
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Observações para esta geração"
                    value={brief.notes || ''}
                    onChange={(e) => patchBrief({ notes: e.target.value })}
                    placeholder="Ex.: evitar pessoas, usar fundo escuro, priorizar produto, deixar espaço para texto..."
                  />

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: GLASS.radius.inner,
                      border: `1px dashed ${alpha(GLASS.accent.orange, 0.34)}`,
                      bgcolor: alpha(GLASS.accent.orange, 0.035),
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Box
                        sx={{
                          width: { xs: '100%', sm: 132 },
                          height: 96,
                          borderRadius: 2,
                          overflow: 'hidden',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#fff',
                          border: `1px solid ${GLASS.border.subtle}`,
                          flexShrink: 0,
                        }}
                      >
                        {backgroundPreviewUrl || brief.backgroundImageUrl ? (
                          <Box
                            component="img"
                            src={backgroundPreviewUrl || brief.backgroundImageUrl}
                            alt="Imagem de fundo do briefing"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <BackgroundIcon sx={{ color: alpha(theme.palette.text.primary, 0.36) }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={850}>
                          Imagem de fundo deste post
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Opcional. Use quando quiser que a geração siga uma foto, ambiente, textura ou base visual só para este post.
                        </Typography>
                        {brief.backgroundImageName && (
                          <Chip
                            size="small"
                            label={brief.backgroundImageName}
                            sx={{ mt: 1, maxWidth: '100%' }}
                          />
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={backgroundUploading ? <CircularProgress size={16} /> : <ImageIcon />}
                          disabled={generating || backgroundUploading}
                          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                        >
                          {brief.backgroundImageName ? 'Trocar' : 'Selecionar'}
                          <input
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) => {
                              handleBackgroundFile(e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </Button>
                        {(backgroundPreviewUrl || brief.backgroundImageUrl) && (
                          <Tooltip title="Remover imagem de fundo">
                            <IconButton onClick={handleRemoveBackground} disabled={generating || backgroundUploading}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                      onClick={handleGenerate}
                      disabled={generating || backgroundUploading || !canGenerate}
                      sx={{ bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark }, textTransform: 'none', fontWeight: 800 }}
                    >
                      {backgroundUploading ? 'Enviando fundo...' : generating ? 'Gerando post completo...' : 'Gerar post completo'}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Carrosséis geram uma imagem por slide e podem levar alguns minutos.
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {(creativePlan || resultUrls.length > 0 || generating) && (
              <Card elevation={0} sx={{ borderRadius: GLASS.radius.card, border: `1px solid ${GLASS.border.outer}`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 850 }}>Resultado</Typography>
                        <Typography variant="body2" color="text.secondary">Plano criativo, imagens e caminhos para postar.</Typography>
                      </Box>
                      {!!resultUrls.length && (
                        <Button
                          startIcon={<DownloadIcon />}
                          href={resultUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ textTransform: 'none' }}
                        >
                          Abrir primeira imagem
                        </Button>
                      )}
                    </Stack>

                    {generating && (
                      <>
                        <Alert severity="info">
                          A IA está montando {expectedImageCount > 1 ? `${expectedImageCount} imagens` : 'a imagem'} com o Brand Kit. Pode levar alguns minutos.
                        </Alert>
                        <Grid container spacing={2}>
                          {Array.from({ length: expectedImageCount }).map((_, index) => (
                            <Grid item xs={12} md={brief.format === 'carousel' ? 6 : 12} key={`loading-${index}`}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  borderRadius: GLASS.radius.inner,
                                  border: `1px solid ${alpha(GLASS.accent.orange, 0.18)}`,
                                  bgcolor: alpha(GLASS.accent.orange, 0.035),
                                }}
                              >
                                <Box
                                  sx={{
                                    height: { xs: 260, md: brief.format === 'story' ? 520 : 420 },
                                    borderRadius: 2,
                                    display: 'grid',
                                    placeItems: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: `linear-gradient(110deg, ${alpha(theme.palette.text.primary, 0.06)} 8%, ${alpha(GLASS.accent.orange, 0.12)} 18%, ${alpha(theme.palette.text.primary, 0.06)} 33%)`,
                                    backgroundSize: '200% 100%',
                                    animation: 'imageStudioLoading 1.35s linear infinite',
                                    '@keyframes imageStudioLoading': {
                                      '0%': { backgroundPosition: '120% 0' },
                                      '100%': { backgroundPosition: '-120% 0' },
                                    },
                                  }}
                                >
                                  <Stack alignItems="center" spacing={1.25} sx={{ color: 'text.secondary' }}>
                                    <CircularProgress size={28} sx={{ color: GLASS.accent.orange }} />
                                    <Typography variant="subtitle2" fontWeight={800}>
                                      {brief.format === 'carousel' ? `Preparando slide ${index + 1}` : 'Preparando preview'}
                                    </Typography>
                                    <Typography variant="caption">
                                      Aplicando identidade, composição e prompt visual...
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}

                    {!!resultUrls[0] && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: GLASS.radius.inner,
                          border: `1px solid ${GLASS.border.subtle}`,
                          bgcolor: '#fff',
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={850}>Preview principal</Typography>
                              <Typography variant="body2" color="text.secondary">
                                A imagem já está disponível nesta tela. Você pode abrir, baixar ou usar no post.
                              </Typography>
                            </Box>
                            <Button size="small" href={resultUrls[0]} target="_blank" rel="noreferrer" sx={{ textTransform: 'none' }}>
                              Abrir em nova aba
                            </Button>
                          </Stack>
                          <Box
                            component="img"
                            src={resultUrls[0]}
                            alt="Preview principal gerado"
                            sx={{
                              width: '100%',
                              maxHeight: { xs: 420, md: 620 },
                              objectFit: 'contain',
                              borderRadius: 2,
                              bgcolor: '#f6f6f6',
                              border: `1px solid ${GLASS.border.subtle}`,
                            }}
                          />
                        </Stack>
                      </Paper>
                    )}

                    {creativePlan && (
                      <Paper elevation={0} sx={{ p: 2, borderRadius: GLASS.radius.inner, bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.16)}` }}>
                        <Typography variant="subtitle1" fontWeight={800}>{creativePlan.headline}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 1 }}>{creativePlan.caption}</Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                          {creativePlan.hashtags.map((tag) => <Chip key={tag} size="small" label={tag} />)}
                        </Stack>
                      </Paper>
                    )}

                    {!!creativePlan?.slides.length && (
                      <Grid container spacing={2}>
                        {creativePlan.slides.map((slide, index) => (
                          <Grid item xs={12} md={brief.format === 'carousel' ? 6 : 12} key={`${slide.slideNumber}-${index}`}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: GLASS.radius.inner, border: `1px solid ${GLASS.border.subtle}`, bgcolor: '#fff' }}>
                              {slide.imageUrl ? (
                                <Box component="img" src={slide.imageUrl} alt={slide.title} sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 2, bgcolor: '#f6f6f6' }} />
                              ) : (
                                <Box sx={{ height: 180, display: 'grid', placeItems: 'center', bgcolor: '#f6f6f6', borderRadius: 2 }}>
                                  <ImageIcon color="disabled" />
                                </Box>
                              )}
                              <Stack spacing={0.5} sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">Slide {slide.slideNumber}</Typography>
                                <Typography variant="subtitle2" fontWeight={800}>{slide.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{slide.body}</Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                {slide.imageUrl && (
                                  <>
                                    <Button size="small" href={slide.imageUrl} download target="_blank" rel="noreferrer">Baixar</Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => navigate(`/create-post?clientId=${encodeURIComponent(selectedClientId)}&imageUrl=${encodeURIComponent(slide.imageUrl || '')}`)}
                                    >
                                      Usar no post
                                    </Button>
                                  </>
                                )}
                              </Stack>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}

                    {!!resultUrls.length && !creativePlan?.slides.length && (
                      <Grid container spacing={2}>
                        {resultUrls.map((url, index) => (
                          <Grid item xs={12} md={6} key={`${url}-${index}`}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: GLASS.radius.inner, border: `1px solid ${GLASS.border.subtle}`, bgcolor: '#fff' }}>
                              <Box component="img" src={url} alt={`Imagem gerada ${index + 1}`} sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 2, bgcolor: '#f6f6f6' }} />
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button size="small" href={url} download target="_blank" rel="noreferrer">Baixar</Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => navigate(`/create-post?clientId=${encodeURIComponent(selectedClientId)}&imageUrl=${encodeURIComponent(url)}`)}
                                >
                                  Usar no post
                                </Button>
                              </Stack>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={clientDialogOpen} onClose={() => setClientDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Clientes</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <ClientManager clients={clients} onAddClient={handleAddClient} addOnly />
        </DialogContent>
      </Dialog>

      <Dialog
        open={brandKitDialogOpen}
        onClose={() => setBrandKitDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: GLASS.radius.card },
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: GLASS.shadow.cardHover,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <PaletteIcon sx={{ color: GLASS.accent.orange }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {brandKit?.id ? 'Editar Brand Kit' : 'Criar Brand Kit'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure uma vez por cliente. Depois o estúdio reutiliza essas regras em todos os posts.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {brandKit ? (
            <Stack spacing={2}>
              <Alert severity={brandKit.id ? 'success' : 'info'}>
                {brandKit.id
                  ? 'Este Brand Kit já está salvo. Ajuste apenas quando a identidade do cliente mudar.'
                  : 'Primeiro cadastro: preencha o essencial da marca e salve para liberar gerações consistentes.'}
              </Alert>

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField label="Nome da marca" value={brandKit.brandName || ''} onChange={(e) => patchKit({ brandName: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Tagline" value={brandKit.tagline || ''} onChange={(e) => patchKit({ tagline: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Site" value={brandKit.websiteUrl || ''} onChange={(e) => patchKit({ websiteUrl: e.target.value })} fullWidth placeholder="https://..." />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Instagram" value={brandKit.instagramHandle || ''} onChange={(e) => patchKit({ instagramHandle: e.target.value })} fullWidth placeholder="@cliente" />
                </Grid>
              </Grid>

              <TextField label="Público ideal" value={brandKit.audience || ''} onChange={(e) => patchKit({ audience: e.target.value })} fullWidth multiline minRows={2} />
              <TextField label="Proposta de valor" value={brandKit.valueProposition || ''} onChange={(e) => patchKit({ valueProposition: e.target.value })} fullWidth multiline minRows={2} />
              <TextField label="Tom de voz" value={brandKit.toneOfVoice || ''} onChange={(e) => patchKit({ toneOfVoice: e.target.value })} fullWidth multiline minRows={2} placeholder="Ex.: confiante, didático, direto, sem jargão..." />
              <TextField label="Estilo visual" value={brandKit.visualStyle || ''} onChange={(e) => patchKit({ visualStyle: e.target.value })} fullWidth multiline minRows={3} placeholder="Paleta, fotografia, textura, composição, o que evitar..." />

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField label="Cor primária" value={brandKit.primaryColor || ''} onChange={(e) => patchKit({ primaryColor: e.target.value })} fullWidth placeholder="#F74211" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Cor secundária" value={brandKit.secondaryColor || ''} onChange={(e) => patchKit({ secondaryColor: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Acento" value={brandKit.accentColor || ''} onChange={(e) => patchKit({ accentColor: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Fonte títulos" value={brandKit.fontHeadline || ''} onChange={(e) => patchKit({ fontHeadline: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Fonte corpo" value={brandKit.fontBody || ''} onChange={(e) => patchKit({ fontBody: e.target.value })} fullWidth />
                </Grid>
              </Grid>

              <TextField label="Uso de logo" value={brandKit.logoUsage || ''} onChange={(e) => patchKit({ logoUsage: e.target.value })} fullWidth multiline minRows={2} />
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField label="Palavras que usar" value={brandKit.wordsToUse || ''} onChange={(e) => patchKit({ wordsToUse: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Palavras que evitar" value={brandKit.wordsToAvoid || ''} onChange={(e) => patchKit({ wordsToAvoid: e.target.value })} fullWidth />
                </Grid>
              </Grid>
              <TextField label="Hashtags padrão" value={brandKit.hashtags || ''} onChange={(e) => patchKit({ hashtags: e.target.value })} fullWidth placeholder="#marca, #campanha" />
              <TextField label="Regras extras para IA" value={brandKit.promptGuardrails || ''} onChange={(e) => patchKit({ promptGuardrails: e.target.value })} fullWidth multiline minRows={2} />

              <Divider />

              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={850}>Assets da marca</Typography>
                {shownAssetGroups.map((group) => (
                  <Stack key={group.join('-')} direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {group.map((type) => (
                      <Button
                        key={type}
                        component="label"
                        variant={type === 'logo' ? 'contained' : 'outlined'}
                        size="small"
                        startIcon={uploadingAssetType === type ? <CircularProgress size={14} /> : <ImageIcon />}
                        disabled={!!uploadingAssetType}
                        sx={{ textTransform: 'none', ...(type === 'logo' ? { bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark } } : {}) }}
                      >
                        {assetLabels[type]}
                        <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={(e) => handleUploadAsset(type, e.target.files?.[0])} />
                      </Button>
                    ))}
                  </Stack>
                ))}
              </Stack>

              {!!brandKit.assets?.length && (
                <Grid container spacing={1}>
                  {brandKit.assets.map((asset) => (
                    <Grid item xs={6} sm={4} md={3} key={asset.id}>
                      <Paper elevation={0} sx={{ p: 1, borderRadius: 2, border: `1px solid ${GLASS.border.subtle}`, bgcolor: GLASS.surface.bgStrong }}>
                        <Box component="img" src={asset.fileUrl} alt={asset.label || asset.assetType} sx={{ width: '100%', height: 92, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff' }} />
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" fontWeight={700} noWrap>{asset.label || assetLabels[asset.assetType]}</Typography>
                          <Tooltip title="Remover">
                            <IconButton size="small" onClick={() => handleDeleteAsset(asset)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
                <Button onClick={() => setBrandKitDialogOpen(false)} sx={{ textTransform: 'none' }}>
                  Fechar
                </Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveKit} disabled={savingKit} sx={{ bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark }, textTransform: 'none', fontWeight: 800 }}>
                  {savingKit ? 'Salvando...' : 'Salvar Brand Kit'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">Carregando Brand Kit...</Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <AppSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification((n) => ({ ...n, open: false }))}
      />
    </Container>
  );
};

export default CreateBrandImage;
