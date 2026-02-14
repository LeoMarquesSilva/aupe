import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Block as RevokeIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  listAllActiveShareLinks,
  revokeShareLink,
  getShareLinkUrl,
  ActiveShareLinkWithClient,
} from '../services/shareLinkService';

const ShareLinksPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [links, setLinks] = useState<ActiveShareLinkWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllActiveShareLinks();
      setLinks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar links.');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCopy = async (link: ActiveShareLinkWithClient) => {
    const url = getShareLinkUrl(link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  };

  const handleRevoke = async (link: ActiveShareLinkWithClient) => {
    if (!window.confirm(`Revogar o link do cliente "${link.clientName}"? O link deixará de funcionar imediatamente.`)) return;
    setRevokingId(link.id);
    try {
      await revokeShareLink(link.id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao revogar link.');
    } finally {
      setRevokingId(null);
    }
  };

  const openLink = (link: ActiveShareLinkWithClient) => {
    window.open(getShareLinkUrl(link.token), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Links compartilhados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
            Links ativos para os clientes visualizarem o dashboard do Instagram sem login. Crie novos links na página de cada cliente.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchLinks}
          size="small"
          sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
        >
          Atualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {links.length === 0 ? (
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
          <LinkIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1 }} />
          <Typography variant="h6" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, mb: 0.5 }}>
            Nenhum link ativo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
            Os links compartilháveis são criados na página de cada cliente (botão &quot;Compartilhar&quot; no dashboard). Quando houver links ativos, eles aparecerão aqui.
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
                <TableCell sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }} align="center">Acessos</TableCell>
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
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
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
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                      {link.accessCount}
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
                      <IconButton size="small" onClick={() => handleCopy(link)} disabled={!!revokingId}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revogar link">
                      <IconButton
                        size="small"
                        onClick={() => handleRevoke(link)}
                        disabled={revokingId !== null}
                        sx={{ color: revokingId === link.id ? undefined : theme.palette.error.main }}
                      >
                        {revokingId === link.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RevokeIcon fontSize="small" />
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
    </Container>
  );
};

export default ShareLinksPage;
