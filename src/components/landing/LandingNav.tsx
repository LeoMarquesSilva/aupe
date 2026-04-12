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
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS } from './LandingContent';
import { LOGO_PRIMARY } from './landingAssets';

type LandingNavProps = {
  isMobile: boolean;
  mobileOpen: boolean;
  onDrawerToggle: () => void;
  onGetStarted: () => void;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const LandingNav: React.FC<LandingNavProps> = ({
  isMobile,
  mobileOpen,
  onDrawerToggle,
  onGetStarted,
}) => (
  <>
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: `blur(${GLASS.surface.blurStrong})`,
        borderBottom: `1px solid rgba(247, 66, 17, 0.15)`,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1.25 }}>
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
          }}
        >
          <Box
            component="img"
            src={LOGO_PRIMARY}
            alt="INSYT"
            sx={{
              height: { xs: 36, md: 44 },
              width: 'auto',
              display: 'block',
            }}
          />
        </Box>

        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Button
              color="inherit"
              onClick={() => scrollToId('features')}
              sx={{
                color: INSYT_COLORS.gray300,
                fontWeight: 500,
                '&:hover': { color: INSYT_COLORS.primaryLight },
              }}
            >
              Recursos
            </Button>
            <Button
              color="inherit"
              onClick={() => scrollToId('precos')}
              sx={{
                color: INSYT_COLORS.gray300,
                fontWeight: 500,
                '&:hover': { color: INSYT_COLORS.primaryLight },
              }}
            >
              Planos
            </Button>
            <Button
              color="inherit"
              onClick={() => scrollToId('faq')}
              sx={{
                color: INSYT_COLORS.gray300,
                fontWeight: 500,
                '&:hover': { color: INSYT_COLORS.primaryLight },
              }}
            >
              Dúvidas
            </Button>
            <Button
              variant="contained"
              onClick={onGetStarted}
              sx={{
                background: INSYT_COLORS.gradientPrimary,
                color: INSYT_COLORS.white,
                px: 3,
                py: 1,
                borderRadius: GLASS.radius.button,
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
              Iniciar operação
            </Button>
          </Box>
        )}

        {isMobile && (
          <IconButton onClick={onDrawerToggle} sx={{ color: INSYT_COLORS.gray300 }} aria-label="Abrir menu">
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
                setTimeout(() => scrollToId('features'), 100);
              }}
            >
              <ListItemText primary="Recursos" sx={{ color: INSYT_COLORS.gray300 }} />
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
              Iniciar operação
            </Button>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  </>
);

export default LandingNav;
