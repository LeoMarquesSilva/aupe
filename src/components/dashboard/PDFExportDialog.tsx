import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Paper,
  useTheme,
  alpha,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  ButtonGroup
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Palette as PaletteIcon,
  ViewModule as LayoutIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon
} from '@mui/icons-material';

interface PDFExportOptions {
  includeClientInfo: boolean;
  includeMetrics: boolean;
  includeEngagementBreakdown: boolean;
  includePostsByType: boolean;
  includeMostEngagedPost: boolean;
  includeTopPosts: boolean;
  topPostsCount: number;
  // Opções de layout e design
  primaryColor: string;
  secondaryColor: string;
  layoutStyle: 'modern' | 'classic' | 'minimal';
  showCoverPage: boolean;
  showPageNumbers: boolean;
  fontSize: 'small' | 'medium' | 'large';
  // Ordem e posicionamento dos elementos
  sectionOrder: string[];
  sectionAlignment: Record<string, 'left' | 'center' | 'right'>;
  sectionSpacing: 'compact' | 'normal' | 'spacious';
  // Opções avançadas de design
  includeCharts: boolean;
  chartType: 'bar' | 'pie' | 'line' | 'none';
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'letter';
  customMargins: boolean;
  marginSize: 'small' | 'medium' | 'large';
  includeLogo: boolean;
  logoPosition: 'header' | 'footer' | 'cover' | 'none';
  watermark: boolean;
  watermarkText: string;
  tableStyle: 'striped' | 'grid' | 'plain';
  headerStyle: 'gradient' | 'solid' | 'minimal';
}

interface PDFExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PDFExportOptions) => void;
  defaultOptions?: Partial<PDFExportOptions>;
}

