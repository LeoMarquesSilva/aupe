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

export class StripeService {
  /**
   * Criar sessão de checkout para subscription
   */
  async createCheckoutSession(
    priceId: string,
    organizationId: string,
    userId: string
  ): Promise<CheckoutSession> {
    try {
      // Obter origem atual para redirect URLs
      const origin = window.location.origin;

      // Chamar Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          organizationId,
          userId,
        },
      });

      if (error) {
        console.error('❌ Erro ao chamar Edge Function:', error);
        throw new Error(error.message || 'Erro ao criar sessão de checkout');
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
   * Criar checkout e redirecionar (método completo)
   */
  async startCheckout(priceId: string, organizationId: string, userId: string): Promise<void> {
    try {
      const session = await this.createCheckoutSession(priceId, organizationId, userId);
      
      if (session.url) {
        // Se temos URL direta, redirecionar
        window.location.href = session.url;
      } else {
        // Caso contrário, usar redirectToCheckout
        await this.redirectToCheckout(session.sessionId);
      }
    } catch (error: any) {
      console.error('❌ Erro ao iniciar checkout:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
