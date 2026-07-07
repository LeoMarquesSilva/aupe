import type { SubscriptionPlan } from '../services/subscriptionService';
import type { OrganizationProductMode } from '../services/organizationProductModeService';

/** Preço padrão por cliente no plano APROVACAO_ONLY (centavos). */
export const APPROVACAO_PRICE_PER_CLIENT_CENTS = 1490;

export function formatBRLFromCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

export function getApprovalPricePerClientCents(
  plan?: Pick<SubscriptionPlan, 'features'> | null
): number {
  const features = plan?.features as Record<string, unknown> | undefined;
  const fromDb = Number(features?.price_per_client_cents);
  if (Number.isFinite(fromDb) && fromDb > 0) return fromDb;
  return APPROVACAO_PRICE_PER_CLIENT_CENTS;
}

export function getApprovalContractMonthlyCents(
  maxClients: number,
  pricePerClientCents: number
): number {
  return Math.max(0, maxClients) * pricePerClientCents;
}

export function isApprovalOnlySubscription(
  plan?: Pick<SubscriptionPlan, 'plan_code'> | null,
  productMode?: OrganizationProductMode
): boolean {
  return productMode === 'approval_only' || plan?.plan_code === 'APROVACAO_ONLY';
}

export function getSubscriptionPlanLabel(
  plan?: Pick<SubscriptionPlan, 'name' | 'plan_code'> | null,
  productMode?: OrganizationProductMode
): string {
  if (isApprovalOnlySubscription(plan, productMode)) return 'Fluxo de Aprovação';
  if (!plan) return 'Sem plano';
  const name = (plan.name || '').trim();
  if (!name) return 'Plano';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getSubscriptionPlanSubtitle(
  plan?: Pick<SubscriptionPlan, 'plan_code' | 'is_enterprise_contact' | 'features' | 'max_clients'> | null,
  productMode?: OrganizationProductMode
): string {
  if (isApprovalOnlySubscription(plan, productMode)) {
    const unit = formatBRLFromCents(getApprovalPricePerClientCents(plan));
    return `${unit} por cliente/mês — envio de posts para aprovação`;
  }
  if (plan?.is_enterprise_contact) return 'Contrato manual com nossa equipe';
  return 'Assinatura recorrente';
}

export function getApprovalPricingSummary(
  plan?: Pick<SubscriptionPlan, 'plan_code' | 'features' | 'max_clients'> | null,
  productMode?: OrganizationProductMode,
  maxClientsOverride?: number
): string | null {
  if (!isApprovalOnlySubscription(plan, productMode)) return null;
  const unitCents = getApprovalPricePerClientCents(plan);
  const maxClients = maxClientsOverride ?? plan?.max_clients ?? 0;
  const totalCents = getApprovalContractMonthlyCents(maxClients, unitCents);
  return `${formatBRLFromCents(unitCents)} por cliente · contrato de ${formatBRLFromCents(totalCents)}/mês (${maxClients} clientes)`;
}

export function getClientLimitLabel(
  plan?: Pick<SubscriptionPlan, 'plan_code'> | null,
  productMode?: OrganizationProductMode
): string {
  if (isApprovalOnlySubscription(plan, productMode)) {
    return 'Clientes cadastrados';
  }
  return 'Contas Instagram';
}

export function getClientLimitCaption(
  plan?: Pick<SubscriptionPlan, 'plan_code'> | null,
  productMode?: OrganizationProductMode
): string {
  if (isApprovalOnlySubscription(plan, productMode)) {
    return 'Marcas e clientes que você gerencia no fluxo de aprovação';
  }
  return 'Contas conectadas à sua organização';
}
