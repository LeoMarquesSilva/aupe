import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Props de `sx` para `<Container maxWidth={false} disableGutters>` dentro do AppShell.
 * O conteúdo usa toda a largura da coluna principal e acompanha expandir/recolher a sidebar.
 */
export const appShellContainerSx: SxProps<Theme> = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
};
