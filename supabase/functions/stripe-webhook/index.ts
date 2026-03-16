// Edge Function: Processar Webhooks do Stripe
// INSYT - Instagram Scheduler
// Processa eventos do Stripe (subscription criada, atualizada, pagamento, etc.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Supabase URL e Service Role Key são automaticamente disponibilizados pelo Supabase
// Se não estiverem disponíveis, usar variáveis de ambiente customizadas
const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    // Usar constructEventAsync ao invés de constructEvent (requerido no Deno)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log(`📥 Evento recebido: ${event.type}`);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`⚠️ Evento não tratado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

// Handler: Checkout completado
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const organizationId = session.metadata?.organization_id || session.client_reference_id;
    
    if (!organizationId) {
      console.error('❌ organization_id não encontrado na sessão');
      return;
    }

    console.log(`✅ Checkout completado para organização: ${organizationId}`);

    // Buscar subscription do Stripe usando subscription ID da sessão
    if (session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscriptionToDatabase(organizationId, stripeSubscription);
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar checkout completado:', error);
    throw error;
  }
}

// Handler: Subscription criada
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    // Tentar buscar organization_id do customer metadata primeiro
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;

    let organizationId: string | null = null;

    try {
      const customer = await stripe.customers.retrieve(customerId);
      organizationId = (customer as Stripe.Customer).metadata?.organization_id || null;
    } catch (err) {
      // Se não conseguir buscar customer, continuar sem erro
      console.log('⚠️ Não foi possível buscar customer metadata');
    }

    // Se não encontrou no customer, tentar buscar no banco pelo stripe_subscription_id
    if (!organizationId) {
      await syncSubscriptionToDatabase(null, subscription);
      console.log(`✅ Subscription criada (sem organization_id no customer metadata)`);
    } else {
      await syncSubscriptionToDatabase(organizationId, subscription);
      console.log(`✅ Subscription criada para organização: ${organizationId}`);
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar subscription criada:', error);
    throw error;
  }
}

// Handler: Subscription atualizada
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await syncSubscriptionToDatabase(null, subscription);
    console.log(`✅ Subscription atualizada: ${subscription.id}`);
  } catch (error: any) {
    console.error('❌ Erro ao processar subscription atualizada:', error);
    throw error;
  }
}

// Handler: Subscription deletada/cancelada
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, organization_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (existingSub) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);

      console.log(`✅ Subscription cancelada: ${subscription.id}`);
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar subscription deletada:', error);
    throw error;
  }
}

// Handler: Pagamento bem-sucedido
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription?.id;

    if (!subscriptionId) return;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      // Evita duplicidade quando o Stripe reenviar o mesmo evento
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_invoice_id', invoice.id)
        .maybeSingle();

      if (existingPayment) {
        console.log(`ℹ️ Pagamento já registrado (ignorado): ${invoice.id}`);
        return;
      }

      // Criar registro de pagamento
      await supabase.from('payments').insert({
        subscription_id: subscription.id,
        stripe_payment_intent_id: typeof invoice.payment_intent === 'string' 
          ? invoice.payment_intent 
          : invoice.payment_intent?.id || null,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        paid_at: new Date(invoice.created * 1000).toISOString(),
      });

      console.log(`✅ Pagamento registrado: ${invoice.id}`);
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento bem-sucedido:', error);
    throw error;
  }
}

// Handler: Pagamento falhou
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription?.id;

    if (subscriptionId) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`⚠️ Pagamento falhou: ${invoice.id}`);
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento falhado:', error);
    throw error;
  }
}

// Função auxiliar: Sincronizar subscription do Stripe para o banco
async function syncSubscriptionToDatabase(
  organizationId: string | null,
  stripeSubscription: Stripe.Subscription
) {
  try {
    // Se não temos organization_id, buscar pelo stripe_subscription_id
    if (!organizationId) {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('organization_id')
        .eq('stripe_subscription_id', stripeSubscription.id)
        .single();

      if (existing) {
        organizationId = existing.organization_id;
      } else {
        console.error('❌ organization_id não encontrado');
        return;
      }
    }

    // Buscar plan_id pelo price_id do Stripe
    const priceId = typeof stripeSubscription.items.data[0]?.price.id === 'string'
      ? stripeSubscription.items.data[0].price.id
      : stripeSubscription.items.data[0]?.price.id || null;

    if (!priceId) {
      console.error('❌ price_id não encontrado na subscription');
      return;
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', priceId)
      .single();

    if (!plan) {
      console.error(`❌ Plano não encontrado para price_id: ${priceId}`);
      return;
    }

    // Verificar se subscription já existe
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscription.id)
      .single();

    const subscriptionData = {
      organization_id: organizationId,
      plan_id: plan.id,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
      status: stripeSubscription.status === 'active' ? 'active' : 
              stripeSubscription.status === 'canceled' ? 'canceled' :
              stripeSubscription.status === 'past_due' ? 'past_due' :
              stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      canceled_at: stripeSubscription.canceled_at 
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString() 
        : null,
      trial_start: stripeSubscription.trial_start
        ? new Date(stripeSubscription.trial_start * 1000).toISOString()
        : null,
      trial_end: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    if (existingSub) {
      // Atualizar subscription existente
      await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSub.id);
    } else {
      // Criar nova subscription
      await supabase.from('subscriptions').insert(subscriptionData);
    }

    console.log(`✅ Subscription sincronizada: ${stripeSubscription.id}`);
  } catch (error: any) {
    console.error('❌ Erro ao sincronizar subscription:', error);
    throw error;
  }
}
