// Edge Function: Criar Checkout Session no Stripe
// INSYT - Instagram Scheduler
// Função para criar sessão de checkout do Stripe

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders: 'authorization, x-client-info, apikey, content-type',
    allowMethods: 'POST, OPTIONS',
  });
  if (co instanceof Response) return co;
  const cors = co;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const rl = rateLimitByKey(`stripe-checkout:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Muitas requisições. Tente mais tarde.' }), {
      status: 429,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfterSec),
      },
    });
  }

  try {
    const bodyText = await req.text();
    if (Deno.env.get('EDGE_FUNCS_DEBUG') === 'true') {
      console.log('📥 Body length (debug):', bodyText.length);
    }

    // Parse JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'JSON inválido no body da requisição' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const { priceId, items, organizationId, userId } = body as {
      priceId?: string;
      items?: Array<{ priceId: string; quantity?: number }>;
      organizationId?: string;
      userId?: string;
    };

    if (!organizationId || !userId) {
      return new Response(
        JSON.stringify({ error: 'organizationId e userId são obrigatórios' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalizar entrada: aceita `items` (novo formato) ou `priceId` (legado)
    const normalized: Array<{ priceId: string; quantity: number }> = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        if (!it?.priceId) continue;
        const qty = Number(it.quantity ?? 1);
        normalized.push({ priceId: it.priceId, quantity: qty > 0 ? qty : 1 });
      }
    } else if (priceId) {
      normalized.push({ priceId, quantity: 1 });
    }

    if (normalized.length === 0) {
      return new Response(
        JSON.stringify({ error: 'priceId ou items[] são obrigatórios' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const line_items = normalized.map((it) => ({ price: it.priceId, quantity: it.quantity }));

    const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      client_reference_id: organizationId,
      metadata: {
        organization_id: organizationId,
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
      customer_email: undefined,
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const errAny = error as { type?: string; code?: string; statusCode?: number; raw?: { message?: string } };
    console.error('❌ Erro ao criar checkout session:', {
      message: msg,
      type: errAny?.type,
      code: errAny?.code,
      statusCode: errAny?.statusCode,
      raw: errAny?.raw?.message,
    });

    return new Response(
      JSON.stringify({
        error: 'Não foi possível criar a sessão de checkout.',
        message: msg,
        type: errAny?.type,
        code: errAny?.code,
        details: errAny?.raw?.message,
      }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }
});
