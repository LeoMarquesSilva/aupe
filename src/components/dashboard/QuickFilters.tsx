import React from 'react';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Typography,
  Divider
} from '@mui/material';
import {
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { PostsFilter } from '../../services/instagramMetricsService';

interface QuickFiltersProps {
  filters: PostsFilter;
  onFiltersChange: (filters: PostsFilter) => void;
  onClearFilters: () => void;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  // Filtros rápidos de período
  const handleQuickDateFilter = (period: string) => {
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = undefined;
    }
    
    onFiltersChange({
      ...filters,
      startDate,
      endDate: period === 'all' ? undefined : now
    });
  };

  // Filtro por tipo de mídia
const handleMediaTypeFilter = (mediaType: 'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM') => {
  onFiltersChange({
    ...filters,
    mediaType: mediaType === 'all' ? undefined : mediaType
  });
};

  // Filtro de ordenação
  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder
    });
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = Boolean(
    filters.startDate || 
    filters.endDate || 
    filters.mediaType || 
    (filters.sortBy && filters.sortBy !== 'date') ||
    (filters.sortOrder && filters.sortOrder !== 'desc')
  );

  const getActivePeriod = () => {
    if (!filters.startDate) return 'all';
    
    const now = new Date();
    const diffTime = now.getTime() - filters.startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return '7d';
    if (diffDays <= 30) return '30d';
    if (diffDays <= 90) return '90d';
    if (diffDays <= 365) return '1y';
    return 'custom';
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h3">
          Filtros Rápidos
        </Typography>
        
        {hasActiveFilters && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            color="secondary"
          >
            Limpar Filtros
          </Button>
        )}
      </Box>

      {/* Filtros de Período */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Período
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button
            variant={getActivePeriod() === '7d' ? 'contained' : 'outlined'}
            onClick={() => handleQuickDateFilter('7d')}
          >
            7 dias
          </Button>
          <Button
            variant={getActivePeriod() === '30d' ? 'contained' : 'outlined'}
            onClick={() => handleQuickDateFilter('30d')}
          >
            30 dias
          </Button>
          <Button
            variant={getActivePeriod() === '90d' ? 'contained' : 'outlined'}
            onClick={() => handleQuickDateFilter('90d')}
          >
            3 meses
          </Button>
          <Button
            variant={getActivePeriod() === '1y' ? 'contained' : 'outlined'}
            onClick={() => handleQuickDateFilter('1y')}
          >
            1 ano
          </Button>
          <Button
            variant={getActivePeriod() === 'all' ? 'contained' : 'outlined'}
            onClick={() => handleQuickDateFilter('all')}
          >
            Todos
          </Button>
        </ButtonGroup>
      </Box>

      {/* Filtros de Tipo de Mídia */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Tipo de Mídia
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<ImageIcon />}
            label="Todas"
            variant={!filters.mediaType ? 'filled' : 'outlined'}
            onClick={() => handleMediaTypeFilter('all')}
            color={!filters.mediaType ? 'primary' : 'default'}
            clickable
          />
          <Chip
            icon={<ImageIcon />}
            label="Fotos"
            variant={filters.mediaType === 'IMAGE' ? 'filled' : 'outlined'}
            onClick={() => handleMediaTypeFilter('IMAGE')}
            color={filters.mediaType === 'IMAGE' ? 'primary' : 'default'}
            clickable
          />
          <Chip
            icon={<VideoIcon />}
            label="Vídeos"
            variant={filters.mediaType === 'VIDEO' ? 'filled' : 'outlined'}
            onClick={() => handleMediaTypeFilter('VIDEO')}
            color={filters.mediaType === 'VIDEO' ? 'primary' : 'default'}
            clickable
          />
          <Chip
            icon={<CarouselIcon />}
            label="Carrossel"
            variant={filters.mediaType === 'CAROUSEL_ALBUM' ? 'filled' : 'outlined'}
            onClick={() => handleMediaTypeFilter('CAROUSEL_ALBUM')}
            color={filters.mediaType === 'CAROUSEL_ALBUM' ? 'primary' : 'default'}
            clickable
          />
        </Box>
      </Box>

      {/* Filtros de Ordenação */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Ordenar por</InputLabel>
          <Select
            value={filters.sortBy || 'date'}
            label="Ordenar por"
            onChange={(e) => handleSortChange(e.target.value, filters.sortOrder || 'desc')}
          >
            <MenuItem value="date">Data</MenuItem>
            <MenuItem value="engagement">Engajamento</MenuItem>
            <MenuItem value="likes">Curtidas</MenuItem>
            <MenuItem value="comments">Comentários</MenuItem>
            <MenuItem value="reach">Alcance</MenuItem>
            <MenuItem value="impressions">Impressões</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Ordem</InputLabel>
          <Select
            value={filters.sortOrder || 'desc'}
            label="Ordem"
            onChange={(e) => handleSortChange(filters.sortBy || 'date', e.target.value as 'asc' | 'desc')}
          >
            <MenuItem value="desc">Decrescente</MenuItem>
            <MenuItem value="asc">Crescente</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Indicadores de filtros ativos */}
      {hasActiveFilters && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Filtros Ativos:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters.startDate && (
              <Chip
                size="small"
                label={`A partir de ${filters.startDate.toLocaleDateString('pt-BR')}`}
                onDelete={() => onFiltersChange({ ...filters, startDate: undefined })}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.mediaType && (
              <Chip
                size="small"
                label={`Tipo: ${filters.mediaType === 'IMAGE' ? 'Fotos' : 
                              filters.mediaType === 'VIDEO' ? 'Vídeos' : 'Carrossel'}`}
                onDelete={() => onFiltersChange({ ...filters, mediaType: undefined })}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.sortBy && filters.sortBy !== 'date' && (
              <Chip
                size="small"
                label={`Ordenação: ${filters.sortBy}`}
                onDelete={() => onFiltersChange({ ...filters, sortBy: 'date' })}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default QuickFilters;