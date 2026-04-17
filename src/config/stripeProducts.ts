// Stripe Products & Prices — Nova conta (acct_1TLrgi5QaHLfiCdU)
// INSYT - Instagram Scheduler
// Fonte única de verdade para IDs de produtos/preços no frontend.
// Espelha o conteúdo das tabelas `subscription_plans` e `subscription_addons` no banco.

export type PlanCode = 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export interface StripePlan {
  code: PlanCode;
  name: string;
  productId: string;
  priceId: string;
  amount: number;
  tierOrder: number;
  contactOnly?: boolean;
  description: string;
}

export const STRIPE_PLANS: Record<PlanCode, StripePlan> = {
  STARTER: {
    code: 'STARTER',
    name: 'STARTER',
    productId: 'prod_ULd8iH7ZLuDJQ3',
    priceId: 'price_1TMy0m5QaHLfiCdUsSYZrfth',
    amount: 3000,
    tierOrder: 1,
    description: 'Para começar a profissionalizar sua operação',
  },
  BASIC: {
    code: 'BASIC',
    name: 'BASIC',
    productId: 'prod_ULd88KNInwxKfE',
    priceId: 'price_1TMwP35QaHLfiCdUu8cEsivL',
    amount: 17800,
    tierOrder: 2,
    description: 'Para quem está escalando a operação',
  },
  PRO: {
    code: 'PRO',
    name: 'PRO',
    productId: 'prod_ULd8ekUEF8PmpF',
    priceId: 'price_1TMwTP5QaHLfiCdUsF0ljCLc',
    amount: 35600,
    tierOrder: 3,
    description: 'Para times e agências consolidadas',
  },
  BUSINESS: {
    code: 'BUSINESS',
    name: 'BUSINESS',
    productId: 'prod_ULd8bONWLYI7no',
    priceId: 'price_1TNDlQ5QaHLfiCdUiko4gu6Y',
    amount: 49700,
    tierOrder: 4,
    description: 'Operação avançada multi-conta',
  },
  ENTERPRISE: {
    code: 'ENTERPRISE',
    name: 'ENTERPRISE',
    productId: 'prod_ULd9KfqG5FAbMk',
    priceId: 'price_1TMvst5QaHLfiCdU3Xuifyx4',
    amount: 100,
    tierOrder: 5,
    contactOnly: true,
    description: 'Preço sob consulta — fale com nossa equipe',
  },
};

export type AddonCode =
  | 'CONTA_ADICIONAL_STARTER'
  | 'CONTA_ADICIONAL_BASIC'
  | 'CONTA_ADICIONAL_PRO'
  | 'CONTA_ADICIONAL_BUSINESS'
  | 'CONTA_ADICIONAL_ENTERPRISE'
  | 'FLUXO_APROVACAO';

export type AddonType = 'extra_account' | 'feature';

export interface StripeAddon {
  code: AddonCode;
  name: string;
  type: AddonType;
  scopePlanCode: PlanCode | null;
  productId: string;
  priceId: string;
  amount: number;
  featureFlag?: string;
}

export const STRIPE_ADDONS: Record<AddonCode, StripeAddon> = {
  CONTA_ADICIONAL_STARTER: {
    code: 'CONTA_ADICIONAL_STARTER',
    name: 'Conta Adicional - STARTER',
    type: 'extra_account',
    scopePlanCode: 'STARTER',
    productId: 'prod_ULdoBwipaLyiFt',
    priceId: 'price_1TMwWx5QaHLfiCdUUGYiRPw1',
    amount: 3000,
  },
  CONTA_ADICIONAL_BASIC: {
    code: 'CONTA_ADICIONAL_BASIC',
    name: 'Conta Adicional - BASIC',
    type: 'extra_account',
    scopePlanCode: 'BASIC',
    productId: 'prod_ULdpmbqNL6yx9h',
    priceId: 'price_1TMwXg5QaHLfiCdUvPEoyQXM',
    amount: 2000,
  },
  CONTA_ADICIONAL_PRO: {
    code: 'CONTA_ADICIONAL_PRO',
    name: 'Conta Adicional - PRO',
    type: 'extra_account',
    scopePlanCode: 'PRO',
    productId: 'prod_ULdpkTzOe7EqHU',
    priceId: 'price_1TMwYG5QaHLfiCdUsQI0R6tT',
    amount: 1800,
  },
  CONTA_ADICIONAL_BUSINESS: {
    code: 'CONTA_ADICIONAL_BUSINESS',
    name: 'Conta Adicional - BUSINESS',
    type: 'extra_account',
    scopePlanCode: 'BUSINESS',
    productId: 'prod_ULdq3aLaOCzc5L',
    priceId: 'price_1TMwYq5QaHLfiCdUcJZjyTbl',
    amount: 1500,
  },
  CONTA_ADICIONAL_ENTERPRISE: {
    code: 'CONTA_ADICIONAL_ENTERPRISE',
    name: 'Conta Adicional - ENTERPRISE',
    type: 'extra_account',
    scopePlanCode: 'ENTERPRISE',
    productId: 'prod_ULdrgb4seetoi4',
    priceId: 'price_1TMwZf5QaHLfiCdUXYjtTuND',
    amount: 1200,
  },
  FLUXO_APROVACAO: {
    code: 'FLUXO_APROVACAO',
    name: 'Fluxo de Aprovação',
    type: 'feature',
    // Fluxo de Aprovação: opcional (R$ 100/mês) para STARTER. Em BASIC+ já está
    // incluso no preço do plano, portanto o add-on não é ofertado para esses
    // planos (ver migration 20260418_fluxo_aprovacao_paid_plans_included.sql).
    scopePlanCode: 'STARTER',
    productId: 'prod_ULdtirMgzf74J7',
    priceId: 'price_1TMy0q5QaHLfiCdUlK9VbQje',
    amount: 10000,
    featureFlag: 'fluxo_aprovacao',
  },
};

/** URL de contato exibida quando o usuário clica em ENTERPRISE ("A Consultar"). */
export const ENTERPRISE_CONTACT_URL = 'https://wa.link/54cek0';

/** Retorna o add-on de "Conta Adicional" correspondente ao plano. */
export function getExtraAccountAddon(planCode: PlanCode): StripeAddon {
  const map: Record<PlanCode, AddonCode> = {
    STARTER: 'CONTA_ADICIONAL_STARTER',
    BASIC: 'CONTA_ADICIONAL_BASIC',
    PRO: 'CONTA_ADICIONAL_PRO',
    BUSINESS: 'CONTA_ADICIONAL_BUSINESS',
    ENTERPRISE: 'CONTA_ADICIONAL_ENTERPRISE',
  };
  return STRIPE_ADDONS[map[planCode]];
}

/** Formata amount em centavos para "R$ 30,00". */
export function formatBRL(amountCents: number): string {
  return `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
}
