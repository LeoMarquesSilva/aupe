import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  IconButton, 
  Collapse,
  Alert,
  Chip
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { urlRefreshService } from '../services/urlRefreshService';

const UrlCacheMonitor: React.FC = () => {
  const [cacheStats, setCacheStats] = useState({ total: 0, active: 0, expired: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Atualizar estatísticas do cache
  const updateStats = React.useCallback(() => {
    const stats = urlRefreshService.getCacheStats();
    setCacheStats(stats);
    setLastUpdate(new Date());
  }, []);

  // Atualizar stats periodicamente
  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [updateStats]);

  const hasExpiredUrls = cacheStats.expired > 0;
  const healthStatus = hasExpiredUrls ? 'warning' : 'success';

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {healthStatus === 'success' ? (
            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
          ) : (
            <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
          )}
          <Typography variant="subtitle2" fontWeight="bold">
            Monitor de URLs
          </Typography>
          <Chip 
            size="small" 
            label={`${cacheStats.total} URLs`}
            color={healthStatus}
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="small" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Status rápido */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Chip 
          size="small" 
          label={`${cacheStats.active} Ativas`}
          color="success"
          variant="outlined"
        />
        {cacheStats.expired > 0 && (
          <Chip 
            size="small" 
            label={`${cacheStats.expired} Expiradas`}
            color="warning"
            variant="outlined"
          />
        )}
      </Box>

      {/* Detalhes expandidos */}
      <Collapse in={isExpanded}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          {hasExpiredUrls && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {cacheStats.expired} URL(s) expirada(s) serão atualizadas automaticamente quando necessário.
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary">
            <strong>Sistema de Refresh Automático:</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            • Detecta automaticamente URLs expiradas<br/>
            • Atualiza URLs do Instagram em tempo real<br/>
            • Mantém cache local para melhor performance<br/>
            • Funciona de forma transparente sem intervenção manual
          </Typography>
          
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Última verificação: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default UrlCacheMonitor;