const PDFExportDialog: React.FC<PDFExportDialogProps> = ({
  open,
  onClose,
  onExport,
  defaultOptions
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [options, setOptions] = useState<PDFExportOptions>({
    includeClientInfo: true,
    includeMetrics: true,
    includeEngagementBreakdown: true,
    includePostsByType: true,
    includeMostEngagedPost: true,
    includeTopPosts: true,
    topPostsCount: 20,
    primaryColor: '#2962FF',
    secondaryColor: '#1976D2',
    layoutStyle: 'modern',
    showCoverPage: true,
    showPageNumbers: true,
    fontSize: 'medium',
    sectionOrder: [
      'includeClientInfo',
      'includeMetrics',
      'includeEngagementBreakdown',
      'includePostsByType',
      'includeMostEngagedPost',
      'includeTopPosts'
    ],
    sectionAlignment: {},
    sectionSpacing: 'normal',
    includeCharts: true,
    chartType: 'bar',
    pageOrientation: 'portrait',
    pageSize: 'a4',
    customMargins: false,
    marginSize: 'medium',
    includeLogo: false,
    logoPosition: 'header',
    watermark: false,
    watermarkText: 'CONFIDENCIAL',
    tableStyle: 'striped',
    headerStyle: 'gradient',
    ...defaultOptions
  });

  const handleToggle = (key: keyof PDFExportOptions) => {
    if (key === 'topPostsCount' || key === 'primaryColor' || key === 'secondaryColor' || 
        key === 'layoutStyle' || key === 'fontSize') return;
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTopPostsCountChange = (count: number) => {
    setOptions(prev => ({
      ...prev,
      topPostsCount: count
    }));
  };

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  const sections = [
    {
      key: 'includeClientInfo' as const,
      title: 'Informações do Cliente',
      description: 'Nome, Instagram, seguidores e estatísticas básicas'
    },
    {
      key: 'includeMetrics' as const,
      title: 'Métricas de Performance',
      description: 'Posts, curtidas, comentários, alcance e engajamento'
    },
    {
      key: 'includeEngagementBreakdown' as const,
      title: 'Breakdown de Engajamento',
      description: 'Detalhamento de curtidas, comentários, salvos e compartilhamentos'
    },
    {
      key: 'includePostsByType' as const,
      title: 'Posts por Tipo de Mídia',
      description: 'Distribuição de posts por tipo (Imagem, Vídeo, Carrossel, Reels)'
    },
    {
      key: 'includeMostEngagedPost' as const,
      title: 'Post Mais Engajado',
      description: 'Detalhes do post com maior engajamento no período'
    },
    {
      key: 'includeTopPosts' as const,
      title: 'Top Posts',
      description: 'Lista dos posts com maior performance'
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <PdfIcon sx={{ color: theme.palette.error.main, fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Exportar Relatório PDF
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Selecione as seções que deseja incluir no relatório
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Conteúdo" />
            <Tab icon={<PaletteIcon />} iconPosition="start" label="Design" />
            <Tab icon={<LayoutIcon />} iconPosition="start" label="Layout" />
            <Tab icon={<DragIcon />} iconPosition="start" label="Posição" />
            <Tab icon={<CheckCircleIcon />} iconPosition="start" label="Avançado" />
          </Tabs>
        </Box>

        {/* Aba de Conteúdo */}
        {tabValue === 0 && (
          <>
            <FormGroup>
              {sections.map((section, index) => (
                <Box key={section.key}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      bgcolor: options[section.key]
                        ? alpha(theme.palette.primary.main, 0.05)
                        : 'transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: options[section.key]
                          ? theme.palette.primary.main
                          : alpha(theme.palette.divider, 0.8),
                        bgcolor: options[section.key]
                          ? alpha(theme.palette.primary.main, 0.08)
                          : alpha(theme.palette.action.hover, 0.5)
                      }
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={options[section.key]}
                          onChange={() => handleToggle(section.key)}
                          sx={{
                            color: theme.palette.primary.main,
                            '&.Mui-checked': {
                              color: theme.palette.primary.main
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {section.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {section.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>

                  {section.key === 'includeTopPosts' && options.includeTopPosts && (
                    <Box sx={{ ml: 5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Quantidade de posts:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {[10, 20, 30, 50].map(count => (
                          <Button
                            key={count}
                            variant={options.topPostsCount === count ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleTopPostsCountChange(count)}
                            sx={{
                              minWidth: 50,
                              fontSize: '0.75rem',
                              textTransform: 'none'
                            }}
                          >
                            {count}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </FormGroup>

            {!(options.includeClientInfo || options.includeMetrics || 
              options.includeEngagementBreakdown || options.includePostsByType || 
              options.includeMostEngagedPost || options.includeTopPosts) && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2" color="warning.dark">
                  ⚠️ Selecione pelo menos uma seção para exportar
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Aba de Design */}
        {tabValue === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Cores do Tema
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Cor Primária</InputLabel>
                    <Select
                      value={options.primaryColor}
                      onChange={(e) => setOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                      label="Cor Primária"
                    >
                      <MenuItem value="#2962FF">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#2962FF', border: '1px solid #ddd' }} />
                          Azul Padrão
                        </Box>
                      </MenuItem>
                      <MenuItem value="#E91E63">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#E91E63', border: '1px solid #ddd' }} />
                          Rosa Instagram
                        </Box>
                      </MenuItem>
                      <MenuItem value="#4CAF50">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#4CAF50', border: '1px solid #ddd' }} />
                          Verde
                        </Box>
                      </MenuItem>
                      <MenuItem value="#FF9800">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#FF9800', border: '1px solid #ddd' }} />
                          Laranja
                        </Box>
                      </MenuItem>
                      <MenuItem value="#9C27B0">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#9C27B0', border: '1px solid #ddd' }} />
                          Roxo
                        </Box>
                      </MenuItem>
                      <MenuItem value="#212121">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: '#212121', border: '1px solid #ddd' }} />
                          Preto
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Cor Secundária</InputLabel>
                    <Select
                      value={options.secondaryColor}
                      onChange={(e) => setOptions(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      label="Cor Secundária"
                    >
                      <MenuItem value="#1976D2">Azul Escuro</MenuItem>
                      <MenuItem value="#C2185B">Rosa Escuro</MenuItem>
                      <MenuItem value="#388E3C">Verde Escuro</MenuItem>
                      <MenuItem value="#F57C00">Laranja Escuro</MenuItem>
                      <MenuItem value="#7B1FA2">Roxo Escuro</MenuItem>
                      <MenuItem value="#424242">Cinza Escuro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Estilo de Layout
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.layoutStyle}
                  onChange={(e) => setOptions(prev => ({ ...prev, layoutStyle: e.target.value as any }))}
                >
                  <MenuItem value="modern">Moderno (com gradientes e sombras)</MenuItem>
                  <MenuItem value="classic">Clássico (tradicional e profissional)</MenuItem>
                  <MenuItem value="minimal">Minimalista (limpo e simples)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Tamanho da Fonte
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.fontSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, fontSize: e.target.value as any }))}
                >
                  <MenuItem value="small">Pequeno (compacto)</MenuItem>
                  <MenuItem value="medium">Médio (padrão)</MenuItem>
                  <MenuItem value="large">Grande (legível)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Estilo dos Headers
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.headerStyle}
                  onChange={(e) => setOptions(prev => ({ ...prev, headerStyle: e.target.value as any }))}
                >
                  <MenuItem value="gradient">Gradiente (moderno)</MenuItem>
                  <MenuItem value="solid">Sólido (clássico)</MenuItem>
                  <MenuItem value="minimal">Minimalista (linha)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Estilo das Tabelas
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.tableStyle}
                  onChange={(e) => setOptions(prev => ({ ...prev, tableStyle: e.target.value as any }))}
                >
                  <MenuItem value="striped">Listrado (padrão)</MenuItem>
                  <MenuItem value="grid">Grade (com bordas)</MenuItem>
                  <MenuItem value="plain">Simples (sem estilo)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        {/* Aba de Layout */}
        {tabValue === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.showCoverPage}
                  onChange={() => handleToggle('showCoverPage' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Página de Capa
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Incluir uma página de capa com título e informações principais
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={options.showPageNumbers}
                  onChange={() => handleToggle('showPageNumbers' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Numeração de Páginas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mostrar número da página no rodapé
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Espaçamento entre Seções
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.sectionSpacing}
                  onChange={(e) => setOptions(prev => ({ ...prev, sectionSpacing: e.target.value as any }))}
                >
                  <MenuItem value="compact">Compacto (menos espaço)</MenuItem>
                  <MenuItem value="normal">Normal (padrão)</MenuItem>
                  <MenuItem value="spacious">Espaçoso (mais espaço)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Orientação da Página
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.pageOrientation}
                  onChange={(e) => setOptions(prev => ({ ...prev, pageOrientation: e.target.value as any }))}
                >
                  <MenuItem value="portrait">Retrato (vertical)</MenuItem>
                  <MenuItem value="landscape">Paisagem (horizontal)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Tamanho da Página
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={options.pageSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, pageSize: e.target.value as any }))}
                >
                  <MenuItem value="a4">A4 (padrão internacional)</MenuItem>
                  <MenuItem value="letter">Letter (padrão EUA)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={options.customMargins}
                  onChange={() => handleToggle('customMargins' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Margens Customizadas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ajustar tamanho das margens da página
                  </Typography>
                </Box>
              }
            />

            {options.customMargins && (
              <Box sx={{ ml: 4, mt: 1 }}>
                <FormControl fullWidth>
                  <Select
                    value={options.marginSize}
                    onChange={(e) => setOptions(prev => ({ ...prev, marginSize: e.target.value as any }))}
                  >
                    <MenuItem value="small">Pequenas (mais conteúdo)</MenuItem>
                    <MenuItem value="medium">Médias (padrão)</MenuItem>
                    <MenuItem value="large">Grandes (mais espaço)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        )}

        {/* Aba de Posicionamento */}
        {tabValue === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Ordem das Seções no PDF
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Use as setas para reordenar as seções. Apenas seções selecionadas aparecerão no PDF.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {options.sectionOrder.map((sectionKey, index) => {
                  const section = sections.find(s => s.key === sectionKey);
                  if (!section) return null;
                  
                  const isSelected = options[sectionKey as keyof PDFExportOptions] as boolean;
                  
                  return (
                    <Paper
                      key={sectionKey}
                      elevation={1}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.action.disabled, 0.05),
                        border: `1px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5)}`,
                        opacity: isSelected ? 1 : 0.5
                      }}
                    >
                      <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {section.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isSelected ? '✓ Incluído no PDF' : 'Não incluído'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...options.sectionOrder];
                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                            setOptions(prev => ({ ...prev, sectionOrder: newOrder }));
                          }}
                          sx={{ minWidth: 32, p: 0.5 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </Button>
                        <Button
                          size="small"
                          disabled={index === options.sectionOrder.length - 1}
                          onClick={() => {
                            const newOrder = [...options.sectionOrder];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            setOptions(prev => ({ ...prev, sectionOrder: newOrder }));
                          }}
                          sx={{ minWidth: 32, p: 0.5 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Alinhamento das Seções
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Escolha o alinhamento do texto e conteúdo de cada seção
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.filter(s => options[s.key]).map(section => (
                  <Box key={section.key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {section.title}
                      </Typography>
                    </Box>
                    <ButtonGroup>
                      <Button
                        size="small"
                        variant={options.sectionAlignment[section.key] === 'left' ? 'contained' : 'outlined'}
                        onClick={() => setOptions(prev => ({
                          ...prev,
                          sectionAlignment: { ...prev.sectionAlignment, [section.key]: 'left' }
                        }))}
                        sx={{ minWidth: 40 }}
                      >
                        <AlignLeftIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        variant={options.sectionAlignment[section.key] === 'center' ? 'contained' : 'outlined'}
                        onClick={() => setOptions(prev => ({
                          ...prev,
                          sectionAlignment: { ...prev.sectionAlignment, [section.key]: 'center' }
                        }))}
                        sx={{ minWidth: 40 }}
                      >
                        <AlignCenterIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        variant={options.sectionAlignment[section.key] === 'right' ? 'contained' : 'outlined'}
                        onClick={() => setOptions(prev => ({
                          ...prev,
                          sectionAlignment: { ...prev.sectionAlignment, [section.key]: 'right' }
                        }))}
                        sx={{ minWidth: 40 }}
                      >
                        <AlignRightIcon fontSize="small" />
                      </Button>
                    </ButtonGroup>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Nova Aba: Gráficos e Visualizações */}
        {tabValue === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeCharts}
                  onChange={() => handleToggle('includeCharts' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Incluir Gráficos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Adicionar visualizações gráficas dos dados (barras, pizza, linha)
                  </Typography>
                </Box>
              }
            />

            {options.includeCharts && (
              <Box sx={{ ml: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Tipo de Gráfico
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={options.chartType}
                    onChange={(e) => setOptions(prev => ({ ...prev, chartType: e.target.value as any }))}
                  >
                    <MenuItem value="bar">Barras (comparação)</MenuItem>
                    <MenuItem value="pie">Pizza (proporções)</MenuItem>
                    <MenuItem value="line">Linha (tendência)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Divider />

            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeLogo}
                  onChange={() => handleToggle('includeLogo' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Incluir Logo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Adicionar logo da empresa no PDF
                  </Typography>
                </Box>
              }
            />

            {options.includeLogo && (
              <Box sx={{ ml: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Posição do Logo
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={options.logoPosition}
                    onChange={(e) => setOptions(prev => ({ ...prev, logoPosition: e.target.value as any }))}
                  >
                    <MenuItem value="header">Cabeçalho (todas as páginas)</MenuItem>
                    <MenuItem value="cover">Capa (apenas primeira página)</MenuItem>
                    <MenuItem value="footer">Rodapé (todas as páginas)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Divider />

            <FormControlLabel
              control={
                <Checkbox
                  checked={options.watermark}
                  onChange={() => handleToggle('watermark' as any)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Marca d'Água
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Adicionar marca d'água no fundo das páginas
                  </Typography>
                </Box>
              }
            />

            {options.watermark && (
              <Box sx={{ ml: 4 }}>
                <TextField
                  fullWidth
                  label="Texto da Marca d'Água"
                  value={options.watermarkText}
                  onChange={(e) => setOptions(prev => ({ ...prev, watermarkText: e.target.value }))}
                  size="small"
                  placeholder="Ex: CONFIDENCIAL, RASCUNHO, etc."
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={!(options.includeClientInfo || options.includeMetrics || 
            options.includeEngagementBreakdown || options.includePostsByType || 
            options.includeMostEngagedPost || options.includeTopPosts)}
          startIcon={<PdfIcon />}
          sx={{
            textTransform: 'none',
            px: 3,
            background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.error.dark}, ${theme.palette.error.main})`
            }
          }}
        >
          Gerar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PDFExportDialog;
