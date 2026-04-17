// Stripe Service - Integração com Stripe Checkout
// INSYT - Instagram Scheduler

import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabaseClient';

// Carregar Stripe apenas se a chave estiver configurada
const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

export const getStripe = () => stripePromise;

export interface CheckoutSession {
  sessionId: string;
  url: string | null;
}

export interface CheckoutLineItem {
  priceId: string;
  quantity?: number;
}

export class StripeService {
  /**
   * Criar sessão de checkout para subscription.
   * Aceita `priceIdOrItems` como string (legado, 1 linha) ou array de items.
   */
  async createCheckoutSession(
    priceIdOrItems: string | CheckoutLineItem[],
    organizationId: string,
    userId: string
  ): Promise<CheckoutSession> {
    try {
      const body: Record<string, unknown> = { organizationId, userId };
      if (Array.isArray(priceIdOrItems)) {
        body.items = priceIdOrItems;
      } else {
        body.priceId = priceIdOrItems;
      }

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body,
      });

      if (error) {
        // Tentar extrair o body de erro da edge function (mensagem real do Stripe)
        let serverMsg: string | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const payload = await ctx.json();
            serverMsg = payload?.details || payload?.message || payload?.error;
            console.error('❌ Edge Function payload:', payload);
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            console.error('❌ Edge Function text:', txt);
            serverMsg = txt;
          }
        } catch (e) {
          console.error('❌ Falha ao ler body do erro:', e);
        }
        console.error('❌ Erro ao chamar Edge Function:', error);
        throw new Error(serverMsg || error.message || 'Erro ao criar sessão de checkout');
      }

      if (!data || !data.sessionId) {
        throw new Error('Resposta inválida do servidor');
      }

      return {
        sessionId: data.sessionId,
        url: data.url,
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar checkout session:', error);
      throw error;
    }
  }

  /**
   * Redirecionar para checkout Stripe usando sessionId
   * Nota: Preferir usar URL direta quando disponível (mais confiável)
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    try {
      if (!stripePromise) {
        throw new Error('Stripe não inicializado. Verifique REACT_APP_STRIPE_PUBLISHABLE_KEY');
      }
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe não inicializado. Verifique REACT_APP_STRIPE_PUBLISHABLE_KEY');

      // O objeto retornado por loadStripe tem o método redirectToCheckout
      // Usar type assertion para evitar erro de tipo
      const result = await (stripe as any).redirectToCheckout({ sessionId });
      
      if (result?.error) {
        console.error('❌ Erro ao redirecionar para checkout:', result.error);
        throw result.error;
      }
    } catch (error: any) {
      console.error('❌ Erro ao redirecionar para checkout:', error);
      throw error;
    }
  }

  /**
   * Criar checkout e redirecionar (método completo).
   * Aceita price único (legado) ou array de line items.
   */
  async startCheckout(
    priceIdOrItems: string | CheckoutLineItem[],
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      const session = await this.createCheckoutSession(priceIdOrItems, organizationId, userId);

      if (session.url) {
        window.location.href = session.url;
      } else {
        await this.redirectToCheckout(session.sessionId);
      }
    } catch (error: any) {
      console.error('❌ Erro ao iniciar checkout:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
