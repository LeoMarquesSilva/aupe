// Edge Function: Gerenciar Add-ons de uma Subscription existente
// INSYT - Instagram Scheduler
// Permite adicionar, atualizar quantidade e remover line items em uma subscription
// existente no Stripe, mantendo tudo em 1 fatura unificada.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface AddonOperation {
  priceId: string;
  quantity?: number;
}

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
    return json({ error: 'Método não permitido' }, 405, cors);
  }

  const rl = rateLimitByKey(`stripe-manage-addons:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: 'Muitas requisições. Tente mais tarde.' }, 429, {
      ...cors,
      'Retry-After': String(rl.retryAfterSec),
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401, cors);
    }

    // Cliente com o JWT do usuário para validar ownership
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Sessão inválida' }, 401, cors);
    }
    const userId = userData.user.id;

    // Admin client (service role) para gravar no DB
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'JSON inválido' }, 400, cors);

    const {
      subscriptionId,
      add,
      update,
      remove,
    } = body as {
      subscriptionId?: string;
      add?: AddonOperation[];
      update?: AddonOperation[];
      remove?: string[]; // priceIds a remover
    };

    if (!subscriptionId) {
      return json({ error: 'subscriptionId obrigatório' }, 400, cors);
    }

    // Buscar subscription no banco e validar ownership via organization do profile
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, stripe_subscription_id, status')
      .eq('id', subscriptionId)
      .single();

    if (subErr || !sub) {
      return json({ error: 'Subscription não encontrada' }, 404, cors);
    }
    if (!sub.stripe_subscription_id) {
      return json({ error: 'Subscription não vinculada ao Stripe (legado)' }, 400, cors);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', userId)
      .single();

    if (!profile || profile.organization_id !== sub.organization_id) {
      return json({ error: 'Sem permissão nesta subscription' }, 403, cors);
    }

    // Buscar sub atual no Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    // Validar add-ons: só podemos operar sobre price IDs cadastrados em subscription_addons
    const { data: addonCatalog, error: addonErr } = await supabaseAdmin
      .from('subscription_addons')
      .select('id, code, stripe_price_id, scope_plan_code, active');
    if (addonErr || !addonCatalog) {
      return json({ error: 'Erro ao buscar catálogo de add-ons' }, 500, cors);
    }
    const validAddonPrices = new Set(addonCatalog.filter((a) => a.active).map((a) => a.stripe_price_id));

    // Montar items que serão enviados ao Stripe
    const updates: Stripe.SubscriptionUpdateParams.Item[] = [];

    if (Array.isArray(add)) {
      for (const a of add) {
        if (!validAddonPrices.has(a.priceId)) {
          return json({ error: `Price ${a.priceId} não é um add-on válido` }, 400, cors);
        }
        // Se já existe na sub, atualiza quantidade; senão, adiciona
        const existing = stripeSub.items.data.find((it) => it.price.id === a.priceId);
        if (existing) {
          updates.push({ id: existing.id, quantity: (existing.quantity || 1) + (a.quantity || 1) });
        } else {
          updates.push({ price: a.priceId, quantity: a.quantity || 1 });
        }
      }
    }

    if (Array.isArray(update)) {
      for (const u of update) {
        if (!validAddonPrices.has(u.priceId)) {
          return json({ error: `Price ${u.priceId} não é um add-on válido` }, 400, cors);
        }
        const existing = stripeSub.items.data.find((it) => it.price.id === u.priceId);
        if (!existing) {
          return json({ error: `Add-on ${u.priceId} não está ativo nesta sub` }, 400, cors);
        }
        const qty = Number(u.quantity ?? 0);
        if (qty <= 0) {
          updates.push({ id: existing.id, deleted: true });
        } else {
          updates.push({ id: existing.id, quantity: qty });
        }
      }
    }

    if (Array.isArray(remove)) {
      for (const priceId of remove) {
        if (!validAddonPrices.has(priceId)) {
          return json({ error: `Price ${priceId} não é um add-on válido` }, 400, cors);
        }
        const existing = stripeSub.items.data.find((it) => it.price.id === priceId);
        if (existing) {
          updates.push({ id: existing.id, deleted: true });
        }
      }
    }

    if (updates.length === 0) {
      return json({ error: 'Nenhuma operação válida' }, 400, cors);
    }

    const updatedSub = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: updates,
      proration_behavior: 'create_prorations',
    });

    // A sincronização detalhada será feita pelo webhook (customer.subscription.updated).
    // Retornamos ok + resumo.
    return json(
      {
        ok: true,
        stripeSubscriptionId: updatedSub.id,
        status: updatedSub.status,
        items: updatedSub.items.data.map((it) => ({
          id: it.id,
          priceId: it.price.id,
          quantity: it.quantity,
        })),
      },
      200,
      cors,
    );
  } catch (error: unknown) {
    console.error('❌ Erro em stripe-manage-addons:', error instanceof Error ? error.message : error);
    return json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      500,
      { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    );
  }
});

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
