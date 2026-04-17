import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  AddPhotoAlternate as PostIcon,
  AdminPanelSettings as AdminIcon,
  CalendarMonth as CalendarIcon,
  Collections as StoryIcon,
  Home as HomeIcon,
  Link as LinkIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Slideshow as ReelsIcon,
  ThumbUp as ApprovalsIcon,
} from '@mui/icons-material';
import { PanelLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppShellLayoutContext } from '../contexts/AppShellLayoutContext';
import { roleService } from '../services/roleService';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { GLASS } from '../theme/glassTokens';
import { resolveAgencyLogoSrc } from '../services/imageUrlService';

const APP_NAME = 'INSYT';
const SIDEBAR_WIDTH = 248;
const SIDEBAR_WIDTH_COLLAPSED = 72;

const TRANSITION = `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
  adminOnly?: boolean;
};

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [accountMenuAnchorEl, setAccountMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  const currentWidth = isMobile ? SIDEBAR_WIDTH : (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      try {
        setIsAdmin(await roleService.isCurrentUserAdmin());
      } catch {
        setIsAdmin(false);
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
          setAgencyLogoUrl(org?.agency_logo_url ?? null);
        }
      } catch {
        setWorkspaceName(null);
      }
    };
    loadWorkspace();
  }, [user]);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: 'Início',
        to: '/',
        icon: <HomeIcon fontSize="small" />,
        match: (pathname) => pathname === '/',
      },
      {
        label: 'Clientes',
        to: '/clients',
        icon: <PeopleIcon fontSize="small" />,
        match: (pathname) => pathname === '/clients' || pathname.startsWith('/client/'),
      },
      {
        label: 'Calendário',
        to: '/calendar',
        icon: <CalendarIcon fontSize="small" />,
        match: (pathname) => pathname.startsWith('/calendar'),
      },
      {
        label: 'Aprovação',
        to: '/approvals',
        icon: <ApprovalsIcon fontSize="small" />,
        match: (pathname) => pathname.startsWith('/approvals'),
      },
      {
        label: 'Links compartilhados',
        to: '/share-links',
        icon: <LinkIcon fontSize="small" />,
        match: (pathname) => pathname.startsWith('/share-links'),
      },
      {
        label: 'Configurações',
        to: '/settings',
        icon: <SettingsIcon fontSize="small" />,
        match: (pathname) => pathname.startsWith('/settings'),
      },
      {
        label: 'Painel Admin',
        to: '/admin',
        icon: <AdminIcon fontSize="small" />,
        match: (pathname) => pathname.startsWith('/admin'),
        adminOnly: true,
      },
    ],
    []
  );

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const getInitials = (email?: string) => email?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => {
    setAccountMenuAnchorEl(null);
    await signOut();
    navigate('/login');
  };

  const handleNavigate = (to: string) => {
    navigate(to);
    if (isMobile) setMobileOpen(false);
  };

  const currentSection = visibleNavItems.find((item) => item.match(location.pathname))?.label ?? 'Área autenticada';

  const sidebarContent = (
    <Box
      className="grain-overlay premium-header-bg"
      sx={{
        height: '100%',
        maxHeight: '100vh',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: TRANSITION,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: collapsed && !isMobile ? 0 : 2.25,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          transition: TRANSITION,
          minHeight: 64,
        }}
      >
        {/* Collapsed: orange icon mark */}
        {collapsed && !isMobile ? (
          <Box
            component="img"
            src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-07.png"
            alt="INSYT"
            sx={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0, display: 'block' }}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, overflow: 'hidden' }}>
            {/* Expanded: full horizontal logo */}
            <Box
              component="img"
              src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-04.png"
              alt="INSYT"
              sx={{
                height: 30,
                width: 'auto',
                maxWidth: 150,
                objectFit: 'contain',
                display: 'block',
                opacity: collapsed && !isMobile ? 0 : 1,
                transition: `opacity ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              }}
            />
            {workspaceName && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.2,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 150,
                }}
              >
                {workspaceName}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ mx: collapsed && !isMobile ? 1 : 2, height: '1px', bgcolor: GLASS.border.subtle, transition: TRANSITION }} />

      {/* New content button */}
      <Box sx={{ px: collapsed && !isMobile ? 1 : 1.75, py: 1.5, transition: TRANSITION }}>
        <Tooltip title={collapsed && !isMobile ? 'Novo conteúdo' : ''} placement="right" arrow>
          <Box
            component="button"
            className="grain-overlay"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => setCreateMenuAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              gap: collapsed && !isMobile ? 0 : 1,
              width: '100%',
              px: collapsed && !isMobile ? 0 : 2,
              py: 1.1,
              border: 'none',
              borderRadius: GLASS.radius.button,
              backgroundImage: 'var(--gradient-01)',
              backgroundSize: '240px 240px, auto',
              backgroundBlendMode: 'soft-light, normal',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 650,
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(247, 66, 17, 0.3)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: TRANSITION,
              '&:hover': {
                background: '#d4380d',
                boxShadow: '0 4px 16px rgba(247, 66, 17, 0.4)',
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.4)',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 18, color: '#fff', flexShrink: 0 }} />
            <Box
              component="span"
              sx={{
                opacity: collapsed && !isMobile ? 0 : 1,
                width: collapsed && !isMobile ? 0 : 'auto',
                overflow: 'hidden',
                transition: `opacity ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
              }}
            >
              Novo conteúdo
            </Box>
          </Box>
        </Tooltip>
      </Box>

      {/* Navigation */}
      <List
        sx={{
          px: collapsed && !isMobile ? 0.75 : 1.25,
          pt: 0.5,
          pb: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          transition: TRANSITION,
        }}
      >
        {visibleNavItems.map((item) => {
          const active = item.match(location.pathname);
          const navButton = (
            <ListItemButton
              key={item.to}
              selected={active}
              onClick={() => handleNavigate(item.to)}
              sx={{
                borderRadius: '12px',
                mb: 0.4,
                py: 0.8,
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                px: collapsed && !isMobile ? 1.5 : undefined,
                transition: TRANSITION,
                '&.Mui-selected': {
                  backgroundColor: GLASS.sidebar.bgActive,
                  color: '#ffffff',
                  borderLeft: collapsed && !isMobile ? 'none' : `3px solid ${GLASS.sidebar.activeIndicator}`,
                  borderBottom: collapsed && !isMobile ? `2px solid ${GLASS.sidebar.activeIndicator}` : 'none',
                  pl: collapsed && !isMobile ? 1.5 : 1.1,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: GLASS.sidebar.bgActiveHover,
                },
                '&:hover': {
                  backgroundColor: GLASS.sidebar.bgHover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed && !isMobile ? 0 : 30,
                  mr: collapsed && !isMobile ? 0 : undefined,
                  color: active ? GLASS.accent.orange : 'rgba(255, 255, 255, 0.5)',
                  transition: `color ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!(collapsed && !isMobile) && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: active ? 600 : 430,
                    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    noWrap: true,
                  }}
                />
              )}
            </ListItemButton>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.to} title={item.label} placement="right" arrow>
                {navButton}
              </Tooltip>
            );
          }
          return navButton;
        })}
      </List>

      <Box sx={{ mx: collapsed && !isMobile ? 1 : 2, height: '1px', bgcolor: GLASS.border.subtle, transition: TRANSITION }} />

      {/* Account */}
      <Box sx={{ p: collapsed && !isMobile ? 0.75 : 1.25, transition: TRANSITION }}>
        <Tooltip title={collapsed && !isMobile ? (user?.email || 'Conta') : ''} placement="right" arrow>
          <ListItemButton
            onClick={(e) => setAccountMenuAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: '12px',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              px: collapsed && !isMobile ? 1.5 : undefined,
              transition: `background ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
              '&:hover': { backgroundColor: GLASS.sidebar.bgHover },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed && !isMobile ? 0 : 34, mr: collapsed && !isMobile ? 0 : undefined, justifyContent: 'center' }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  bgcolor: GLASS.accent.orange,
                  color: '#fff',
                }}
              >
                {getInitials(user?.email)}
              </Avatar>
            </ListItemIcon>
            {!(collapsed && !isMobile) && (
              <ListItemText
                primary={user?.email || 'Conta'}
                primaryTypographyProps={{
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.8)',
                  noWrap: true,
                  sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
                }}
                secondary={isAdmin ? 'Admin' : 'Usuário'}
                secondaryTypographyProps={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)' }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box
      className="product-shell"
      sx={{
        display: 'flex',
        color: 'text.primary',
        ...(isMobile
          ? { minHeight: '100vh', flexDirection: 'column' }
          : {
              height: '100vh',
              maxHeight: '100vh',
              flexDirection: 'row',
              overflow: 'hidden',
            }),
      }}
    >
      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Drawer
          open
          variant="permanent"
          PaperProps={{
            sx: {
              width: currentWidth,
              height: '100%',
              maxHeight: '100vh',
              position: 'relative',
              bgcolor: 'transparent',
              borderRight: 'none',
              transition: TRANSITION,
              overflowX: 'hidden',
              flexShrink: 0,
            },
          }}
          sx={{
            width: currentWidth,
            flexShrink: 0,
            height: '100vh',
            maxHeight: '100vh',
            alignSelf: 'stretch',
            transition: TRANSITION,
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Box
        sx={{
          flex: '1 1 0%',
          width: '100%',
          minWidth: 0,
          minHeight: isMobile ? undefined : 0,
          display: 'flex',
          flexDirection: 'column',
          transition: TRANSITION,
          overflow: isMobile ? 'visible' : 'hidden',
          ...(isMobile ? {} : {
            m: '8px',
            ml: 0,
            borderRadius: '16px',
            border: `1px solid ${GLASS.border.outer}`,
            bgcolor: '#f6f6f6',
            boxShadow: '0 1px 4px rgba(10,15,45,0.06)',
          }),
        }}
      >
        {isMobile && (
          <Box
            sx={{
              height: 56,
              px: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: `1px solid ${GLASS.border.outer}`,
              bgcolor: GLASS.shell.headerBg,
              backdropFilter: `blur(${GLASS.shell.headerBlur})`,
              WebkitBackdropFilter: `blur(${GLASS.shell.headerBlur})`,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <IconButton size="small" onClick={() => setMobileOpen(true)} aria-label="Abrir menu lateral" sx={{ color: '#ffffff' }}>
              <MenuIcon fontSize="small" />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#ffffff' }}>
              {currentSection}
            </Typography>
          </Box>
        )}

        {!isMobile && (
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              minHeight: 56,
              pl: 0.5,
              pr: 2,
              py: 1.75,
              boxSizing: 'border-box',
              borderBottom: `1px solid ${GLASS.border.subtle}`,
              borderRadius: '16px 16px 0 0',
            }}
          >
            <Tooltip title={collapsed ? 'Expandir menu' : 'Recolher menu'} placement="bottom" arrow>
              <IconButton
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                sx={{
                  color: GLASS.accent.orange,
                  p: 0.75,
                  borderRadius: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  transition: TRANSITION,
                  '&:hover': {
                    backgroundColor: 'rgba(247, 66, 17, 0.1)',
                    color: GLASS.accent.orangeDark,
                  },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: `0 0 0 2px rgba(247, 66, 17, 0.35)`,
                  },
                }}
              >
                <PanelLeft size={22} strokeWidth={1.75} aria-hidden />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box
          className="page-container fade-in"
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 'none',
            minWidth: 0,
            minHeight: isMobile ? undefined : 0,
            pt: 2,
            pb: 4,
            overflowY: isMobile ? 'visible' : 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <AppShellLayoutContext.Provider
            value={{
              isMobileShell: isMobile,
              sidebarCollapsed: !isMobile && collapsed,
              sidebarWidthPx: isMobile ? 0 : currentWidth,
            }}
          >
            {children}
          </AppShellLayoutContext.Provider>
        </Box>
      </Box>

      <Menu
        anchorEl={createMenuAnchorEl}
        open={Boolean(createMenuAnchorEl)}
        onClose={() => setCreateMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleNavigate('/create-post')}>
          <ListItemIcon><PostIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Post" />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/create-reels')}>
          <ListItemIcon><ReelsIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Reels" />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/create-story')}>
          <ListItemIcon><StoryIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Criar Story" />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={accountMenuAnchorEl}
        open={Boolean(accountMenuAnchorEl)}
        onClose={() => setAccountMenuAnchorEl(null)}
      >
        <MenuItem disabled sx={{ opacity: '1 !important', cursor: 'default' }}>
          <ListItemText
            primary={user?.email || 'Conta'}
            secondary={isAdmin ? 'Administrador' : 'Usuário'}
            primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.72rem' }}
          />
        </MenuItem>
        <Box sx={{ mx: 1.5, my: 0.5, height: '1px', bgcolor: GLASS.border.outer }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sair" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AppShell;
