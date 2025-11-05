import React from 'react';
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
  Chip
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Dashboard as DashboardIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  VideoLibrary as ReelsIcon, // ✅ Nova importação
  AddPhotoAlternate as PostIcon // ✅ Nova importação
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roleService } from '../services/roleService';

// URL da logo da agência
const AGENCY_LOGO_URL = "/LOGO-AUPE.jpg";

// Nome da agência
const AGENCY_NAME = "AUPE";

// Cores da identidade visual
const COLORS = {
  primary: '#510000',      // vinho escuro
  secondary: '#3A1D1A',    // marrom café escuro
  lightGray: '#D7CFCF',    // cinza claro rosado
  neutralGray: '#CFCFCF',  // cinza claro neutro
  softBlack: '#0E0E0E',    // preto suave
  greenBlack: '#151B19',   // preto esverdeado
  pureBlack: '#000000',    // preto puro
  offWhite: '#EDEBE9',     // off-white
};

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = React.useState<null | HTMLElement>(null); // ✅ Novo estado
  
  // Estados para verificação de admin
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loadingRole, setLoadingRole] = React.useState(true);

  // Verificar role do usuário quando o componente monta ou usuário muda
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        setLoadingRole(true);
        try {
          const adminStatus = await roleService.isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('❌ Erro ao verificar status de admin:', error);
          setIsAdmin(false);
        } finally {
          setLoadingRole(false);
        }
      } else {
        setIsAdmin(false);
        setLoadingRole(false);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  // ✅ Novos handlers para menu de criação
  const handleCreateMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCreateMenuAnchorEl(event.currentTarget);
  };

  const handleCreateMenuClose = () => {
    setCreateMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    try {
      console.log('🚪 Fazendo logout...');
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };

  const handleAdminSettings = () => {
    navigate('/admin');
    handleUserMenuClose();
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  // Se não há usuário logado, não mostrar header
  if (!user) {
    return null;
  }

  return (
    <AppBar 
      position="static" 
      elevation={3} 
      sx={{ 
        mb: 2, 
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
        borderRadius: '0 0 16px 16px',
        borderBottom: `3px solid ${COLORS.offWhite}`
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        {isMobile && (
          <IconButton 
            edge="start" 
            aria-label="menu"
            onClick={handleMenuOpen}
            sx={{ color: COLORS.offWhite }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box 
          component={Link} 
          to="/"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            color: COLORS.offWhite
          }}
        >
          {/* Logo da agência em formato circular */}
          <Avatar
            src={AGENCY_LOGO_URL}
            alt={AGENCY_NAME}
            sx={{ 
              width: 48, 
              height: 48, 
              mr: 2,
              border: `2px solid ${COLORS.lightGray}`,
              boxShadow: `0 4px 8px rgba(0,0,0,0.3)`,
              display: { xs: 'none', sm: 'flex' }
            }}
          />

          {/* Ícone e nome do app */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(215,207,207,0.2)', 
              mr: 1.5,
              width: 40,
              height: 40
            }}>
              <DashboardIcon sx={{ color: COLORS.offWhite }} />
            </Avatar>
            
            <Box>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontFamily: '"Argent CF", serif',
                  fontWeight: 'normal',
                  letterSpacing: '0.5px',
                  textTransform: 'lowercase',
                  color: COLORS.offWhite,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                Gerenciamento de conteúdo
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 300,
                  opacity: 0.9,
                  color: COLORS.lightGray,
                  display: { xs: 'none', md: 'block' }
                }}
              >
                Planeje, crie e agende seu conteúdo
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Badge de Admin (apenas para administradores) */}
        {!loadingRole && isAdmin && (
          <Chip
            icon={<AdminIcon />}
            label="Admin"
            size="small"
            sx={{
              backgroundColor: 'rgba(237, 235, 233, 0.2)',
              color: COLORS.offWhite,
              mr: 2,
              '& .MuiChip-icon': {
                color: COLORS.offWhite
              },
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              animation: 'pulse 2s infinite'
            }}
          />
        )}

        {/* Informações do usuário (apenas desktop) */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: COLORS.offWhite, 
                  opacity: 0.9,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 400
                }}
              >
                {user.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: COLORS.lightGray,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 300
                }}
              >
                {loadingRole ? 'Verificando...' : 'Online'}
              </Typography>
            </Box>
          </Box>
        )}

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              component={Link} 
              to="/" 
              startIcon={<HomeIcon />}
              sx={{ 
                mx: 1, 
                color: COLORS.offWhite,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: location.pathname === '/' || location.pathname === '/clients' ? 500 : 400,
                borderBottom: (location.pathname === '/' || location.pathname === '/clients') ? 
                  `2px solid ${COLORS.lightGray}` : 'none',
                borderRadius: '8px 8px 0 0',
                '&:hover': {
                  backgroundColor: 'rgba(215,207,207,0.1)'
                }
              }}
            >
              Clientes
            </Button>

            <Button 
              component={Link} 
              to="/calendar" 
              startIcon={<CalendarIcon />}
              sx={{ 
                mx: 1, 
                color: COLORS.offWhite,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: location.pathname.includes('/calendar') ? 500 : 400,
                borderBottom: location.pathname.includes('/calendar') ? 
                  `2px solid ${COLORS.lightGray}` : 'none',
                borderRadius: '8px 8px 0 0',
                '&:hover': {
                  backgroundColor: 'rgba(215,207,207,0.1)'
                }
              }}
            >
              Calendário
            </Button>

            {/* ✅ Botão de criar com dropdown */}
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateMenuOpen}
              sx={{ 
                ml: 2,
                bgcolor: COLORS.offWhite,
                color: COLORS.primary,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                borderRadius: '20px',
                px: 2,
                '&:hover': {
                  bgcolor: COLORS.lightGray,
                }
              }}
            >
              Criar
            </Button>
          </Box>
        )}

        <IconButton 
          onClick={handleUserMenuOpen}
          sx={{ 
            ml: 2,
            border: `2px solid ${COLORS.lightGray}`,
            p: '4px'
          }}
        >
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: 'rgba(215,207,207,0.2)',
              transition: 'all 0.3s ease',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          >
            {getUserInitials(user.email || 'U')}
          </Avatar>
        </IconButton>
      </Toolbar>

      {/* ✅ Menu de criação (desktop) */}
      <Menu
        anchorEl={createMenuAnchorEl}
        open={Boolean(createMenuAnchorEl)}
        onClose={handleCreateMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            bgcolor: COLORS.offWhite,
            minWidth: 200
          }
        }}
      >
        <MenuItem 
          component={Link} 
          to="/create-post"
          onClick={handleCreateMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <PostIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Post" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        <MenuItem 
          component={Link} 
          to="/create-reels"
          onClick={handleCreateMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <ReelsIcon fontSize="small" sx={{ color: '#E91E63' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Reels" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
          <Chip
            label="Novo"
            size="small"
            sx={{
              backgroundColor: '#E91E63',
              color: 'white',
              fontSize: '0.7rem',
              height: '18px'
            }}
          />
        </MenuItem>

        <MenuItem 
          component={Link} 
          to="/create-story"
          onClick={handleCreateMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Story" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>
      </Menu>

      {/* Menu mobile */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            bgcolor: COLORS.offWhite
          }
        }}
      >
        <MenuItem 
          component={Link} 
          to="/"
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <HomeIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Clientes" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        <MenuItem 
          component={Link} 
          to="/calendar"
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <CalendarIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Calendário" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        <Divider sx={{ my: 1, bgcolor: COLORS.neutralGray }} />

        <MenuItem 
          component={Link} 
          to="/create-post"
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <PostIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Post" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        {/* ✅ Nova opção para Reels no menu mobile */}
        <MenuItem 
          component={Link} 
          to="/create-reels"
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <ReelsIcon fontSize="small" sx={{ color: '#E91E63' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Reels" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
          <Chip
            label="Novo"
            size="small"
            sx={{
              backgroundColor: '#E91E63',
              color: 'white',
              fontSize: '0.7rem',
              height: '18px'
            }}
          />
        </MenuItem>

        <MenuItem 
          component={Link} 
          to="/create-story"
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Criar Story" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        {/* Menu de Admin no mobile (apenas para administradores) */}
        {!loadingRole && isAdmin && (
          <>
            <Divider sx={{ my: 1, bgcolor: COLORS.neutralGray }} />
            <MenuItem 
              component={Link} 
              to="/admin"
              onClick={handleMenuClose}
              sx={{ 
                borderRadius: '8px', 
                m: 0.5,
                fontFamily: '"Poppins", sans-serif',
                bgcolor: 'rgba(81, 0, 0, 0.05)'
              }}
            >
              <ListItemIcon>
                <AdminIcon fontSize="small" sx={{ color: COLORS.primary }} />
              </ListItemIcon>
              <ListItemText 
                primary="Painel Admin" 
                primaryTypographyProps={{ 
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  color: COLORS.primary
                }} 
              />
              <Chip
                label="Admin"
                size="small"
                sx={{
                  backgroundColor: COLORS.primary,
                  color: COLORS.offWhite,
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Menu do usuário */}
      <Menu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            bgcolor: COLORS.offWhite,
            minWidth: 200
          }
        }}
      >
        {/* Informações do usuário */}
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${COLORS.neutralGray}` }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              color: COLORS.primary
            }}
          >
            {user.email}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 300,
              color: COLORS.secondary
            }}
          >
            {loadingRole ? 'Verificando...' : 'Logado'}
            {!loadingRole && isAdmin && (
              <Chip
                label="Admin"
                size="small"
                sx={{
                  ml: 1,
                  backgroundColor: COLORS.primary,
                  color: COLORS.offWhite,
                  fontSize: '0.7rem',
                  height: '18px'
                }}
              />
            )}
          </Typography>
        </Box>

        <MenuItem 
          component={Link}
          to="/settings"
          onClick={handleUserMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Configurações" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>

        {/* Menu de Admin (apenas para administradores) */}
        {!loadingRole && isAdmin && (
          <>
            <Divider sx={{ my: 1, bgcolor: COLORS.neutralGray }} />
            <MenuItem 
              onClick={handleAdminSettings}
              sx={{ 
                borderRadius: '8px', 
                m: 0.5,
                fontFamily: '"Poppins", sans-serif',
                bgcolor: 'rgba(81, 0, 0, 0.05)',
                '&:hover': {
                  bgcolor: 'rgba(81, 0, 0, 0.1)'
                }
              }}
            >
              <ListItemIcon>
                <AdminIcon fontSize="small" sx={{ color: COLORS.primary }} />
              </ListItemIcon>
              <ListItemText 
                primary="Painel Admin" 
                primaryTypographyProps={{ 
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  color: COLORS.primary
                }} 
              />
              <Chip
                label="Admin"
                size="small"
                sx={{
                  backgroundColor: COLORS.primary,
                  color: COLORS.offWhite,
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            </MenuItem>
          </>
        )}

        <Divider sx={{ my: 1, bgcolor: COLORS.neutralGray }} />

        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5, 
            color: COLORS.primary,
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            '&:hover': {
              bgcolor: 'rgba(81, 0, 0, 0.1)'
            }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Sair" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              color: COLORS.primary
            }} 
          />
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;