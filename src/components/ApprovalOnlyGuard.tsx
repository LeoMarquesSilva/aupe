import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import {
  organizationProductModeService,
  OrganizationProductMode,
} from '../services/organizationProductModeService';

const ALLOWED_PREFIXES = ['/approvals', '/settings'];

interface ApprovalOnlyGuardProps {
  children: React.ReactNode;
}

const ApprovalOnlyGuard: React.FC<ApprovalOnlyGuardProps> = ({ children }) => {
  const location = useLocation();
  const [mode, setMode] = useState<OrganizationProductMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await organizationProductModeService.getCurrentMode();
        if (!cancelled) setMode(m);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (
    mode === 'approval_only' &&
    !ALLOWED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
  ) {
    return <Navigate to="/approvals" replace />;
  }

  return <>{children}</>;
};

export default ApprovalOnlyGuard;
