import React, { useState } from 'react';
import { Button, Box, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { fixInstagramConnection } from 'services/instagramFixService';
import { Client } from '../types';

interface InstagramConnectionFixProps {
  client: Client;
  onConnectionFixed: (updatedClient: any) => void;
}

const InstagramConnectionFix: React.FC<InstagramConnectionFixProps> = ({ client, onConnectionFixed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleFix = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await fixInstagramConnection(client.id);
      
      if (result.success) {
        setSuccess(result.message);
        setDebugInfo(result.data);
        onConnectionFixed(result.data);
      } else {
        setError(result.message);
        setDebugInfo(result.error);
      }
    } catch (err: any) {
      setError(`Erro ao corrigir conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <Typography variant="h6">Corrigir Conexão do Instagram</Typography>
        
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          Esta ferramenta tentará corrigir os dados de conexão do Instagram usando o token de acesso existente.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleFix} 
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Corrigir Conexão'}
        </Button>
        
        {debugInfo && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant="subtitle2">Informações de Debug:</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default InstagramConnectionFix;