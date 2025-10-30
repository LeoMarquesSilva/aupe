import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  FilterList as FilterIcon,
  SearchOutlined as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { PostsFilter } from '../../services/instagramMetricsService';


interface PostFiltersProps {
  open: boolean;
  filters: PostsFilter;
  onClose: () => void;
  onApply: (filters: PostsFilter) => void;
  onReset: () => void;
}

const PostFilters: React.FC<PostFiltersProps> = ({
  open,
  filters,
  onClose,
  onApply,
  onReset
}) => {
  const [localFilters, setLocalFilters] = React.useState<PostsFilter>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (field: keyof PostsFilter, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Filtros Avançados</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Data inicial"
              value={localFilters.startDate || null}
              onChange={(newValue) => handleChange('startDate', newValue)}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Data final"
              value={localFilters.endDate || null}
              onChange={(newValue) => handleChange('endDate', newValue)}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="media-type-filter-label">Tipo de Mídia</InputLabel>
              <Select
                labelId="media-type-filter-label"
                id="media-type-filter"
                value={localFilters.mediaType || ''}
                label="Tipo de Mídia"
                onChange={(e) => handleChange('mediaType', e.target.value)}
              >
                <MenuItem value="">Todos os tipos</MenuItem>
                <MenuItem value="IMAGE">Imagem</MenuItem>
                <MenuItem value="VIDEO">Vídeo</MenuItem>
                <MenuItem value="CAROUSEL_ALBUM">Carrossel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-by-filter-label">Ordenar por</InputLabel>
              <Select
                labelId="sort-by-filter-label"
                id="sort-by-filter"
                value={localFilters.sortBy || 'date'}
                label="Ordenar por"
                onChange={(e) => handleChange('sortBy', e.target.value)}
              >
                <MenuItem value="date">Data</MenuItem>
                <MenuItem value="engagement">Engajamento</MenuItem>
                <MenuItem value="likes">Curtidas</MenuItem>
                <MenuItem value="comments">Comentários</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-order-filter-label">Ordem</InputLabel>
              <Select
                labelId="sort-order-filter-label"
                id="sort-order-filter"
                value={localFilters.sortOrder || 'desc'}
                label="Ordem"
                onChange={(e) => handleChange('sortOrder', e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="asc">Crescente</MenuItem>
                <MenuItem value="desc">Decrescente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onReset}>Limpar</Button>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleApply} variant="contained">Aplicar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostFilters;