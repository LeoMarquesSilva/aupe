import { parseISO, isValid } from 'date-fns';
import type { ScheduledPost } from '../types';

function rawPost(post: ScheduledPost): Record<string, unknown> {
  return post as unknown as Record<string, unknown>;
}

export function isPublishedStatus(status: string | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'posted' || s === 'published';
}

export function getApprovalFields(post: ScheduledPost) {
  const raw = rawPost(post);
  return {
    requiresApproval: post.requiresApproval ?? raw.requires_approval,
    forApprovalOnly: post.forApprovalOnly ?? raw.for_approval_only,
    approvalStatus: (post.approvalStatus ?? raw.approval_status) as string | undefined,
    requiresInternal: post.requiresInternalApproval ?? raw.requires_internal_approval,
    internalStatus: (post.internalApprovalStatus ?? raw.internal_approval_status) as string | null | undefined,
  };
}

/** Aguardando revisão do gestor (link interno). */
export function isWaitingInternal(post: ScheduledPost): boolean {
  const { requiresInternal, internalStatus } = getApprovalFields(post);
  return requiresInternal === true && internalStatus !== 'approved';
}

/** Aguardando aprovação do cliente. */
export function isWaitingClient(post: ScheduledPost): boolean {
  const { requiresApproval, forApprovalOnly, approvalStatus } = getApprovalFields(post);
  const inFlow = requiresApproval === true || forApprovalOnly === true;
  return inFlow && approvalStatus === 'pending';
}

export function isClientRejected(post: ScheduledPost): boolean {
  const { requiresApproval, forApprovalOnly, approvalStatus } = getApprovalFields(post);
  const inFlow = requiresApproval === true || forApprovalOnly === true;
  return inFlow && approvalStatus === 'rejected';
}

function safeParse(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  try {
    const d = parseISO(dateString);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Data/hora agendada passou, ainda aguardando cliente, e não foi publicado. */
export function isOverdueUnapproved(post: ScheduledPost): boolean {
  if (!isWaitingClient(post)) return false;
  if (isPublishedStatus(post.status)) return false;
  const d = safeParse(post.scheduledDate);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export type CalendarStatusDisplay = {
  label: string;
  tooltip: string;
  /** MUI Chip color */
  chipColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Prefer FactCheck icon over schedule icon for calendar cell */
  preferApprovalIcon: boolean;
};

const OPERATIONAL_LABELS: Record<string, { label: string; tooltip: string; chipColor: CalendarStatusDisplay['chipColor'] }> = {
  pending: {
    label: 'Pendente',
    tooltip: 'Na fila para envio à publicação (não depende de aprovação do cliente neste estado).',
    chipColor: 'warning',
  },
  sent_to_n8n: { label: 'Enviado', tooltip: 'Enviado ao processamento.', chipColor: 'info' },
  processing: { label: 'Processando', tooltip: 'Processando publicação.', chipColor: 'primary' },
  posted: { label: 'Publicado', tooltip: 'Publicado.', chipColor: 'success' },
  published: { label: 'Publicado', tooltip: 'Publicado.', chipColor: 'success' },
  failed: { label: 'Falhou', tooltip: 'Falha ao publicar.', chipColor: 'error' },
  cancelled: { label: 'Cancelado', tooltip: 'Cancelado.', chipColor: 'default' },
};

/**
 * Rótulo e tooltip para o calendário: prioriza fluxo de aprovação sobre o status operacional genérico.
 */
export function getCalendarStatusDisplay(post: ScheduledPost): CalendarStatusDisplay {
  if (isPublishedStatus(post.status)) {
    return {
      label: 'Publicado',
      tooltip: 'Conteúdo já publicado.',
      chipColor: 'success',
      preferApprovalIcon: false,
    };
  }

  if (isWaitingInternal(post)) {
    return {
      label: 'Pré-aprovação interna',
      tooltip:
        'Aguardando revisão do gestor antes de liberar para o cliente. Ainda não foi enviado para aprovação do cliente.',
      chipColor: 'secondary',
      preferApprovalIcon: true,
    };
  }

  if (isWaitingClient(post)) {
    return {
      label: 'Aguardando cliente',
      tooltip: 'Não publicado porque ainda falta aprovação do cliente.',
      chipColor: 'info',
      preferApprovalIcon: true,
    };
  }

  if (isClientRejected(post)) {
    return {
      label: 'Ajustes (cliente)',
      tooltip: 'Cliente pediu ajustes; revise o feedback na página de aprovações.',
      chipColor: 'warning',
      preferApprovalIcon: true,
    };
  }

  const st = String(post.status ?? 'pending').toLowerCase();
  const op = OPERATIONAL_LABELS[st] ?? {
    label: st,
    tooltip: `Status: ${st}`,
    chipColor: 'default' as const,
  };

  return {
    label: op.label,
    tooltip: op.tooltip,
    chipColor: op.chipColor,
    preferApprovalIcon: false,
  };
}

/** Conta posts com status operacional pending que não são só “aguardando aprovação”. */
export function isOperationalPendingOnly(post: ScheduledPost): boolean {
  return post.status === 'pending' && !isWaitingClient(post) && !isWaitingInternal(post);
}
