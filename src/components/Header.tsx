import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  NotificationsNone as NotificationsIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Slideshow as ReelsIcon,
  AddPhotoAlternate as PostIcon,
  Collections as StoryIcon,
  Link as LinkIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GLASS } from '../theme/glassTokens';
import { roleService } from '../services/roleService';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';

const AGENCY_LOGO_URL = '/LOGO-AUPE.jpg';
const APP_NAME = 'INSYT';

const HEADER_HEIGHT = 56;

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        setLoadingRole(true);
        try {
          setIsAdmin(await roleService.isCurrentUserAdmin());
        } catch {
          setIsAdmin(false);
        } finally {
          setLoadingRole(false);
        }
      } else {
        setLoadingRole(false);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        const orgId = (profile as { organization_id?: string })?.organization_id;
        if (orgId) {
          const org = await subscriptionService.getOrganization(orgId);
          setWorkspaceName(org?.name ?? null);
        }
      } catch {
        setWorkspaceName(null);
      }
    };
    loadWorkspace();
  }, [user]);

  const handleLogout = async () => {
    setUserMenuAnchorEl(null);
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const getUserInitials = (email: string) =>
    email?.split('@')[0]?.substring(0, 2).toUpperCase() || 'U';

  const linkSx = (active: boolean) => ({
    color: active ? GLASS.accent.orange : theme.palette.text.secondary,
    fontWeight: active ? 510 : 400,
    fontSize: '0.875rem',
    textDecoration: 'none',
    px: 1.5,
    py: 0.75,
    borderRadius: 1.5,
    position: 'relative' as const,
    backgroundColor: active ? 'rgba(247,66,17,0.1)' : 'transparent',
    ...(active && {
      '&::after': {
        content: '""',
        position: 'absolute',
        left: '50%',
        bottom: 4,
        transform: 'translateX(-50%)',
        width: 20,
        height: 2,
        borderRadius: 1,
        backgroundColor: GLASS.accent.orange,
      },
    }),
    transition: 'background-color 150ms ease, color 150ms ease',
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: active ? 'rgba(247,66,17,0.14)' : 'rgba(247,66,17,0.05)',
    },
  });

  if (!user) return null;

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          left: 10,
          right: 10,
          width: 'auto',
          backgroundColor: GLASS.surface.bgStrong,
          borderBottom: 'none',
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
          border: `1px solid ${GLASS.border.outer}`,
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          transition: 'box-shadow 180ms ease',
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${HEADER_HEIGHT}px !important`,
            height: HEADER_HEIGHT,
            py: 0,
            px: { xs: 1.5, sm: 2 },
          }}
        >
          {/* ——— Esquerda: logo + workspace ——— */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              mr: { xs: 1, md: 3 },
            }}
          >
            <Avatar
              src={AGENCY_LOGO_URL}
              alt={APP_NAME}
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                boxShadow: theme.shadows[1],
              }}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 590,
                  color: theme.palette.text.primary,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {APP_NAME}
              </Typography>
              {workspaceName && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  {workspaceName}
                </Typography>
              )}
            </Box>
          </Box>

          {/* ——— Centro: navegação (desktop) ——— */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Box component={Link} to="/" sx={linkSx(location.pathname === '/')}>
                Início
              </Box>
              <Box component={Link} to="/clients" sx={linkSx(location.pathname === '/clients' || location.pathname.startsWith('/client/'))}>
                Clientes
              </Box>
              <Box component={Link} to="/calendar" sx={linkSx(location.pathname.includes('/calendar'))}>
                Calendário
              </Box>
              <Box component={Link} to="/share-links" sx={linkSx(location.pathname === '/share-links')}>
                Links compartilhados
              </Box>
              <Box component={Link} to="/approvals" sx={linkSx(location.pathname === '/approvals')}>
                Aprovação
              </Box>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* ——— Direita: CTA + ícones + avatar ——— */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {isAdmin && !loadingRole && (
              <Tooltip title="Painel administrativo">
                <IconButton
                  size="small"
                  component={Link}
                  to="/admin"
                  sx={{
                    color: theme.palette.text.secondary,
                  borderRadius: 1.5,
                    '&:hover': { color: GLASS.accent.orange, backgroundColor: theme.palette.action.hover },
                    transition: 'color 150ms ease, background-color 150ms ease',
                  }}
                >
                  <AdminIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Agendar post, reel ou story">
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={(e) => setCreateMenuAnchorEl(e.currentTarget)}
                sx={{
                  fontWeight: 510,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: GLASS.radius.button,
                  px: 2,
                  py: 0.7,
                  minHeight: 34,
                  boxShadow: 'none',
                  bgcolor: GLASS.accent.orange,
                  border: `1px solid rgba(247,66,17,0.35)`,
                  transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    backgroundColor: GLASS.accent.orangeDark,
                    boxShadow: '0 10px 24px rgba(247,66,17,0.28)',
                  },
                }}
              >
                Agendar
              </Button>
            </Tooltip>

            <Tooltip title="Notificações">
              <IconButton
                size="small"
                aria-label="Notificações"
                sx={{
                  color: theme.palette.text.secondary,
                  borderRadius: 1.5,
                  '&:hover': { color: theme.palette.text.primary, backgroundColor: theme.palette.action.hover },
                  transition: 'color 150ms ease, background-color 150ms ease',
                }}
              >
                <NotificationsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Conta e configurações">
              <IconButton
                size="small"
                onClick={(e) => setUserMenuAnchorEl(e.currentTarget)}
                sx={{
                  p: 0.25,
                  borderRadius: '50%',
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                  transition: 'background-color 150ms ease, transform 150ms ease',
                  '&:hover .MuiAvatar-root': { transform: 'scale(1.05)' },
                }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.75rem',
                    bgcolor: GLASS.accent.orange,
                    color: '#ffffff',
                    transition: 'transform 150ms ease',
                  }}
                >
                  {getUserInitials(user.email || 'U')}
                </Avatar>
              </IconButton>
            </Tooltip>

            {isMobile && (
              <Tooltip title="Menu">
                <IconButton
                  size="small"
                  aria-label="Abrir menu"
                  onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                  sx={{
                    color: theme.palette.text.primary,
                    borderRadius: 1.5,
                    '&:hover': { backgroundColor: theme.palette.action.hover },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Espaço para conteúdo não ficar atrás do header fixo */}
      <Box sx={{ height: HEADER_HEIGHT }} />

      {/* Menu Criar (dropdown) */}
      <Menu
        anchorEl={createMenuAnchorEl}
        open={Boolean(createMenuAnchorEl)}
        onClose={() => setCreateMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            borderRadius: 1.5,
            boxShadow: theme.shadows[4],
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
          },
        }}
      >
        <MenuItem component={Link} to="/create-post" onClick={() => setCreateMenuAnchorEl(null)}>
          <ListItemIcon><PostIcon fontSize="small" sx={{ color: GLASS.accent.orange }} /></ListItemIcon>
          <ListItemText primary="Criar Post" />
        </MenuItem>
        <MenuItem component={Link} to="/create-reels" onClick={() => setCreateMenuAnchorEl(null)}>
          <ListItemIcon><ReelsIcon fontSize="small" sx={{ color: GLASS.accent.orange }} /></ListItemIcon>
          <ListItemText primary="Criar Reels" />
        </MenuItem>
        <MenuItem component={Link} to="/create-story" onClick={() => setCreateMenuAnchorEl(null)}>
          <ListItemIcon><StoryIcon fontSize="small" sx={{ color: GLASS.accent.orange }} /></ListItemIcon>
          <ListItemText primary="Criar Story" />
        </MenuItem>
      </Menu>

      {/* Menu mobile */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        PaperProps={{ sx: { borderRadius: 1.5, minWidth: 220, mt: 1.5, border: `1px solid ${theme.palette.divider}` } }}
      >
        <MenuItem component={Link} to="/" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><HomeIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Início" />
        </MenuItem>
        <MenuItem component={Link} to="/clients" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Clientes" />
        </MenuItem>
        <MenuItem component={Link} to="/calendar" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><CalendarIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Calendário" />
        </MenuItem>
        <MenuItem component={Link} to="/share-links" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Links compartilhados" />
        </MenuItem>
        <MenuItem component={Link} to="/approvals" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><ThumbUpIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Aprovação" />
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem component={Link} to="/create-post" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><PostIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Post" />
        </MenuItem>
        <MenuItem component={Link} to="/create-reels" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><ReelsIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Reels" />
        </MenuItem>
        <MenuItem component={Link} to="/create-story" onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><StoryIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Story" />
        </MenuItem>
        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            <MenuItem component={Link} to="/admin" onClick={() => setMenuAnchorEl(null)}>
              <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Painel Admin" />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Menu usuário */}
      <Menu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={() => setUserMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 1.5, minWidth: 220, mt: 1.5, border: `1px solid ${theme.palette.divider}` } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 510 }}>
            {user.email}
          </Typography>
          {isAdmin && (
            <Typography variant="caption" color="primary">
              Admin
            </Typography>
          )}
        </Box>
        <MenuItem component={Link} to="/settings" onClick={() => setUserMenuAnchorEl(null)}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Configurações" />
        </MenuItem>
        {isAdmin && (
          <MenuItem
            onClick={() => {
              setUserMenuAnchorEl(null);
              navigate('/admin');
            }}
          >
            <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Painel Admin" />
          </MenuItem>
        )}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sair" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default Header;
export { HEADER_HEIGHT };
