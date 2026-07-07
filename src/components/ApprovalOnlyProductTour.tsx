import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as BackIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  APPROVAL_ONLY_TOUR_STEPS,
  markApprovalOnlyTourCompleted,
  type ApprovalTourStep,
} from '../config/approvalOnlyTourSteps';
import { GLASS } from '../theme/glassTokens';

const POPOVER_WIDTH = 360;
const Z_OVERLAY = 1400;
const Z_POPOVER = 1500;

function waitForElement(selector: string, timeoutMs = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearInterval(timer);
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 80);
  });
}

type PopoverPos = { top: number; left: number; placement: string };

function computePopoverPosition(
  rect: DOMRect | null,
  placement: ApprovalTourStep['placement']
): PopoverPos {
  if (!rect || placement === 'center') {
    return {
      top: Math.max(24, window.innerHeight / 2 - 120),
      left: Math.max(16, window.innerWidth / 2 - POPOVER_WIDTH / 2),
      placement: 'center',
    };
  }

  const margin = 14;
  let top = rect.bottom + margin;
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  let resolvedPlacement = placement || 'bottom';

  if (resolvedPlacement === 'right') {
    top = rect.top + rect.height / 2 - 80;
    left = rect.right + margin;
  } else if (resolvedPlacement === 'left') {
    top = rect.top + rect.height / 2 - 80;
    left = rect.left - POPOVER_WIDTH - margin;
  } else if (resolvedPlacement === 'top') {
    top = rect.top - margin - 200;
    left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  }

  left = Math.min(Math.max(16, left), window.innerWidth - POPOVER_WIDTH - 16);
  top = Math.min(Math.max(16, top), window.innerHeight - 220);

  return { top, left, placement: resolvedPlacement };
}

interface ApprovalOnlyProductTourProps {
  open: boolean;
  onClose: () => void;
}

const ApprovalOnlyProductTour: React.FC<ApprovalOnlyProductTourProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({
    top: 0,
    left: 0,
    placement: 'center',
  });
  const [preparing, setPreparing] = useState(false);

  const step = APPROVAL_ONLY_TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === APPROVAL_ONLY_TOUR_STEPS.length - 1;

  const refreshTarget = useCallback(() => {
    const current = APPROVAL_ONLY_TOUR_STEPS[stepIndex];
    if (!current?.target) {
      setTargetRect(null);
      setPopoverPos(computePopoverPosition(null, 'center'));
      return;
    }
    const el = document.querySelector(current.target);
    if (!el) {
      setTargetRect(null);
      setPopoverPos(computePopoverPosition(null, 'center'));
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setPopoverPos(computePopoverPosition(rect, current.placement));
    }, 280);
  }, [stepIndex]);

  const prepareStep = useCallback(
    async (index: number) => {
      const next = APPROVAL_ONLY_TOUR_STEPS[index];
      if (!next) return;
      setPreparing(true);

      const targetPath = (next.route || '') + (next.search || '');
      const currentPath = location.pathname + location.search;
      if (targetPath && currentPath !== targetPath) {
        navigate(targetPath);
        await new Promise((r) => window.setTimeout(r, 350));
      }

      if (next.prepareAction === 'select-first-client') {
        window.dispatchEvent(new CustomEvent('approval-tour:select-first-client'));
        await new Promise((r) => window.setTimeout(r, 280));
      }

      if (next.target) {
        await waitForElement(next.target, 5000);
      }

      setStepIndex(index);
      setPreparing(false);
    },
    [location.pathname, location.search, navigate]
  );

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTargetRect(null);
      return;
    }
    void prepareStep(0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open || preparing) return;
    refreshTarget();

    const onResize = () => refreshTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, preparing, stepIndex, refreshTarget, location.pathname]);

  const finish = useCallback(() => {
    if (user?.id) markApprovalOnlyTourCompleted(user.id);
    if (location.pathname.startsWith('/settings')) {
      navigate('/approvals');
    }
    onClose();
  }, [user?.id, onClose, location.pathname, navigate]);

  const handleNext = async () => {
    if (isLast) {
      finish();
      return;
    }
    await prepareStep(stepIndex + 1);
  };

  const handleBack = async () => {
    if (isFirst) return;
    await prepareStep(stepIndex - 1);
  };

  const handleSkip = () => {
    finish();
  };

  if (!open || !step) return null;

  return createPortal(
    <>
      {targetRect ? (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 2,
            border: `2px solid ${GLASS.accent.orange}`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.58)',
            pointerEvents: 'none',
            zIndex: Z_OVERLAY,
            transition: 'all 0.25s ease',
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0, 0, 0, 0.58)',
            zIndex: Z_OVERLAY,
            pointerEvents: 'auto',
          }}
          onClick={handleSkip}
        />
      )}

      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: popoverPos.top,
          left: popoverPos.left,
          width: POPOVER_WIDTH,
          maxWidth: 'calc(100vw - 32px)',
          zIndex: Z_POPOVER,
          p: 2.5,
          borderRadius: GLASS.radius.card,
          border: `1px solid ${GLASS.border.outer}`,
          bgcolor: GLASS.surface.bgStrong,
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          boxShadow: `${GLASS.shadow.card}, 0 12px 40px rgba(0,0,0,0.25)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            Passo {stepIndex + 1} de {APPROVAL_ONLY_TOUR_STEPS.length}
          </Typography>
          <IconButton size="small" onClick={handleSkip} aria-label="Fechar tour">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.25 }}>
          {step.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.55 }}>
          {step.body}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Button size="small" color="inherit" onClick={handleSkip} sx={{ textTransform: 'none' }}>
            Pular tour
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isFirst && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => void handleBack()}
                disabled={preparing}
                sx={{ textTransform: 'none' }}
              >
                Voltar
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              endIcon={isLast ? undefined : <NextIcon />}
              onClick={() => void handleNext()}
              disabled={preparing}
              sx={{
                textTransform: 'none',
                bgcolor: GLASS.accent.orange,
                '&:hover': { bgcolor: GLASS.accent.orangeDark },
              }}
            >
              {preparing ? '...' : isLast ? 'Concluir' : 'Próximo'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </>,
    document.body
  );
};

export default ApprovalOnlyProductTour;
