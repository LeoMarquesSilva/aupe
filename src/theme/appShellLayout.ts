import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Breakpoint strategy for the app:
 *
 *  - down('md')  (< 900px)  → "mobile layout": single-column stacking, temporary drawer,
 *                              collapsed toolbars, card lists instead of tables.
 *                              Use this as the PRIMARY breakpoint for layout changes.
 *
 *  - down('sm')  (< 600px)  → "small phone": fine-tuning only — smaller padding,
 *                              reduced font sizes, hide secondary labels.
 *
 *  - up('lg')    (≥ 1200px) → "wide desktop": optional multi-column extras.
 *
 * The AppShell drawer switches from permanent→temporary at `down('md')`.
 * All pages must align their layout breakpoints with this convention.
 */

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
