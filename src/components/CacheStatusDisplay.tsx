import React from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Button, 
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CacheStatus } from '../services/instagramCacheService';

interface CacheStatusDisplayProps {
  cacheStatus: CacheStatus;
  isStale: boolean;
  syncInProgress: boolean;
  onClearCache: () => void;
}

const CacheStatusDisplay: React.FC<CacheStatusDisplayProps> = ({
  cacheStatus,
  isStale,
  syncInProgress,
  onClearCache
}) => {
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: ptBR
    });
  };

  const getSeverity = () => {
    if (cacheStatus.syncStatus === 'failed') return 'error';
    if (isStale) return 'warning';
    return 'success';
  };

  const getStatusIcon = () => {
    if (syncInProgress) {
      return <CircularProgress size={16} />;
    }
    
    switch (cacheStatus.syncStatus) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'in_progress':
        return <ScheduleIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getStatusMessage = () => {
    if (syncInProgress) {
      return 'Sincronização automática em andamento...';
    }
    
    if (cacheStatus.syncStatus === 'failed') {
      return `Erro na sincronização: ${cacheStatus.errorMessage || 'Erro desconhecido'}`;
    }
    
    if (isStale) {
      return `Dados desatualizados (última sincronização: ${formatTimeAgo(cacheStatus.lastFullSync)})`;
    }
    
    return `Dados atualizados (${formatTimeAgo(cacheStatus.lastFullSync)})`;
  };

  return (
    <Alert 
      severity={getSeverity()}
      action={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            color="inherit" 
            size="small" 
            startIcon={<ClearIcon />}
            onClick={onClearCache}
            disabled={syncInProgress}
          >
            Limpar Cache
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon()}
          <Typography variant="body2">
            {getStatusMessage()}
          </Typography>
        </Box>
        
        <Chip 
          size="small" 
          label={`${cacheStatus.postsCount} posts em cache`}
          color={isStale ? "warning" : "success"}
          variant="outlined"
        />
        
        {cacheStatus.syncStatus === 'failed' && cacheStatus.errorMessage && (
          <Chip 
            size="small" 
            label={`Erro: ${cacheStatus.errorMessage.substring(0, 50)}...`}
            color="error"
            variant="outlined"
          />
        )}
      </Box>
    </Alert>
  );
};

export default CacheStatusDisplay;