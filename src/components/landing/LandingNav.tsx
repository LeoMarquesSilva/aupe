import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';
import { LOGO_PRIMARY } from './landingAssets';

type LandingNavProps = {
  isMobile: boolean;
  mobileOpen: boolean;
  onDrawerToggle: () => void;
  onGetStarted: () => void;
  onTalkToSales: () => void;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const navLinkSx = {
  color: 'rgba(255,255,255,0.78)',
  fontWeight: 600,
  fontSize: '0.86rem',
  minWidth: 'auto',
  px: 0,
  py: 0.75,
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
  textTransform: 'none',
  bgcolor: 'transparent',
  '&:hover': {
    color: INSYT_COLORS.primaryLight,
    bgcolor: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
    border: 'none',
    boxShadow: 'none',
  },
};

const LandingNav: React.FC<LandingNavProps> = ({
  isMobile,
  mobileOpen,
  onDrawerToggle,
  onGetStarted,
  onTalkToSales,
}) => (
  <>
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        boxShadow: 'none',
        px: { xs: 1.5, md: 3 },
        pt: { xs: 1.25, md: 1.75 },
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          maxWidth: 1360,
          width: '100%',
          mx: 'auto',
          minHeight: { xs: 62, md: 68 },
          px: { xs: 2, md: 2.5 },
          py: 0,
          bgcolor: 'rgba(10, 15, 45, 0.96)',
          border: '1px solid rgba(247, 66, 17, 0.22)',
          borderRadius: 999,
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          boxShadow: '0 18px 48px -30px rgba(10, 15, 45, 0.75)',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => scrollToId('hero')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: 0,
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={LOGO_PRIMARY}
            alt="INSYT"
            sx={{
              height: { xs: 30, md: 36 },
              width: 'auto',
              display: 'block',
            }}
          />
        </Box>

        {!isMobile && (
          <>
            <Box
              component="nav"
              aria-label="Navegação principal"
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 2.15,
                alignItems: 'center',
              }}
            >
              <Button color="inherit" disableRipple onClick={() => scrollToId('agendamento')} sx={navLinkSx}>
                Agendamento
              </Button>
              <Button color="inherit" disableRipple onClick={() => scrollToId('aprovacao')} sx={navLinkSx}>
                Aprovação
              </Button>
              <Button color="inherit" disableRipple onClick={() => scrollToId('dashboard-cliente')} sx={navLinkSx}>
                Dashboard
              </Button>
              <Button color="inherit" disableRipple onClick={() => scrollToId('precos')} sx={navLinkSx}>
                Planos
              </Button>
              <Button color="inherit" disableRipple onClick={() => scrollToId('faq')} sx={navLinkSx}>
                Dúvidas
              </Button>
              <Button color="inherit" disableRipple onClick={onTalkToSales} startIcon={<WhatsAppIcon sx={{ fontSize: 18 }} />} sx={navLinkSx}>
                WhatsApp
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', ml: 'auto', flexShrink: 0 }}>
              <Button
                component="a"
                href="/login"
                sx={{
                  color: '#ffffff',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  px: 2,
                  py: 0.9,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  border: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.16)',
                    border: 'none',
                    boxShadow: 'none',
                  },
                }}
              >
                Entrar
              </Button>
              <Button
                variant="contained"
                onClick={onGetStarted}
                sx={{
                  background: INSYT_COLORS.gradientPrimary,
                  color: INSYT_COLORS.white,
                  px: 2.5,
                  py: 1,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(247, 66, 17, 0.4)',
                  '&:hover': {
                    background: INSYT_COLORS.gradientPrimary,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(247, 66, 17, 0.5)',
                  },
                  transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                }}
              >
                Teste grátis
              </Button>
            </Box>
          </>
        )}

        {isMobile && (
          <IconButton onClick={onDrawerToggle} sx={{ color: '#fff' }} aria-label="Abrir menu">
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>

    <Drawer
      anchor="right"
      open={mobileOpen}
      onClose={onDrawerToggle}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          pt: 8,
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          borderLeft: `1px solid rgba(247, 66, 17, 0.15)`,
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box component="img" src={LOGO_PRIMARY} alt="INSYT" sx={{ height: 40, width: 'auto' }} />
        </Box>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onDrawerToggle();
                setTimeout(() => scrollToId('agendamento'), 100);
              }}
            >
              <ListItemText primary="Agendamento" sx={{ color: INSYT_COLORS.gray300 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onDrawerToggle();
                setTimeout(() => scrollToId('aprovacao'), 100);
              }}
            >
              <ListItemText primary="Aprovação" sx={{ color: INSYT_COLORS.gray300 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onDrawerToggle();
                setTimeout(() => scrollToId('dashboard-cliente'), 100);
              }}
            >
              <ListItemText primary="Dashboard" sx={{ color: INSYT_COLORS.gray300 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onDrawerToggle();
                setTimeout(() => scrollToId('precos'), 100);
              }}
            >
              <ListItemText primary="Planos" sx={{ color: INSYT_COLORS.gray300 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onDrawerToggle();
                setTimeout(() => scrollToId('faq'), 100);
              }}
            >
              <ListItemText primary="Dúvidas" sx={{ color: INSYT_COLORS.gray300 }} />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ my: 2, bgcolor: alpha(INSYT_COLORS.primary, 0.2) }} />
          <ListItem disablePadding>
            <Button
              fullWidth
              component="a"
              href="/login"
              sx={{
                color: INSYT_COLORS.white,
                bgcolor: 'rgba(255,255,255,0.1)',
                py: 1.25,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                mb: 1.25,
                border: 'none',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.16)',
                  border: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              Entrar no sistema
            </Button>
          </ListItem>
          <ListItem disablePadding>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              onClick={() => {
                onDrawerToggle();
                onTalkToSales();
              }}
              sx={{
                color: INSYT_COLORS.gray200,
                borderColor: alpha(INSYT_COLORS.primary, 0.35),
                py: 1.25,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                mb: 1.25,
              }}
            >
              Falar no WhatsApp
            </Button>
          </ListItem>
          <ListItem disablePadding>
            <Button
              fullWidth
              variant="contained"
              onClick={onGetStarted}
              sx={{
                background: INSYT_COLORS.gradientPrimary,
                color: INSYT_COLORS.white,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Começar teste grátis
            </Button>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  </>
);

export default LandingNav;
