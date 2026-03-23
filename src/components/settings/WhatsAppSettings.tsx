import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  LinkOff as LinkOffIcon,
  Send as SendIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  whatsappService,
  InstanceConnectionState,
  WhatsAppGroup,
} from '../../services/whatsappService';

const POLL_INTERVAL_MS = 4000;

type GroupPickerTarget = 'main' | 'client' | 'internal';

const GROUP_PICKER_TARGET_LABEL: Record<GroupPickerTarget, string> = {
  main: 'Número ou grupo principal',
  client: 'Respostas do link do cliente',
  internal: 'Respostas do link do gestor',
};

const STATE_LABELS: Record<InstanceConnectionState, string> = {
  open: 'Conectado',
  close: 'Desconectado',
  connecting: 'Conectando…',
  unknown: 'Verificando…',
};

const STATE_COLORS: Record<InstanceConnectionState, 'success' | 'error' | 'warning' | 'default'> = {
  open: 'success',
  close: 'error',
  connecting: 'warning',
  unknown: 'default',
};

const WhatsAppSettings: React.FC = () => {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [clientApprovalPhone, setClientApprovalPhone] = useState('');
  const [internalApprovalPhone, setInternalApprovalPhone] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [instanceName, setInstanceName] = useState('');

  const [connectionState, setConnectionState] = useState<InstanceConnectionState>('unknown');
  const [checkingState, setCheckingState] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Group picker
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupPickerTarget, setGroupPickerTarget] = useState<GroupPickerTarget>('main');

  // Test message
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adminConfigured = whatsappService.isAdminConfigured();

  useEffect(() => {
    Promise.all([
      whatsappService.getConfig(),
      whatsappService.getInstanceName(),
    ])
      .then(([cfg, instName]) => {
        setInstanceName(instName);
        if (cfg) {
          setPhoneNumber(cfg.phoneNumber);
          setClientApprovalPhone(cfg.clientApprovalPhone ?? '');
          setInternalApprovalPhone(cfg.internalApprovalPhone ?? '');
          setEnabled(cfg.enabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!instanceName || !adminConfigured) return;
    whatsappService.getConnectionState(instanceName).then((res) => {
      setConnectionState(res.state);
    }).catch(() => {});
  }, [instanceName, adminConfigured]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (!instanceName) return;
      try {
        const res = await whatsappService.getConnectionState(instanceName);
        setConnectionState(res.state);
        if (res.state === 'open') { setQrBase64(null); stopPolling(); }
      } catch { /* silent */ }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => () => stopPolling(), []);

  const handleCheckState = async () => {
    if (!instanceName) return;
    setCheckingState(true);
    try {
      const res = await whatsappService.getConnectionState(instanceName);
      setConnectionState(res.state);
    } catch { setConnectionState('unknown'); }
    finally { setCheckingState(false); }
  };

  const handleConnect = async () => {
    if (!instanceName || !adminConfigured) return;
    setQrLoading(true);
    setQrError(null);
    setQrBase64(null);
    try {
      const stateRes = await whatsappService.getConnectionState(instanceName);
      setConnectionState(stateRes.state);
      if (stateRes.state === 'open') { setQrLoading(false); return; }
      const res = await whatsappService.getQRCode(instanceName);
      const b64 = res.base64 ?? (res.code ? `data:image/png;base64,${res.code}` : null);
      if (b64) { setQrBase64(b64); startPolling(); }
      else { setQrError('QR code não disponível. Verifique se a instância está configurada.'); await handleCheckState(); }
    } catch (e) {
      setQrError(e instanceof Error ? e.message : 'Erro ao gerar QR code.');
    } finally { setQrLoading(false); }
  };

  const handleDisconnect = async () => {
    if (!instanceName) return;
    if (!window.confirm('Desconectar o WhatsApp? As notificações serão pausadas.')) return;
    try {
      await whatsappService.disconnectInstance(instanceName);
      setConnectionState('close');
      setQrBase64(null);
      stopPolling();
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Erro ao desconectar.'); }
  };

  const handleOpenGroupPicker = async (target: GroupPickerTarget) => {
    if (!instanceName) return;
    setGroupPickerTarget(target);
    setGroupsLoading(true);
    setGroupsError(null);
    setGroupSearch('');
    try {
      const result = await whatsappService.fetchGroups(instanceName);
      if (result.length === 0) {
        setGroupsError('Nenhum grupo encontrado. Certifique-se de que o WhatsApp está conectado e você participa de grupos.');
      }
      setGroups(result);
      setShowGroupPicker(true);
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : 'Erro ao buscar grupos.');
      setShowGroupPicker(true);
    } finally { setGroupsLoading(false); }
  };

  const handleSelectGroup = (group: WhatsAppGroup) => {
    if (groupPickerTarget === 'client') setClientApprovalPhone(group.id);
    else if (groupPickerTarget === 'internal') setInternalApprovalPhone(group.id);
    else setPhoneNumber(group.id);
    setShowGroupPicker(false);
    setGroupSearch('');
    setTestResult(null);
  };

  const handleSendTest = async () => {
    if (!phoneNumber.trim() || !instanceName) return;
    setTestSending(true);
    setTestResult(null);
    try {
      await whatsappService.sendTestMessage(instanceName, phoneNumber.trim());
      setTestResult({ ok: true, msg: 'Mensagem enviada! Verifique o WhatsApp.' });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Erro ao enviar mensagem.' });
    } finally { setTestSending(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await whatsappService.saveConfig({
        phoneNumber: phoneNumber.trim(),
        enabled,
        clientApprovalPhone: clientApprovalPhone.trim(),
        internalApprovalPhone: internalApprovalPhone.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar configuração.');
    } finally { setSaving(false); }
  };

  const filteredGroups = groups.filter((g) =>
    g.subject.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const isNumberAGroup = phoneNumber.endsWith('@g.us');
  const isClientGroup = clientApprovalPhone.endsWith('@g.us');
  const isInternalGroup = internalApprovalPhone.endsWith('@g.us');
  const hasValidNumber = phoneNumber.trim().length > 0;

  const pickerActiveValue =
    groupPickerTarget === 'main'
      ? phoneNumber
      : groupPickerTarget === 'client'
        ? clientApprovalPhone
        : internalApprovalPhone;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!adminConfigured) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Configuração pendente do administrador
        </Typography>
        <Typography variant="body2">
          Adicione <code>REACT_APP_EVOLUTION_BASE_URL</code> e <code>REACT_APP_EVOLUTION_API_KEY</code> no arquivo <code>.env</code>.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>

      {/* ── Conectar WhatsApp ───────────────────────────────────── */}
      <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <WhatsAppIcon sx={{ color: '#25D366', fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
              Conectar WhatsApp
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontFamily: '"Poppins", sans-serif' }}>
            Escaneie o QR code com o seu WhatsApp para receber notificações de aprovação no seu celular.
          </Typography>

          {/* Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              icon={
                connectionState === 'open' ? <CheckCircleIcon /> :
                connectionState === 'close' ? <CancelIcon /> : <RefreshIcon />
              }
              label={STATE_LABELS[connectionState]}
              color={STATE_COLORS[connectionState]}
              sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={checkingState ? <CircularProgress size={14} /> : <RefreshIcon />}
              onClick={handleCheckState}
              disabled={checkingState}
              sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
            >
              Verificar status
            </Button>
          </Box>

          {connectionState === 'open' ? (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontFamily: '"Poppins", sans-serif' }}>
              WhatsApp conectado! Configure o destino abaixo.
            </Alert>
          ) : (
            <>
              {qrError && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{qrError}</Alert>}
              {qrBase64 && (
                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                    Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo → Escaneie:
                  </Typography>
                  <Box
                    component="img"
                    src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                    alt="QR Code WhatsApp"
                    sx={{ width: 220, height: 220, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
                  />
                </Box>
              )}
            </>
          )}

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {connectionState !== 'open' && (
              <Button
                variant="contained"
                startIcon={qrLoading ? <CircularProgress size={18} color="inherit" /> : <QrCodeIcon />}
                onClick={handleConnect}
                disabled={qrLoading}
                sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none', bgcolor: '#25D366', '&:hover': { bgcolor: '#1ebe5a' } }}
              >
                {qrLoading ? 'Gerando QR code…' : qrBase64 ? 'Novo QR code' : 'Gerar QR code'}
              </Button>
            )}
            {connectionState === 'open' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnect}
                sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
              >
                Desconectar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Destino das notificações ────────────────────────────── */}
      <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, fontFamily: '"Poppins", sans-serif' }}>
            Destino das notificações
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontFamily: '"Poppins", sans-serif' }}>
            Defina o número ou grupo padrão (também usado no teste). Você pode direcionar respostas do link do{' '}
            <strong>cliente</strong> e do link do <strong>gestor</strong> para pessoas diferentes.
          </Typography>

          {/* Number field + grupo */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignItems: { xs: 'stretch', sm: 'flex-start' },
              mb: 1,
            }}
          >
            <TextField
              label="Número ou grupo principal (padrão)"
              placeholder="5511999999999"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setTestResult(null); }}
              fullWidth
              size="small"
              helperText={
                isNumberAGroup
                  ? 'Grupo selecionado — as notificações serão enviadas para esse grupo.'
                  : 'Usado no teste e como destino das respostas do cliente se o campo específico abaixo estiver vazio. Ex: 5511999999999'
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isNumberAGroup
                      ? <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      : <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={
                groupsLoading && groupPickerTarget === 'main'
                  ? <CircularProgress size={14} />
                  : <GroupIcon />
              }
              onClick={() => void handleOpenGroupPicker('main')}
              disabled={groupsLoading || connectionState !== 'open'}
              sx={{
                fontFamily: '"Poppins", sans-serif',
                textTransform: 'none',
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {groupsLoading && groupPickerTarget === 'main' ? 'Buscando…' : 'Grupo'}
            </Button>
          </Box>

          {connectionState !== 'open' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontFamily: '"Poppins", sans-serif' }}>
              Conecte o WhatsApp acima para poder selecionar grupos.
            </Typography>
          )}

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, fontFamily: '"Poppins", sans-serif' }}>
            Destinos por tipo de resposta
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignItems: { xs: 'stretch', sm: 'flex-start' },
              mb: 2,
            }}
          >
            <TextField
              label="Respostas do link de aprovação (cliente)"
              placeholder="Vazio = usar o principal acima"
              value={clientApprovalPhone}
              onChange={(e) => {
                setClientApprovalPhone(e.target.value);
                setTestResult(null);
              }}
              fullWidth
              size="small"
              helperText="Quando o cliente aprovar ou pedir ajustes no link enviado a ele. Pode ser outro número ou ID de grupo (@g.us)."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isClientGroup
                      ? <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      : <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={
                groupsLoading && groupPickerTarget === 'client'
                  ? <CircularProgress size={14} />
                  : <GroupIcon />
              }
              onClick={() => void handleOpenGroupPicker('client')}
              disabled={groupsLoading || connectionState !== 'open'}
              sx={{
                fontFamily: '"Poppins", sans-serif',
                textTransform: 'none',
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {groupsLoading && groupPickerTarget === 'client' ? 'Buscando…' : 'Grupo'}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignItems: { xs: 'stretch', sm: 'flex-start' },
              mb: showGroupPicker ? 1.5 : 1,
            }}
          >
            <TextField
              label="Respostas do link do gestor (revisão interna)"
              placeholder="Obrigatório para notificar este fluxo"
              value={internalApprovalPhone}
              onChange={(e) => {
                setInternalApprovalPhone(e.target.value);
                setTestResult(null);
              }}
              fullWidth
              size="small"
              helperText="Quando o gestor aprovar ou pedir ajustes no link de pré-aprovação interna. Se ficar vazio, não enviamos WhatsApp para esse caso."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isInternalGroup
                      ? <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      : <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={
                groupsLoading && groupPickerTarget === 'internal'
                  ? <CircularProgress size={14} />
                  : <GroupIcon />
              }
              onClick={() => void handleOpenGroupPicker('internal')}
              disabled={groupsLoading || connectionState !== 'open'}
              sx={{
                fontFamily: '"Poppins", sans-serif',
                textTransform: 'none',
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {groupsLoading && groupPickerTarget === 'internal' ? 'Buscando…' : 'Grupo'}
            </Button>
          </Box>

          {/* Group picker list (preenche o campo do botão que abriu) */}
          {showGroupPicker && (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Chip
                  size="small"
                  label={GROUP_PICKER_TARGET_LABEL[groupPickerTarget]}
                  color="primary"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start', fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Buscar grupo…"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  autoFocus
                />
              </Box>

              {groupsError && (
                <Alert severity="warning" sx={{ borderRadius: 0, border: 'none' }}>
                  {groupsError}
                </Alert>
              )}

              <List dense disablePadding sx={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredGroups.length === 0 && !groupsError && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      Nenhum grupo encontrado
                    </Typography>
                  </Box>
                )}
                {filteredGroups.map((group) => (
                  <ListItemButton
                    key={group.id}
                    selected={pickerActiveValue === group.id}
                    onClick={() => handleSelectGroup(group)}
                    sx={{
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <GroupIcon sx={{ fontSize: 20, color: '#25D366' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
                          {group.subject}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                          {group.size ? `${group.size} participantes` : group.id}
                        </Typography>
                      }
                    />
                    {pickerActiveValue === group.id && (
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', ml: 1 }} />
                    )}
                  </ListItemButton>
                ))}
              </List>

              <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  onClick={() => { setShowGroupPicker(false); setGroupSearch(''); }}
                  sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
                >
                  Fechar
                </Button>
              </Box>
            </Paper>
          )}

          <Divider sx={{ my: 2.5 }} />

          {/* Enable toggle */}
          <FormControlLabel
            control={
              <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="success" />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
                  Ativar notificações WhatsApp
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                  Avisos quando o cliente ou o gestor responder aos respectivos links (conforme destinos acima)
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* ── Testar envio ────────────────────────────────────────── */}
      <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, fontFamily: '"Poppins", sans-serif' }}>
            Testar notificação
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: '"Poppins", sans-serif' }}>
            Envia uma mensagem de teste para o número/grupo configurado acima para confirmar que está funcionando.
          </Typography>

          {testResult && (
            <Alert
              severity={testResult.ok ? 'success' : 'error'}
              onClose={() => setTestResult(null)}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {testResult.msg}
            </Alert>
          )}

          <Button
            variant="outlined"
            startIcon={testSending ? <CircularProgress size={18} /> : <SendIcon />}
            onClick={handleSendTest}
            disabled={testSending || !hasValidNumber || connectionState !== 'open'}
            sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
          >
            {testSending ? 'Enviando…' : 'Enviar mensagem de teste'}
          </Button>

          {connectionState !== 'open' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: '"Poppins", sans-serif' }}>
              Conecte o WhatsApp primeiro para testar o envio.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Erros e feedback de save ────────────────────────────── */}
      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)} sx={{ borderRadius: 2 }}>
          {saveError}
        </Alert>
      )}
      {saveSuccess && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Configurações salvas!
        </Alert>
      )}

      <Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none', fontWeight: 600 }}
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      </Box>
    </Box>
  );
};

export default WhatsAppSettings;
