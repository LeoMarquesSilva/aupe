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
  Avatar
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';

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
  
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  
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
            
            <Button 
              component={Link} 
              to="/create-post" 
              variant="contained"
              startIcon={<AddIcon />}
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
              Criar Post
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
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          >
            <AccountIcon sx={{ color: COLORS.offWhite }} />
          </Avatar>
        </IconButton>
      </Toolbar>
      
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
            <AddIcon fontSize="small" sx={{ color: COLORS.primary }} />
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
            bgcolor: COLORS.offWhite
          }
        }}
      >
        <MenuItem 
          onClick={handleUserMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5,
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          <ListItemIcon>
            <AccountIcon fontSize="small" sx={{ color: COLORS.primary }} />
          </ListItemIcon>
          <ListItemText 
            primary="Minha Conta" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400
            }} 
          />
        </MenuItem>
        
        <MenuItem 
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
        
        <Divider sx={{ my: 1, bgcolor: COLORS.neutralGray }} />
        
        <MenuItem 
          onClick={handleUserMenuClose}
          sx={{ 
            borderRadius: '8px', 
            m: 0.5, 
            color: COLORS.primary,
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500
          }}
        >
          <ListItemText 
            primary="Sair" 
            primaryTypographyProps={{ 
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500
            }} 
          />
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;