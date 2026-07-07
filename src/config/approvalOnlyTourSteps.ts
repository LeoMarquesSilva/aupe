export type ApprovalTourStep = {
  id: string;
  title: string;
  body: string;
  /** Seletor CSS (`[data-tour="..."]`). Null = card centralizado. */
  target?: string | null;
  route?: string;
  search?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Ação opcional antes de exibir o passo (ex.: selecionar cliente para mostrar botão Editar). */
  prepareAction?: 'select-first-client';
};

export const APPROVAL_ONLY_TOUR_STEPS: ApprovalTourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vinda ao Fluxo de Aprovação',
    body: 'Este tour rápido mostra como cadastrar clientes com nome e logo, editar marcas já criadas e consultar os valores do seu contrato.',
    target: null,
    placement: 'center',
  },
  {
    id: 'new-client',
    title: 'Cadastrar um novo cliente',
    body: 'Clique em "Novo cliente" para informar o nome da marca e enviar a logo (opcional). Não é necessário conectar Instagram.',
    target: '[data-tour="approval-new-client"]',
    route: '/approvals',
    placement: 'bottom',
  },
  {
    id: 'client-select',
    title: 'Selecionar o cliente',
    body: 'Escolha aqui qual cliente receberá os posts para aprovação. O nome que você definir aparece nos links enviados.',
    target: '[data-tour="approval-client-select"]',
    route: '/approvals',
    placement: 'bottom',
  },
  {
    id: 'edit-client',
    title: 'Editar nome e logo',
    body: 'Depois de selecionar um cliente, use "Editar nome" para corrigir o nome ou trocar a logo. A imagem aparece na página pública de aprovação.',
    target: '[data-tour="approval-edit-client"]',
    route: '/approvals',
    placement: 'bottom',
    prepareAction: 'select-first-client',
  },
  {
    id: 'settings-nav',
    title: 'Configurações da conta',
    body: 'No menu lateral, abra Configurações para ver detalhes da sua assinatura, limites e valores do contrato.',
    target: '[data-tour="nav-settings"]',
    route: '/approvals',
    placement: 'right',
  },
  {
    id: 'subscription',
    title: 'Sua assinatura',
    body: 'Aqui você consulta o plano Fluxo de Aprovação, quantos clientes estão cadastrados, o valor por cliente (R$ 14,90) e o total mensal do contrato.',
    target: '[data-tour="settings-subscription-panel"]',
    route: '/settings',
    search: '?tab=subscription',
    placement: 'top',
  },
  {
    id: 'finish',
    title: 'Pronto para começar!',
    body: 'Crie seus clientes, envie conteúdo para aprovação e acompanhe tudo nesta área. Se precisar rever este tour, use "Tour guiado" no menu.',
    target: null,
    placement: 'center',
  },
];

export function getApprovalOnlyTourStorageKey(userId: string): string {
  return `insyt_approval_only_tour_v2_${userId}`;
}

export function hasCompletedApprovalOnlyTour(userId: string): boolean {
  try {
    return localStorage.getItem(getApprovalOnlyTourStorageKey(userId)) === 'done';
  } catch {
    return false;
  }
}

export function markApprovalOnlyTourCompleted(userId: string): void {
  try {
    localStorage.setItem(getApprovalOnlyTourStorageKey(userId), 'done');
  } catch {
    /* ignore */
  }
}
