// Plan presentation helpers — fonte única para landing, /plans e demais
// superfícies que precisam listar os planos novos (STARTER → ENTERPRISE).
//
// Consolida o que estava duplicado em src/pages/Landing.tsx e
// src/pages/PlansPage.tsx. Qualquer ajuste de copy / bullet / gradiente /
// ordem deve acontecer aqui.

import { GLASS } from '../theme/glassTokens';
import type { LandingPlanCard } from '../components/landing';

export type PresentablePlanCode = 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

/** Conjunto de planos pagos que JÁ incluem o Fluxo de Aprovação no preço. */
export const PLANS_WITH_INCLUDED_APPROVAL: readonly PresentablePlanCode[] = [
  'BASIC',
  'PRO',
  'BUSINESS',
  'ENTERPRISE',
] as const;

export const PLAN_ORDER: Record<string, number> = {
  STARTER: 1,
  BASIC: 2,
  PRO: 3,
  BUSINESS: 4,
  ENTERPRISE: 5,
};

export const PLAN_DESCRIPTION: Record<string, string> = {
  STARTER: 'Para começar a profissionalizar',
  BASIC: 'Para quem está escalando',
  PRO: 'Para times e agências em escala',
  BUSINESS: 'Operação avançada multi-conta',
  ENTERPRISE: 'Solução sob medida',
};

/**
 * Gradient por plano — identidade laranja INSYT com uma pitada de cyan nos
 * tiers superiores, mantendo coerência com o tema glass/dark do sistema.
 */
export function planGradient(code: string): string {
  switch (code) {
    case 'STARTER':
      return `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeLight} 100%)`;
    case 'BASIC':
      return `linear-gradient(135deg, ${GLASS.accent.orangeLight} 0%, ${GLASS.accent.orange} 100%)`;
    case 'PRO':
      return `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 50%, #8c2d0d 100%)`;
    case 'BUSINESS':
      return `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, #06B6D4 100%)`;
    case 'ENTERPRISE':
    default:
      return `linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)`;
  }
}

/** Retorna true se o plan_code está na lista de planos pagos com fluxo incluso. */
export function planIncludesApprovalFlow(planCode: string | null | undefined): boolean {
  if (!planCode) return false;
  return (PLANS_WITH_INCLUDED_APPROVAL as readonly string[]).includes(planCode);
}

/**
 * Shape mínimo que consumimos do banco (`subscription_plans`) para montar o
 * card. Compatível com `SubscriptionPlan` em src/services/subscriptionService.ts.
 */
export interface DbPlanInput {
  id: string;
  plan_code?: string | null;
  name?: string;
  amount: number;
  max_profiles: number;
  max_clients: number;
  max_posts_per_month: number;
  features?: Record<string, unknown> | null;
  active?: boolean;
  is_enterprise_contact?: boolean | null;
}

/** Formata um preço mensal em centavos para "R$ 178,00" / "R$ 30,00". */
function formatPriceBRL(amountCents: number): string {
  return `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
}

/**
 * Constrói a lista de bullets de um plano, aplicando a regra do Fluxo de
 * Aprovação (incluso em BASIC+; disponível como add-on opcional no STARTER;
 * já listado no ENTERPRISE).
 */
export function buildFeaturesList(plan: DbPlanInput): string[] {
  const code = (plan.plan_code || '').toUpperCase();

  if (code === 'ENTERPRISE') {
    return [
      'Contas Instagram ilimitadas',
      'Posts ilimitados',
      'Usuários ilimitados',
      'Analytics em tempo real',
      'Suporte dedicado',
      'Fluxo de aprovação incluso',
    ];
  }

  const features: string[] = [
    `Até ${plan.max_clients} ${plan.max_clients === 1 ? 'conta Instagram' : 'contas Instagram'}`,
    `${plan.max_posts_per_month.toLocaleString('pt-BR')} posts agendados/mês`,
    `Até ${plan.max_profiles} ${plan.max_profiles === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}`,
    'Links de dashboard para cliente',
    'Agendamento de post, carrossel, reels e stories',
  ];

  // Features opcionais do JSON do banco — apenas as que o sistema realmente
  // entrega hoje. `api_access` foi removido intencionalmente porque não há
  // API pública disponível.
  const f = plan.features && typeof plan.features === 'object' ? plan.features : {};
  if ((f as any).analytics) features.push('Analytics em tempo real');
  if ((f as any).support === 'priority') features.push('Suporte prioritário');

  if (code === 'STARTER') {
    features.push('Fluxo de aprovação disponível como add-on (R$ 100/mês)');
  } else if (planIncludesApprovalFlow(code)) {
    features.push('Fluxo de aprovação incluso');
  }

  return features;
}

/**
 * Converte um registro de `subscription_plans` em `LandingPlanCard`, pronto
 * para ser consumido pelo componente de pricing.
 */
export function mapDbPlanToCard(plan: DbPlanInput): LandingPlanCard {
  const code = (plan.plan_code || plan.name || '').toUpperCase();
  const isContact = Boolean(plan.is_enterprise_contact);
  const price = isContact ? 'A Consultar' : formatPriceBRL(plan.amount);

  return {
    id: plan.id,
    planCode: code,
    isContactOnly: isContact,
    name: code,
    price,
    period: isContact ? '' : '/mês',
    description: PLAN_DESCRIPTION[code] || plan.name || '',
    features: buildFeaturesList(plan),
    popular: code === 'PRO',
    gradient: planGradient(code),
  };
}

/**
 * Filtra + mapeia + ordena a lista crua de planos do banco em cards prontos
 * para a landing/plans. Remove planos inativos e LEGACY.
 */
export function mapAndSortPlansFromDb(plans: DbPlanInput[]): LandingPlanCard[] {
  return plans
    .filter((p) => p.active !== false && p.plan_code && p.plan_code !== 'LEGACY')
    .map(mapDbPlanToCard)
    .sort(
      (a, b) =>
        (PLAN_ORDER[a.planCode || a.name] || 99) -
        (PLAN_ORDER[b.planCode || b.name] || 99),
    );
}
