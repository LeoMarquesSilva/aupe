// Edge Function: Criar Checkout Session no Stripe
// INSYT - Instagram Scheduler
// Função para criar sessão de checkout do Stripe

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ler body como texto primeiro para debug
    const bodyText = await req.text();
    console.log('📥 Body recebido:', bodyText);
    
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { priceId, organizationId, userId } = body;

    if (!priceId || !organizationId || !userId) {
      return new Response(
        JSON.stringify({ error: 'priceId, organizationId e userId são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obter origem da requisição para URLs de redirect
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:3000';

    // Criar sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      client_reference_id: organizationId,
      metadata: {
        organization_id: organizationId,
        user_id: userId,
      },
      customer_email: undefined, // Será preenchido pelo Stripe se o usuário estiver logado
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id, 
        url: session.url 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ Erro ao criar checkout session:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao criar sessão de checkout' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
