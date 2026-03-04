import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  alpha,
  useTheme,
  Tooltip,
  Popover,
  Button
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  East as ArrowRightIcon
} from '@mui/icons-material';
import { format, startOfMonth, subMonths, isAfter, isSameMonth, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodMode = 'quick' | 'month';
export type QuickPeriod = '7d' | '30d' | '90d';

export interface PeriodConfig {
  mode: PeriodMode;
  quickPeriod: QuickPeriod;
  selectedMonth: Date;
  comparisonMonth: Date;
}

interface PeriodSelectorProps {
  config: PeriodConfig;
  onChange: (config: PeriodConfig) => void;
  compact?: boolean;
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MonthPickerPopover: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  disabledMonth?: Date;
  maxMonth?: Date;
  title?: string;
}> = ({ anchorEl, open, onClose, value, onChange, disabledMonth, maxMonth, title }) => {
  const theme = useTheme();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const now = new Date();
  const currentMaxMonth = maxMonth || now;

  const handleSelect = (monthIndex: number) => {
    const selected = setMonth(setYear(new Date(), viewYear), monthIndex);
    onChange(startOfMonth(selected));
    onClose();
  };

  const isDisabled = (monthIndex: number) => {
    const candidate = startOfMonth(setMonth(setYear(new Date(), viewYear), monthIndex));
    if (isAfter(candidate, startOfMonth(currentMaxMonth))) return true;
    if (disabledMonth && isSameMonth(candidate, disabledMonth)) return true;
    return false;
  };

  const isSelected = (monthIndex: number) => {
    return value.getFullYear() === viewYear && value.getMonth() === monthIndex;
  };

  const isCurrent = (monthIndex: number) => {
    return now.getFullYear() === viewYear && now.getMonth() === monthIndex;
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            borderRadius: 3,
            boxShadow: `0 12px 40px ${alpha('#000', 0.12)}`,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            minWidth: 280
          }
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        {title && (
          <Typography variant="caption" sx={{ 
            fontWeight: 700, 
            color: 'text.secondary', 
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            mb: 1.5
          }}>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton size="small" onClick={() => setViewYear(y => y - 1)} sx={{ p: 0.5 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {viewYear}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setViewYear(y => y + 1)}
            disabled={viewYear >= now.getFullYear()}
            sx={{ p: 0.5 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
          {MONTH_NAMES_SHORT.map((name, idx) => {
            const disabled = isDisabled(idx);
            const selected = isSelected(idx);
            const current = isCurrent(idx);

            return (
              <Button
                key={idx}
                size="small"
                disabled={disabled}
                onClick={() => handleSelect(idx)}
                variant={selected ? 'contained' : 'text'}
                disableElevation
                sx={{
                  minWidth: 0,
                  py: 0.9,
                  px: 1,
                  borderRadius: 2,
                  fontSize: '0.78rem',
                  fontWeight: selected ? 700 : 500,
                  textTransform: 'none',
                  color: selected ? 'background.paper' : disabled ? 'text.disabled' : 'text.primary',
                  bgcolor: selected ? 'text.primary' : 'transparent',
                  border: current && !selected ? '1px solid' : '1px solid transparent',
                  borderColor: current && !selected ? 'divider' : 'transparent',
                  '&:hover': {
                    bgcolor: selected
                      ? alpha(theme.palette.text.primary, 0.85)
                      : alpha(theme.palette.text.primary, 0.06)
                  },
                  '&.Mui-disabled': { color: alpha(theme.palette.text.primary, 0.18) }
                }}
              >
                {name}
              </Button>
            );
          })}
        </Box>
      </Box>
    </Popover>
  );
};

const MonthChip: React.FC<{
  label: string;
  month: Date;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  variant?: 'primary' | 'secondary';
}> = ({ label, month, onClick, variant = 'primary' }) => {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const monthFormatted = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: isPrimary ? 'background.paper' : alpha(theme.palette.text.primary, 0.03),
        borderRadius: 2.5,
        pl: 1.25,
        pr: 1.5,
        py: 0.6,
        border: '1px solid',
        borderColor: isPrimary ? alpha(theme.palette.text.primary, 0.15) : alpha(theme.palette.divider, 0.7),
        boxShadow: isPrimary ? `0 1px 4px ${alpha('#000', 0.05)}` : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        '&:hover': {
          borderColor: alpha(theme.palette.text.primary, 0.35),
          boxShadow: `0 2px 8px ${alpha('#000', 0.08)}`,
        }
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: isPrimary ? theme.palette.text.disabled : theme.palette.text.disabled,
          fontSize: '0.58rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: isPrimary ? 700 : 600,
          color: isPrimary ? 'text.primary' : 'text.secondary',
          textTransform: 'capitalize',
          fontSize: isPrimary ? '0.82rem' : '0.78rem',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {monthFormatted}
      </Typography>
    </Box>
  );
};

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ config, onChange, compact = false }) => {
  const theme = useTheme();
  const [mainAnchor, setMainAnchor] = useState<HTMLElement | null>(null);
  const [compAnchor, setCompAnchor] = useState<HTMLElement | null>(null);

  const handleQuickPeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: QuickPeriod | null) => {
    if (newPeriod) {
      onChange({ ...config, mode: 'quick', quickPeriod: newPeriod });
    }
  };

  const handleToggleMode = () => {
    onChange({
      ...config,
      mode: config.mode === 'quick' ? 'month' : 'quick'
    });
  };

  const handleMainMonthChange = (date: Date) => {
    const updates: Partial<PeriodConfig> = { selectedMonth: date, mode: 'month' as PeriodMode };
    if (isSameMonth(date, config.comparisonMonth)) {
      updates.comparisonMonth = subMonths(date, 1);
    }
    onChange({ ...config, ...updates });
  };

  const handleCompMonthChange = (date: Date) => {
    onChange({ ...config, comparisonMonth: date });
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      flexWrap: 'wrap'
    }}>
      {config.mode === 'month' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <MonthChip
            label="Exibindo"
            month={config.selectedMonth}
            onClick={(e) => setMainAnchor(e.currentTarget)}
          />

          <ArrowRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />

          <MonthChip
            label="Comparando com"
            month={config.comparisonMonth}
            onClick={(e) => setCompAnchor(e.currentTarget)}
            variant="secondary"
          />

          <MonthPickerPopover
            anchorEl={mainAnchor}
            open={Boolean(mainAnchor)}
            onClose={() => setMainAnchor(null)}
            value={config.selectedMonth}
            onChange={handleMainMonthChange}
            disabledMonth={config.comparisonMonth}
            title="Selecione o mês para exibir"
          />

          <MonthPickerPopover
            anchorEl={compAnchor}
            open={Boolean(compAnchor)}
            onClose={() => setCompAnchor(null)}
            value={config.comparisonMonth}
            onChange={handleCompMonthChange}
            disabledMonth={config.selectedMonth}
            title="Selecione o mês para comparar"
          />
        </Box>
      ) : (
        <ToggleButtonGroup
          value={config.quickPeriod}
          exclusive
          onChange={handleQuickPeriodChange}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2.5,
            boxShadow: `0 1px 3px ${alpha('#000', 0.04)}`,
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.6,
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '10px !important',
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: 'text.primary',
                color: 'background.paper',
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.85) }
              },
              '&:not(.Mui-selected)': {
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) }
              }
            }
          }}
        >
          <ToggleButton value="7d">7 dias</ToggleButton>
          <ToggleButton value="30d">30 dias</ToggleButton>
          <ToggleButton value="90d">90 dias</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Tooltip title={config.mode === 'quick' ? 'Comparar meses' : 'Período rápido'}>
        <Chip
          icon={config.mode === 'quick'
            ? <CalendarIcon sx={{ fontSize: '0.95rem !important' }} />
            : <ScheduleIcon sx={{ fontSize: '0.95rem !important' }} />
          }
          label={config.mode === 'quick' ? 'Por mês' : 'Período'}
          size="small"
          variant="outlined"
          onClick={handleToggleMode}
          sx={{
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.72rem',
            height: 30,
            borderColor: 'divider',
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'text.primary',
              bgcolor: alpha(theme.palette.text.primary, 0.04)
            }
          }}
        />
      </Tooltip>
    </Box>
  );
};

export default PeriodSelector;
